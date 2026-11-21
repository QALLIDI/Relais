import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur } from '../../../api/client';
import { dateCourte, dateHeureFr } from '../../../api/format';
import { LIBELLE_SIGNAL, LIBELLE_STATUT, LIBELLE_TYPE, TON_STATUT, duree, useEvaluation, useEvaluationsDe, useModeles,
  type EvaluationDetail, type EvaluationResume, type LigneResultat } from '../../../api/evaluations';
import type { Candidature } from '../../../api/types';
import { Annuler, Fenetre } from '../../../components/Fenetre';
import { Chargement, Erreur, Icone, Pill, Vide } from '../../../components/ui';
import './evaluations.css';

/** Score sur 100, vert au-dessus du seuil du modèle. */
export function ScoreSeuil({ e }: { e: EvaluationResume }) {
  if (e.score == null) return <span className="muted">—</span>;
  const ok = e.mode === 'GRILLE' || e.score >= e.seuil;
  return <span className={`score-seuil ${ok ? 'ok' : 'ko'}`} title={e.mode === 'GRILLE' ? undefined : `Seuil : ${e.seuil} / 100`}>{e.score}<span className="muted small"> / 100</span></span>;
}

/** Pastille de synthèse des signaux d'intégrité. */
export function PastilleIntegrite({ e }: { e: EvaluationResume }) {
  const i = e.integrite;
  if (e.statut === 'ENVOYEE') return <span className="muted">—</span>;
  if (!i.alerte && i.aVerifier === 0) return <span className="statut-texte ton-ok">RAS</span>;
  const parties = [i.sorties ? `${i.sorties} sortie${i.sorties > 1 ? 's' : ''}` : '', i.collages ? `${i.collages} collage${i.collages > 1 ? 's' : ''}` : '',
    i.aVerifier ? `${i.aVerifier} à vérifier` : ''].filter(Boolean);
  return <span className={`statut-texte ${i.alerte ? 'ton-bad' : 'ton-warn'}`}>{parties.join(' · ')}</span>;
}

/** Bloc « Évaluations » de la préqualification : liste, envoi et ouverture des résultats. */
export function BlocEvaluations({ c, onMessage, envoi, setEnvoi }: { c: Candidature; onMessage: (t: string) => void; envoi: boolean; setEnvoi: (v: boolean) => void }) {
  const liste = useEvaluationsDe(c.id);
  const [ouverte, setOuverte] = useState<string | null>(null);
  return (
    <section className="bloc" aria-labelledby="evals">
      <div className="bloc-tete"><h2 id="evals">Évaluations techniques</h2>
        {liste.data && liste.data.length > 0 && <span className="etat-carte">{liste.data.length}</span>}</div>
      <div className="bloc-corps">
        {liste.isLoading && <Chargement />}
        {liste.data?.length === 0 && <Vide>Aucune évaluation. Envoyez un test en ligne ou ouvrez une grille pendant l'entretien.</Vide>}
        {liste.data?.map((e) => (
          <button key={e.id} type="button" className="ligne-test eval-ligne" onClick={() => setOuverte(e.id)}>
            <span className="txt"><b>{e.intitule}</b>
              <span>{e.mode === 'GRILLE' ? "Grille d'entretien" : `envoyé le ${dateCourte(e.envoyeeLe)}${e.dateLimite && e.statut === 'ENVOYEE' ? ` · avant le ${dateCourte(e.dateLimite)}` : ''}`}</span>
              {e.mode === 'TEST' && e.statut !== 'ENVOYEE' && <PastilleIntegrite e={e} />}</span>
            {e.score != null ? <ScoreSeuil e={e} /> : <Pill tone={TON_STATUT[e.statut]}>{LIBELLE_STATUT[e.statut]}</Pill>}
          </button>
        ))}
        <button type="button" className="lien-fleche" style={{ marginTop: 10 }} onClick={() => setEnvoi(true)}><Icone nom="plus" taille={14} />Envoyer un test ou ouvrir une grille</button>
      </div>
      {envoi && <ModaleEnvoi c={c} onFermer={() => setEnvoi(false)}
        onFait={(e) => { setEnvoi(false); if (e.mode === 'GRILLE') setOuverte(e.id); else onMessage(`Test « ${e.intitule} » envoyé à ${c.candidatNom}. Il reçoit le lien par e-mail.`); }} />}
      {ouverte && <FenetreResultat id={ouverte} onFermer={() => setOuverte(null)} />}
    </section>
  );
}

/** Choix d'un modèle : test envoyé par e-mail, ou grille ouverte tout de suite. */
export function ModaleEnvoi({ c, onFermer, onFait }: { c: Candidature; onFermer: () => void; onFait: (e: EvaluationResume) => void }) {
  const qc = useQueryClient();
  const modeles = useModeles();
  const [modeleId, setModeleId] = useState<string | null>(null);
  const m = modeles.data?.find((x) => x.id === modeleId);
  const [limite, setLimite] = useState('');
  const [message, setMessage] = useState(`Bonjour ${c.candidatNom.split(' ')[0]}, voici le test technique pour le poste de ${c.missionIntitule}. Prenez-le au calme : une fois commencé, le chronomètre ne s'arrête plus. Bon courage !`);
  const envoyer = useMutation({
    mutationFn: async () => (await api.post<EvaluationResume>(`/api/candidatures/${c.id}/evaluations`, { modeleId, dateLimite: limite || undefined, message: m?.mode === 'TEST' ? message : undefined })).data,
    onSuccess: (e) => { void qc.invalidateQueries({ queryKey: ['eval'] }); void qc.invalidateQueries({ queryKey: ['candidature', c.id] }); onFait(e); },
  });
  const choisir = (id: string) => {
    setModeleId(id);
    const x = modeles.data?.find((y) => y.id === id);
    if (x?.mode === 'TEST') setLimite(new Date(Date.now() + x.delaiJours * 86400000).toISOString().slice(0, 10));
  };
  return (
    <Fenetre titre={`Évaluer ${c.candidatNom}`} sousTitre="Un test se passe en ligne, chronométré et corrigé automatiquement. Une grille se remplit par vous pendant l'entretien." largeur={600}
      onFermer={onFermer} modifie={!!modeleId}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!m || envoyer.isPending} onClick={() => envoyer.mutate()}>
        {m?.mode === 'GRILLE' ? 'Ouvrir la grille' : 'Envoyer le test'}</button></>}>
      {modeles.isLoading && <Chargement />}
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
      {(['TEST', 'GRILLE'] as const).map((mode) => {
        const liste = modeles.data?.filter((x) => x.mode === mode) ?? [];
        if (liste.length === 0) return null;
        return (
          <div key={mode} className="field">{mode === 'TEST' ? 'Tests en ligne' : "Grilles d'entretien"}
            <div className="stack" style={{ gap: 6 }} role="radiogroup" aria-label={mode === 'TEST' ? 'Tests' : 'Grilles'}>
              {liste.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={modeleId === x.id} className="option-creneau" onClick={() => choisir(x.id)}>
                  <b>{x.intitule}</b>
                  <span>{x.mode === 'TEST' ? `${x.nombreQuestions} questions · ${x.dureeMinutes} min · seuil ${x.seuil}` : `${x.nombreQuestions} critères`}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {m?.mode === 'TEST' && (
        <>
          {!c.candidatEmail && <div className="alert error">Ce candidat n'a pas d'adresse e-mail : ajoutez-la sur sa fiche avant d'envoyer un test.</div>}
          <label className="field">À passer avant le<input type="date" value={limite} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setLimite(e.target.value)} /></label>
          <label className="field">Message au candidat<textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
          <div className="encadre eval-regles">
            <b>Ce que le candidat verra avant de commencer</b>
            <ul>
              <li>{m.nombreQuestions} questions en {m.dureeMinutes} minutes, enregistrées à chaque réponse.</li>
              {m.pleinEcran && <li>Le test s'ouvre en plein écran.</li>}
              {m.signaux && <li>Les sorties de la page (autre onglet, autre fenêtre) et les textes collés sont signalés au recruteur.</li>}
              <li>{m.scoreVisible ? 'Son score lui est montré à la fin.' : "Son score ne lui est pas montré : c'est vous qui le recontactez."}</li>
            </ul>
          </div>
        </>
      )}
      {m?.mode === 'GRILLE' && <div className="alert info">La grille s'ouvre tout de suite : notez chaque critère de 1 à 5 pendant ou juste après l'entretien. Le candidat ne la voit pas.</div>}
    </Fenetre>
  );
}

/** Résultat détaillé : score, compétences, signaux d'intégrité, réponses et notation. */
export function FenetreResultat({ id, onFermer }: { id: string; onFermer: () => void }) {
  const detail = useEvaluation(id);
  const d = detail.data;
  return (
    <Fenetre type="drawer" largeur={760} onFermer={onFermer}
      titre={d ? `${d.resume.intitule} · ${d.resume.candidatNom}` : 'Évaluation'}
      sousTitre={d ? `${d.resume.missionIntitule} · ${d.resume.mode === 'GRILLE' ? "grille d'entretien" : `envoyé le ${dateCourte(d.resume.envoyeeLe)}`}` : undefined}>
      {detail.isLoading && <Chargement />}
      {detail.error && <Erreur message={messageErreur(detail.error)} />}
      {d && <ContenuResultat d={d} />}
    </Fenetre>
  );
}

function ContenuResultat({ d }: { d: EvaluationDetail }) {
  const qc = useQueryClient();
  const r = d.resume;
  const [notes, setNotes] = useState<Record<string, { valeur?: number; commentaire?: string }>>({});
  const [commentaire, setCommentaire] = useState(d.commentaire ?? '');
  const [fait, setFait] = useState('');
  const grille = r.mode === 'GRILLE';
  const modifiables = d.lignes.filter((l) => l.type === 'CRITERE' || l.type === 'OUVERTE');
  const enregistrer = useMutation({
    mutationFn: async (terminer: boolean) => (await api.put(`/api/selection/evaluations/${r.id}/notes`, {
      notes: Object.entries(notes).filter(([, n]) => n.valeur != null).map(([ligneId, n]) => ({ ligneId, valeur: n.valeur, commentaire: n.commentaire })),
      commentaire, terminer,
    })).data,
    onSuccess: (_, terminer) => {
      setNotes({});
      setFait(terminer ? 'Entretien terminé : le score est reporté sur la candidature.' : 'Notes enregistrées.');
      void qc.invalidateQueries({ queryKey: ['eval'] });
      void qc.invalidateQueries({ queryKey: ['candidature', r.candidatureId] });
      void qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
  const valeur = (l: LigneResultat) => notes[l.id]?.valeur ?? (l.type === 'CRITERE' && l.pointsObtenus != null ? Math.round((Number(l.pointsObtenus) * 5) / l.points) : l.pointsObtenus ?? undefined);
  const toutNote = d.lignes.every((l) => l.correcte != null || valeur(l) != null);
  const enAttente = r.statut === 'ENVOYEE' || r.statut === 'COMMENCEE' || r.statut === 'EXPIREE';
  const competences = Object.entries(r.scoresCompetences);
  return (
    <div className="stack" style={{ gap: 18 }}>
      {fait && <div className="alert info" role="status">{fait}</div>}
      {enregistrer.error && <Erreur message={messageErreur(enregistrer.error)} />}

      <div className="eval-synthese">
        <div className="eval-score">
          <span className="muted small">Score</span>
          <span><b>{r.score ?? '—'}</b>{r.score != null && <span className="muted"> / 100</span>}</span>
          <Pill tone={TON_STATUT[r.statut]}>{LIBELLE_STATUT[r.statut]}</Pill>
          {r.score != null && !grille && <span className={`small ${r.score >= r.seuil ? 'ton-ok' : 'ton-bad'}`}>{r.score >= r.seuil ? 'Au-dessus' : 'En dessous'} du seuil ({r.seuil})</span>}
        </div>
        <div className="stack" style={{ gap: 8, flex: 1, minWidth: 220 }}>
          {competences.length === 0 && <span className="muted small">{enAttente ? 'Le score apparaîtra quand le candidat aura terminé.' : 'Pas encore de score par compétence.'}</span>}
          {competences.map(([c, v]) => (
            <div key={c} className="barre-ligne"><span>{c}</span><div className="barre"><div style={{ width: `${v}%` }} /></div><span className="mono" style={{ textAlign: 'right' }}>{v}</span></div>
          ))}
          {r.debut && !grille && <span className="muted small">Commencé le {dateHeureFr(r.debut)}{r.fin ? `, terminé en ${duree((new Date(r.fin).getTime() - new Date(r.debut).getTime()) / 1000)}` : ''}</span>}
        </div>
      </div>

      {r.statut === 'ENVOYEE' && <div className="alert info">Le candidat n'a pas encore commencé.{r.dateLimite ? ` Il a jusqu'au ${dateCourte(r.dateLimite)}.` : ''}</div>}
      {r.statut === 'COMMENCEE' && <div className="alert info">Le candidat est en train de passer le test. Ses réponses s'affichent quand il a terminé.</div>}
      {r.statut === 'EXPIREE' && <div className="alert error">La date limite est passée sans que le candidat commence. Vous pouvez lui renvoyer un test.</div>}

      {!grille && !enAttente && <Integrite d={d} />}

      {!enAttente && (
        <section className="stack" style={{ gap: 10 }} aria-label={grille ? 'Critères' : 'Réponses'}>
          <h3 className="petit-titre">{grille ? 'Critères' : 'Réponses'}</h3>
          {d.lignes.map((l) => <Ligne key={l.id} l={l} valeur={valeur(l)} commentaire={notes[l.id]?.commentaire}
            onNote={(v, c) => setNotes((n) => ({ ...n, [l.id]: { valeur: v ?? n[l.id]?.valeur, commentaire: c ?? n[l.id]?.commentaire } }))} />)}
        </section>
      )}

      {!enAttente && (
        <label className="field">Commentaire de synthèse{grille ? '' : ' (facultatif)'}
          <textarea rows={3} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex. : solide sur Spring et JPA, SQL à consolider ; à creuser en entretien : transactions." />
        </label>
      )}
      {!enAttente && (modifiables.length > 0 || commentaire !== (d.commentaire ?? '')) && (
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className={`btn ${grille ? '' : 'primary'}`} disabled={enregistrer.isPending} onClick={() => enregistrer.mutate(false)}>Enregistrer</button>
          {grille && r.statut === 'EN_COURS' && <button type="button" className="btn primary" disabled={!toutNote || enregistrer.isPending} onClick={() => enregistrer.mutate(true)}
            title={toutNote ? undefined : 'Notez tous les critères'}>Terminer l'entretien</button>}
        </div>
      )}
    </div>
  );
}

function Integrite({ d }: { d: EvaluationDetail }) {
  const i = d.resume.integrite;
  const sorties = d.evenements.filter((e) => e.type !== 'COPIE');
  return (
    <section className={`encadre eval-integrite ${i.alerte ? 'alerte' : ''}`} aria-labelledby="integrite">
      <div className="ligne-entre"><b id="integrite">Signaux d'intégrité</b>{!i.alerte && i.aVerifier === 0 && <span className="statut-texte ton-ok">Rien à signaler</span>}</div>
      <div className="eval-compteurs">
        <span><b>{i.sorties}</b> sortie{i.sorties > 1 ? 's' : ''} de la page</span>
        <span><b>{duree(i.secondesHors)}</b> hors de la page</span>
        <span><b>{i.collages}</b> texte{i.collages > 1 ? 's' : ''} collé{i.collages > 1 ? 's' : ''}</span>
        <span><b>{i.aVerifier}</b> réponse{i.aVerifier > 1 ? 's' : ''} à vérifier</span>
      </div>
      {sorties.length > 0 && (
        <ol className="eval-evenements">
          {sorties.slice(0, 30).map((e, k) => (
            <li key={k}><span className="mono small">{new Date(e.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              {LIBELLE_SIGNAL[e.type]}{e.dureeMs ? ` · ${duree(e.dureeMs / 1000)}` : ''}{e.longueur ? ` · ${e.longueur} caractères` : ''}{e.ordre ? ` · question ${e.ordre}` : ''}</li>
          ))}
        </ol>
      )}
      <p className="small" style={{ margin: 0 }}>Ce sont des indices, pas des preuves : une notification ou une coupure réseau produit aussi une sortie. Faites réexpliquer à l'oral les réponses marquées « à vérifier ».</p>
    </section>
  );
}

function Ligne({ l, valeur, commentaire, onNote }: { l: LigneResultat; valeur?: number; commentaire?: string; onNote: (v?: number, c?: string) => void }) {
  const attendues = new Set((l.attendues ?? '').split(',').filter(Boolean).map(Number));
  const donnees = new Set((l.reponse ?? '').split(',').filter((x) => x !== '').map(Number));
  const etat = l.type === 'CRITERE' ? '' : l.correcte === true ? 'ok' : l.correcte === false ? 'ko' : 'attente';
  return (
    <article className={`eval-ligne-resultat ${etat}`}>
      <div className="ligne-entre" style={{ gap: 10, alignItems: 'flex-start' }}>
        <span className="stack" style={{ gap: 4 }}>
          <span className="muted small">{l.type === 'CRITERE' ? `Critère ${l.ordre} · poids ${l.points}` : `Question ${l.ordre} · ${LIBELLE_TYPE[l.type]} · ${l.competence}`}</span>
          <b className="moyen">{l.enonce}</b>
        </span>
        {l.type !== 'CRITERE' && <span className="mono small eval-points">{l.pointsObtenus != null ? Number(l.pointsObtenus) : '—'} / {l.points}</span>}
      </div>
      {l.aVerifier && <div className="eval-a-verifier"><Icone nom="horloge" taille={14} />À vérifier à l'oral · {l.motifVerification}</div>}
      {l.code && l.type !== 'CRITERE' && <pre className="eval-code">{l.code}</pre>}
      {l.type === 'CRITERE' && l.code && <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>{l.code.split('\n').filter(Boolean).map((g) => <li key={g}>{g}</li>)}</ul>}
      {l.choix.length > 0 && (
        <ul className="eval-choix-resultat">
          {l.choix.map((c, i) => (
            <li key={i} className={`${attendues.has(i) ? 'attendue' : ''} ${donnees.has(i) ? 'donnee' : ''}`}>
              <span aria-hidden="true">{donnees.has(i) ? (attendues.has(i) ? '✓' : '✗') : attendues.has(i) ? '○' : ''}</span>{c}
              {donnees.has(i) && <span className="sr-only"> (choisie{attendues.has(i) ? ', bonne réponse' : ', mauvaise réponse'})</span>}
              {!donnees.has(i) && attendues.has(i) && <span className="sr-only"> (bonne réponse non choisie)</span>}
            </li>
          ))}
        </ul>
      )}
      {(l.type === 'COURTE' || l.type === 'OUVERTE') && (
        <div className="eval-reponse"><span className="muted small">Réponse du candidat</span><p>{l.reponse || <i className="muted">Pas de réponse</i>}</p>
          {l.type === 'COURTE' && l.attendues && <span className="muted small">Acceptées : {l.attendues.split('|').join(' · ')}</span>}</div>
      )}
      {l.explication && l.type !== 'CRITERE' && <p className="small muted" style={{ margin: 0 }}>{l.explication}</p>}
      {l.tempsMs != null && l.tempsMs > 0 && <span className="muted small">Temps passé : {duree(l.tempsMs / 1000)}</span>}
      {l.type === 'OUVERTE' && (
        <label className="field eval-note-ouverte">Points accordés (sur {l.points})
          <input type="number" min={0} max={l.points} step={0.5} value={valeur ?? ''} onChange={(e) => onNote(e.target.value === '' ? undefined : Number(e.target.value))} />
        </label>
      )}
      {l.type === 'CRITERE' && (
        <>
          <div className="eval-etoiles" role="radiogroup" aria-label={`Note pour ${l.enonce}`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={valeur === n} className={valeur != null && n <= valeur ? 'on' : ''} onClick={() => onNote(n)}>{n}</button>
            ))}
            <span className="muted small">{valeur ? ['', 'Insuffisant', 'Fragile', 'Correct', 'Solide', 'Excellent'][valeur] : 'Non noté'}</span>
          </div>
          <input className="input" placeholder="Remarque (facultatif)" aria-label="Remarque" value={commentaire ?? l.reponse ?? ''} onChange={(e) => onNote(valeur, e.target.value)} />
        </>
      )}
    </article>
  );
}
