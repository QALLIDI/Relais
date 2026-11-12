import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateCourte, initiales, mad } from '../../api/format';
import type { Candidature, Etape, Mission, Suggestion } from '../../api/types';
import { Annuler, Fenetre } from '../../components/Fenetre';
import { useFilAriane } from '../../components/Layouts';
import { Chargement, Erreur, Icone, Score, TetePage, Vide } from '../../components/ui';

interface Test { id: string; intitule: string; dureeMinutes?: number; lien?: string; message?: string; dateLimite?: string; statut: 'ENVOYE' | 'CORRIGE'; score?: number; commentaire?: string; envoyeLe: string; corrigeLe?: string }
interface Reference { id: string; nom: string; email?: string; telephone?: string; fonction?: string; lien: 'MANAGER' | 'COLLEGUE' | 'CLIENT'; statut: 'DEMANDEE' | 'RECUE'; avis?: string; recommande?: boolean; demandeeLe: string; relanceeLe?: string; recueLe?: string }
interface QualificationData { tests: Test[]; references: Reference[] }

const LIENS = { MANAGER: 'Manager', COLLEGUE: 'Collègue', CLIENT: 'Client' } as const;
const CATALOGUE = [
  { intitule: 'Java & Spring', duree: 60 },
  { intitule: 'Algorithmique', duree: 45 },
  { intitule: 'Anglais professionnel', duree: 20 },
];
const SHORTLISTABLES: Etape[] = ['QUALIFIE', 'ENTRETIEN_RECRUTEUR'];

/** Préqualification d'une candidature : critères, test technique et références (maquette « Préqualification »). */
export default function Qualification() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [fenetre, setFenetre] = useState<{ type: 'test' } | { type: 'correction'; test: Test } | { type: 'reference' } | { type: 'retour'; ref: Reference } | null>(null);
  const [message, setMessage] = useState('');
  const candidature = useQuery({ queryKey: ['candidature', id], queryFn: async () => (await api.get<Candidature>(`/api/candidatures/${id}`)).data });
  const qualif = useQuery({ queryKey: ['qualification', id], queryFn: async () => (await api.get<QualificationData>(`/api/candidatures/${id}/qualification`)).data });
  const c = candidature.data;
  const mission = useQuery({ queryKey: ['mission', c?.missionId], queryFn: async () => (await api.get<Mission>(`/api/missions/${c!.missionId}`)).data, enabled: !!c });
  const suggestions = useQuery({ queryKey: ['suggestions', c?.missionId], queryFn: async () => (await api.get<Suggestion[]>(`/api/pipeline/${c!.missionId}/suggestions`)).data, enabled: !!c });
  useFilAriane(c ? [{ label: 'Pipeline', to: `/recruteur/missions/${c.missionId}` }, { label: c.candidatNom, to: `/recruteur/vivier/${c.candidatId}` }, { label: 'Préqualification' }] : null);

  const rafraichir = () => {
    void qc.invalidateQueries({ queryKey: ['qualification', id] });
    void qc.invalidateQueries({ queryKey: ['candidature', id] });
    void qc.invalidateQueries({ queryKey: ['pipeline'] });
  };
  const fait = (texte: string) => { setFenetre(null); setMessage(texte); rafraichir(); };
  const relancer = useMutation({ mutationFn: (r: Reference) => api.post(`/api/candidatures/${id}/references/${r.id}/relance`), onSuccess: (_, r) => fait(`Relance envoyée à ${r.nom}.`) });
  const shortlist = useMutation({ mutationFn: () => api.post('/api/shortlists', { missionId: c!.missionId, candidatureIds: [id] }), onSuccess: () => fait('Profil envoyé au client dans la shortlist.') });
  const ajouter = useMutation({
    mutationFn: (candidatId: string) => api.post('/api/candidatures', { missionId: c!.missionId, candidatId }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['suggestions', c?.missionId] }); setMessage('Profil ajouté au pipeline.'); },
  });

  if (candidature.isLoading) return <Chargement />;
  if (!c) return <Erreur message={messageErreur(candidature.error)} />;
  const m = mission.data;
  const tests = qualif.data?.tests ?? [];
  const refs = qualif.data?.references ?? [];
  const dernierCorrige = tests.find((t) => t.statut === 'CORRIGE');
  const erreur = relancer.error ?? shortlist.error ?? ajouter.error;

  // Critères vérifiés à partir du profil et de la fiche de poste.
  const criteres = m ? [
    { titre: 'Prétentions', valeur: c.candidatPretention != null ? mad(c.candidatPretention) : 'Non renseignées',
      aide: m.salaireMax ? `budget client ${mad(m.salaireMax)}` : 'budget non précisé', ok: c.candidatPretention == null || !m.salaireMax ? undefined : c.candidatPretention <= m.salaireMax },
    { titre: 'Ville', valeur: c.candidatVille ?? 'Non renseignée', aide: `poste à ${m.ville ?? '—'}${m.teletravail ? `, ${m.teletravail.toLowerCase()}` : ''}`,
      ok: !c.candidatVille || !m.ville ? undefined : c.candidatVille.toLowerCase() === m.ville.toLowerCase() },
    { titre: 'Expérience', valeur: `${c.candidatExperience} ans`, aide: m.experienceMin != null ? `${m.experienceMin} ans demandés` : 'pas de minimum',
      ok: m.experienceMin == null ? undefined : c.candidatExperience >= m.experienceMin },
    { titre: 'Disponibilité', valeur: c.candidatDisponibilite ?? 'Non renseignée', aide: m.dateLimite ? `démarrage souhaité vers le ${dateCourte(m.dateLimite)}` : '', ok: undefined },
    { titre: 'Compétences indispensables', valeur: `${m.competencesRequises.filter((x) => c.competences.some((y) => y.toLowerCase() === x.toLowerCase())).length} / ${m.competencesRequises.length}`,
      aide: m.competencesRequises.join(', '), ok: m.competencesRequises.every((x) => c.competences.some((y) => y.toLowerCase() === x.toLowerCase())) },
  ] : [];
  const valides = criteres.filter((x) => x.ok).length;

  return (
    <>
      <TetePage titre={c.candidatNom} sous={`Candidature · ${c.missionIntitule} · ${c.entrepriseNom}`}>
        <span className="etat-carte">Correspondance <b>{c.score} %</b></span>
        <button type="button" className="btn" onClick={() => setFenetre({ type: 'test' })}>Envoyer un test</button>
        {SHORTLISTABLES.includes(c.etape) && <button type="button" className="btn primary" disabled={shortlist.isPending} onClick={() => shortlist.mutate()}>Envoyer en shortlist</button>}
      </TetePage>
      {message && <div className="alert info" role="status">{message}</div>}
      {erreur && <Erreur message={messageErreur(erreur)} />}

      <div className="qualif">
        <section className="bloc" aria-labelledby="criteres">
          <div className="bloc-tete"><h2 id="criteres">Critères de la mission</h2>{criteres.length > 0 && <span className={`oui-non ${valides === criteres.length ? 'oui' : ''}`}>{valides} / {criteres.length}</span>}</div>
          <div className="bloc-corps">
            {!m && <Chargement />}
            {criteres.map((x) => (
              <div key={x.titre} className="critere">
                <span><span className="muted small">{x.titre}</span><b>{x.valeur}</b>{x.aide && <span className="muted small">{x.aide}</span>}</span>
                <span className={`rond-etat ${x.ok === true ? 'ok' : x.ok === false ? 'ko' : ''}`} aria-label={x.ok === true ? 'conforme' : x.ok === false ? 'à vérifier' : 'non évalué'}>
                  {x.ok === true ? '✓' : x.ok === false ? '!' : '–'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="colonne-gauche">
          <section className="bloc" aria-labelledby="test">
            <div className="bloc-tete">
              <h2 id="test">Test technique</h2>
              {dernierCorrige && <span className="etat-carte">{dernierCorrige.intitule}{dernierCorrige.dureeMinutes ? ` · ${dernierCorrige.dureeMinutes} min` : ''}</span>}
            </div>
            <div className="bloc-corps">
              {dernierCorrige && (
                <div className="score-test">
                  <span><b>{dernierCorrige.score}</b> / 100</span>
                  <span className="muted small">corrigé le {dateCourte(dernierCorrige.corrigeLe)}</span>
                </div>
              )}
              {dernierCorrige && <div className="barre" style={{ margin: '6px 0 10px' }}><div style={{ width: `${dernierCorrige.score}%` }} /></div>}
              {qualif.data && tests.length === 0 && <Vide>Aucun test envoyé.</Vide>}
              {tests.map((t) => (
                <div key={t.id} className="ligne-test">
                  <span className="txt"><b>{t.intitule}</b><span>envoyé le {dateCourte(t.envoyeLe)}{t.dateLimite ? ` · à rendre avant le ${dateCourte(t.dateLimite)}` : ''}</span>
                    {t.commentaire && <span>{t.commentaire}</span>}</span>
                  {t.statut === 'CORRIGE' ? <span className="oui-non oui">{t.score} / 100</span>
                    : <button type="button" className="btn small" onClick={() => setFenetre({ type: 'correction', test: t })}>Saisir le score</button>}
                </div>
              ))}
              <button type="button" className="lien-fleche" style={{ marginTop: 10 }} onClick={() => setFenetre({ type: 'test' })}><Icone nom="plus" taille={14} />Envoyer un test</button>
            </div>
          </section>

          <section className="bloc references" aria-labelledby="refs">
            <div className="bloc-tete"><h2 id="refs">Références</h2>{refs.length > 0 && <span className="etat-carte">{refs.filter((r) => r.statut === 'RECUE').length} / {refs.length} reçue(s)</span>}</div>
            <div className="bloc-corps stack" style={{ gap: 8 }}>
              {qualif.data && refs.length === 0 && <Vide>Aucune référence demandée.</Vide>}
              {refs.map((r) => (
                <div key={r.id} className="carte-ref">
                  <div className="ligne-entre">
                    <b className="moyen">{r.nom}</b>
                    {r.statut === 'RECUE' ? <span className={`statut-texte ${r.recommande === false ? 'ton-bad' : 'ton-ok'}`}>{r.recommande === false ? 'Réservée' : 'Reçue'}</span>
                      : <span className="statut-texte ton-warn">En attente</span>}
                  </div>
                  <span className="muted small">{[LIENS[r.lien], r.fonction, r.statut === 'RECUE' ? `reçue le ${dateCourte(r.recueLe)}` : `demandée le ${dateCourte(r.demandeeLe)}${r.relanceeLe ? `, relancée le ${dateCourte(r.relanceeLe)}` : ''}`].filter(Boolean).join(' · ')}</span>
                  {r.avis && <p className="texte" style={{ marginTop: 6 }}>« {r.avis} »</p>}
                  {r.statut !== 'RECUE' && (
                    <div className="actions" style={{ marginTop: 8 }}>
                      <button type="button" className="btn small primary" onClick={() => setFenetre({ type: 'retour', ref: r })}>Saisir le retour</button>
                      {r.email && <button type="button" className="btn small" disabled={relancer.isPending} onClick={() => relancer.mutate(r)}>Relancer</button>}
                      {r.telephone && <a className="btn small" href={`tel:${r.telephone.replace(/\s/g, '')}`}>Appeler</a>}
                    </div>
                  )}
                </div>
              ))}
              <button type="button" className="btn ajout-ref" onClick={() => setFenetre({ type: 'reference' })}><Icone nom="plus" taille={14} />Demander une référence</button>
            </div>
          </section>
        </div>

        <section className="bloc" aria-labelledby="chauds">
          <div className="bloc-tete"><h2 id="chauds">Autres profils pour cette mission</h2>{suggestions.data && <span className="etat-carte">{suggestions.data.length}</span>}</div>
          <div className="bloc-corps">
            {suggestions.isLoading && <Chargement />}
            {suggestions.data?.length === 0 && <Vide>Tous les profils proches sont déjà dans le pipeline.</Vide>}
            {suggestions.data?.slice(0, 5).map((s) => (
              <div key={s.candidatId} className="membre">
                <span className="mono-av grand" aria-hidden="true">{initiales(s.nomComplet)}</span>
                <span className="txt"><Link to={`/recruteur/vivier/${s.candidatId}`} className="nom-lien">{s.nomComplet}</Link><span>{s.titre} · {s.anneesExperience} ans</span></span>
                <Score value={s.score} />
                <button type="button" className="btn small" disabled={ajouter.isPending} onClick={() => ajouter.mutate(s.candidatId)}>Ajouter</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {fenetre?.type === 'test' && <ModaleTest c={c} onFermer={() => setFenetre(null)} onFait={() => fait(`Test envoyé à ${c.candidatNom}.`)} />}
      {fenetre?.type === 'correction' && <ModaleCorrection candidatureId={id} test={fenetre.test} onFermer={() => setFenetre(null)} onFait={() => fait('Score enregistré.')} />}
      {fenetre?.type === 'reference' && <ModaleReference c={c} onFermer={() => setFenetre(null)} onFait={(r) => fait(r.email ? `Demande envoyée à ${r.nom}.` : `Référence de ${r.nom} ajoutée.`)} />}
      {fenetre?.type === 'retour' && <ModaleRetour candidatureId={id} r={fenetre.ref} onFermer={() => setFenetre(null)} onFait={() => fait('Retour de référence enregistré.')} />}
    </>
  );
}

function ModaleTest({ c, onFermer, onFait }: { c: Candidature; onFermer: () => void; onFait: () => void }) {
  const [choix, setChoix] = useState<string>(CATALOGUE[0].intitule);
  const [autre, setAutre] = useState('');
  const [duree, setDuree] = useState(String(CATALOGUE[0].duree));
  const [lien, setLien] = useState('');
  const dans3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const [limite, setLimite] = useState(dans3);
  const [message, setMessage] = useState(`Bonjour ${c.candidatNom.split(' ')[0]}, voici le test technique pour le poste de ${c.missionIntitule}. Bon courage !`);
  const intitule = choix === 'autre' ? autre.trim() : choix;
  const envoyer = useMutation({
    mutationFn: () => api.post(`/api/candidatures/${c.id}/tests`, { intitule, dureeMinutes: duree ? Number(duree) : undefined, lien: lien.trim() || undefined, dateLimite: limite || undefined, message }),
    onSuccess: onFait,
  });
  const lienOk = !lien.trim() || /^https?:\/\/\S+$/.test(lien.trim());
  return (
    <Fenetre titre={`Envoyer un test à ${c.candidatNom}`} sousTitre="Le candidat reçoit le lien par e-mail. Vous saisissez le score à la correction." largeur={540} onFermer={onFermer} modifie
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!intitule || !lienOk || envoyer.isPending} onClick={() => envoyer.mutate()}>Envoyer le test</button></>}>
      <div className="field">Test
        <div className="stack" style={{ gap: 6 }} role="radiogroup" aria-label="Test">
          {CATALOGUE.map((t) => (
            <button key={t.intitule} type="button" role="radio" aria-checked={choix === t.intitule} className="option-creneau" onClick={() => { setChoix(t.intitule); setDuree(String(t.duree)); }}>
              <b>{t.intitule}</b><span>{t.duree} min</span>
            </button>
          ))}
          <button type="button" role="radio" aria-checked={choix === 'autre'} className="option-creneau" onClick={() => setChoix('autre')}><b>Autre test</b><span>intitulé libre</span></button>
        </div>
      </div>
      {choix === 'autre' && (
        <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <label className="field">Intitulé<input value={autre} onChange={(e) => setAutre(e.target.value)} /></label>
          <label className="field">Durée (min)<input type="number" min={5} max={480} value={duree} onChange={(e) => setDuree(e.target.value)} /></label>
        </div>
      )}
      <label className="field">Lien du test (plateforme externe)<input type="url" value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" />
        {!lienOk && <span className="aide" style={{ color: 'var(--bad)' }}>Le lien doit commencer par https://</span>}</label>
      <label className="field">À rendre avant le<input type="date" value={limite} onChange={(e) => setLimite(e.target.value)} /></label>
      <label className="field">Message<textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
    </Fenetre>
  );
}

function ModaleCorrection({ candidatureId, test, onFermer, onFait }: { candidatureId: string; test: Test; onFermer: () => void; onFait: () => void }) {
  const [score, setScore] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const valeur = Number(score);
  const ok = score !== '' && valeur >= 0 && valeur <= 100;
  const enregistrer = useMutation({ mutationFn: () => api.put(`/api/candidatures/${candidatureId}/tests/${test.id}/correction`, { score: valeur, commentaire }), onSuccess: onFait });
  return (
    <Fenetre titre={`Résultat · ${test.intitule}`} largeur={440} onFermer={onFermer} modifie={!!score || !!commentaire}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!ok || enregistrer.isPending} onClick={() => enregistrer.mutate()}>Enregistrer</button></>}>
      <label className="field">Score sur 100<input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} autoFocus /></label>
      <label className="field">Commentaire (facultatif)<textarea rows={3} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex. : très bon sur Spring, SQL à consolider." /></label>
      {enregistrer.error && <Erreur message={messageErreur(enregistrer.error)} />}
    </Fenetre>
  );
}

function ModaleReference({ c, onFermer, onFait }: { c: Candidature; onFermer: () => void; onFait: (r: Reference) => void }) {
  const [f, setF] = useState({ nom: '', email: '', telephone: '', fonction: '', lien: 'MANAGER' as Reference['lien'], accord: false });
  const maj = (k: 'nom' | 'email' | 'telephone' | 'fonction') => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const envoyer = useMutation({
    mutationFn: async () => (await api.post<Reference>(`/api/candidatures/${c.id}/references`, {
      nom: f.nom, email: f.email.trim() || undefined, telephone: f.telephone.trim() || undefined, fonction: f.fonction.trim() || undefined, lien: f.lien, accordCandidat: f.accord,
    })).data,
    onSuccess: onFait,
  });
  const ok = f.nom.trim() && (f.email.trim() || f.telephone.trim()) && f.accord;
  return (
    <Fenetre titre="Demander une référence" sousTitre={`Pour ${c.candidatNom}. Le référent est prévenu par e-mail que vous allez le contacter.`} largeur={520} onFermer={onFermer}
      modifie={!!(f.nom || f.email || f.telephone || f.fonction)}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!ok || envoyer.isPending} onClick={() => envoyer.mutate()}>Envoyer la demande</button></>}>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">Nom du référent<input value={f.nom} onChange={maj('nom')} placeholder="Prénom Nom" /></label>
        <label className="field">E-mail<input type="email" value={f.email} onChange={maj('email')} placeholder="referent@entreprise.ma" /></label>
        <label className="field">Téléphone<input value={f.telephone} onChange={maj('telephone')} /></label>
        <label className="field">Fonction et entreprise<input value={f.fonction} onChange={maj('fonction')} placeholder="Ex. : lead tech · OCP Digital" /></label>
      </div>
      <div className="field">Lien avec le candidat
        <div className="choix" role="radiogroup" aria-label="Lien avec le candidat">
          {(Object.keys(LIENS) as Reference['lien'][]).map((k) => <button key={k} type="button" role="radio" aria-checked={f.lien === k} onClick={() => setF({ ...f, lien: k })}>{LIENS[k]}</button>)}
        </div>
      </div>
      <label className="check"><input type="checkbox" checked={f.accord} onChange={(e) => setF({ ...f, accord: e.target.checked })} />Le candidat a donné son accord pour ce contact</label>
      {!f.email.trim() && f.telephone.trim() && <div className="encadre">Sans e-mail, aucun message n'est envoyé : vous appelez directement le référent.</div>}
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
    </Fenetre>
  );
}

function ModaleRetour({ candidatureId, r, onFermer, onFait }: { candidatureId: string; r: Reference; onFermer: () => void; onFait: () => void }) {
  const [avis, setAvis] = useState('');
  const [recommande, setRecommande] = useState<boolean | null>(null);
  const enregistrer = useMutation({ mutationFn: () => api.put(`/api/candidatures/${candidatureId}/references/${r.id}/retour`, { avis, recommande }), onSuccess: onFait });
  return (
    <Fenetre titre={`Retour de ${r.nom}`} sousTitre={[LIENS[r.lien], r.fonction].filter(Boolean).join(' · ')} largeur={500} onFermer={onFermer} modifie={!!avis || recommande !== null}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!avis.trim() || recommande === null || enregistrer.isPending} onClick={() => enregistrer.mutate()}>Enregistrer</button></>}>
      <div className="field">Le référent recommande-t-il le candidat ?
        <div className="choix" role="radiogroup" aria-label="Recommandation">
          <button type="button" role="radio" aria-checked={recommande === true} onClick={() => setRecommande(true)}>Oui</button>
          <button type="button" role="radio" aria-checked={recommande === false} onClick={() => setRecommande(false)}>Avec réserves</button>
        </div>
      </div>
      <label className="field">Ce qu'il en dit<textarea rows={4} value={avis} onChange={(e) => setAvis(e.target.value)} placeholder="Ex. : autonome, fiable en production, a formé deux juniors." /></label>
      {enregistrer.error && <Erreur message={messageErreur(enregistrer.error)} />}
    </Fenetre>
  );
}
