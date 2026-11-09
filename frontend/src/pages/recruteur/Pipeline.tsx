import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateCourte, initiales, libelleStatutMission } from '../../api/format';
import type { Candidature, Etape, Mission, Pipeline, Suggestion } from '../../api/types';
import { Chargement, Erreur, Icone, Modal, Pill, Score, Tags, TetePage, toneMission } from '../../components/ui';
import { Annuler, Fenetre, versFenetre } from '../../components/Fenetre';
import { useFilAriane } from '../../components/Layouts';

type Dialogue =
  | { type: 'sortie'; candidature: Candidature; etape: Etape }
  | { type: 'placement'; candidature: Candidature }
  | { type: 'evaluation'; candidature: Candidature }
  | null;

const SHORTLISTABLES: Etape[] = ['QUALIFIE', 'ENTRETIEN_RECRUTEUR'];

/** Colonnes affichées : les étapes du pipeline regroupées comme dans les maquettes. */
const GROUPES: { cle: string; titre: string; etapes: Etape[]; cible: Etape }[] = [
  { cle: 'qualifier', titre: 'À qualifier', etapes: ['SOURCE'], cible: 'SOURCE' },
  { cle: 'qualifies', titre: 'Qualifiés', etapes: ['QUALIFIE', 'ENTRETIEN_RECRUTEUR'], cible: 'QUALIFIE' },
  { cle: 'shortlist', titre: 'Shortlist', etapes: ['PRESENTE', 'ENTRETIEN_CLIENT'], cible: 'PRESENTE' },
  { cle: 'offre', titre: 'Offre et embauche', etapes: ['OFFRE', 'PLACE'], cible: 'OFFRE' },
];

/** Phrase d'état sous chaque carte : ce qui se passe maintenant pour ce candidat. */
function etat(c: Candidature): string {
  if (c.etape === 'PRESENTE') return c.avisClient ? `Client : ${c.avisClient === 'A_RENCONTRER' ? 'à rencontrer' : c.avisClient === 'RETENU' ? 'retenu' : 'refusé'}` : 'Avis client attendu';
  if (c.etape === 'SOURCE') return 'À appeler';
  if (c.noteGlobale && (c.etape === 'QUALIFIE' || c.etape === 'ENTRETIEN_RECRUTEUR')) return `Évaluation ${c.noteGlobale}/5`;
  return c.etapeLibelle;
}

export default function PipelinePage() {
  const params = useParams();
  const qc = useQueryClient();
  const [selection, setSelection] = useState<string[]>([]);
  const [survol, setSurvol] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [voirSuggestions, setVoirSuggestions] = useState(false);
  const [annuler, setAnnuler] = useState(false);

  // Sans identifiant (menu « Pipeline »), on ouvre la mission ouverte la plus proche de son échéance.
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const ouvertes = (missions.data ?? []).filter((x) => x.statut === 'OUVERTE').sort((a, b) => (a.dateLimite ?? '9').localeCompare(b.dateLimite ?? '9'));
  const id = params.id ?? ouvertes[0]?.id ?? '';

  const mission = useQuery({ queryKey: ['mission', id], queryFn: async () => (await api.get<Mission>(`/api/missions/${id}`)).data, enabled: !!id });
  const pipeline = useQuery({ queryKey: ['pipeline', id], queryFn: async () => (await api.get<Pipeline>(`/api/pipeline/${id}`)).data, enabled: !!id });
  const suggestions = useQuery({
    queryKey: ['suggestions', id],
    queryFn: async () => (await api.get<Suggestion[]>(`/api/pipeline/${id}/suggestions`)).data,
    enabled: voirSuggestions && !!id,
  });

  const rafraichir = () => {
    void qc.invalidateQueries({ queryKey: ['pipeline', id] });
    void qc.invalidateQueries({ queryKey: ['suggestions', id] });
    void qc.invalidateQueries({ queryKey: ['selection'] });
  };

  const deplacer = useMutation({
    mutationFn: (v: { id: string; etape: Etape; motif?: string; salaireAnnuel?: number; dateEmbauche?: string }) =>
      api.patch(`/api/candidatures/${v.id}/etape`, v),
    onSuccess: () => { setDialogue(null); rafraichir(); },
  });
  const ajouter = useMutation({
    mutationFn: (candidatId: string) => api.post('/api/candidatures', { missionId: id, candidatId }),
    onSuccess: rafraichir,
  });
  const shortlist = useMutation({
    mutationFn: () => api.post('/api/shortlists', { missionId: id, candidatureIds: selection }),
    onSuccess: () => { setSelection([]); rafraichir(); },
  });

  const toutes = pipeline.data?.colonnes.flatMap((col) => col.candidatures) ?? [];
  const lacher = (g: (typeof GROUPES)[number], candidatureId: string) => {
    setSurvol(null);
    const c = toutes.find((x) => x.id === candidatureId);
    if (!c || g.etapes.includes(c.etape)) return;
    deplacer.mutate({ id: c.id, etape: g.cible });
  };
  const basculer = (cid: string) => setSelection((s) => (s.includes(cid) ? s.filter((x) => x !== cid) : [...s, cid]));

  const m = mission.data;
  useFilAriane(m ? [{ label: 'Missions', to: '/recruteur/missions' }, { label: m.intitule }, { label: 'Pipeline' }] : [{ label: 'Pipeline' }]);
  const erreur = deplacer.error ?? ajouter.error ?? shortlist.error;
  const nb = (etapes: Etape[]) => toutes.filter((c) => etapes.includes(c.etape)).length;
  const qualifies = nb(['QUALIFIE', 'ENTRETIEN_RECRUTEUR', 'PRESENTE', 'ENTRETIEN_CLIENT', 'OFFRE', 'PLACE']);
  const enShortlist = nb(['PRESENTE', 'ENTRETIEN_CLIENT', 'OFFRE', 'PLACE']);
  const vises = (m?.nbPostes ?? 1) * 3;
  // Avancement pondéré : qualification (30 %), shortlist visée (50 %), postes pourvus (20 %).
  const avancement = Math.round(30 * (toutes.length ? qualifies / toutes.length : 0) + 50 * Math.min(1, enShortlist / vises) + 20 * Math.min(1, nb(['PLACE']) / (m?.nbPostes ?? 1)));
  const sorties = pipeline.data?.sorties ?? [];

  if (!params.id && missions.data && ouvertes.length === 0) {
    return (
      <>
        <TetePage titre="Pipeline" sous="Aucune mission ouverte pour le moment." />
        <Link to={versFenetre('mission')} className="btn primary" style={{ alignSelf: 'flex-start' }}><Icone nom="plus" taille={16} />Nouvelle mission</Link>
      </>
    );
  }

  return (
    <>
      <TetePage titre="Pipeline" sous={m ? `${m.intitule} · ${m.entrepriseNom}${m.dateLimite ? ` · objectif shortlist le ${dateCourte(m.dateLimite)}` : ''}` : ' '}>
        <nav className="filtres" aria-label="Changer de mission">
          {ouvertes.slice(0, 4).map((x) => (
            <Link key={x.id} to={`/recruteur/missions/${x.id}`} aria-current={x.id === id ? 'page' : undefined}>{x.intitule}</Link>
          ))}
        </nav>
      </TetePage>
      {erreur && <Erreur message={messageErreur(erreur)} />}

      <div className="pipeline">
        <aside className="pipeline-cote">
          <section className="bloc bloc-corps" style={{ paddingTop: 14 }}>
            <div className="ligne-entre"><b className="moyen">Avancement</b><span className="muted small">{avancement} %</span></div>
            <div className="barre" style={{ margin: '10px 0' }}><div style={{ width: `${avancement}%` }} /></div>
            {m?.confidentiel && <div className="encadre" style={{ marginBottom: 8 }}><b>Recrutement confidentiel</b> : ne citez pas {m.entrepriseNom} aux candidats avant l'entretien.</div>}
            {m?.motifAnnulation && <div className="encadre alerte" style={{ marginBottom: 8 }}>Annulée : {m.motifAnnulation}</div>}
            {m && <p className="muted small" style={{ margin: 0 }}>Ouverte le {dateCourte(m.createdAt)} · {m.priorite === 'Haute' ? 'priorité haute' : m.typeContrat ?? ''} · <Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill></p>}
            {m && m.statut !== 'ANNULEE' && m.statut !== 'POURVUE' && (
              <button type="button" className="lien-action danger" onClick={() => setAnnuler(true)}>Annuler la mission</button>
            )}
          </section>
          <Compteur lettre="C" valeur={toutes.length} libelle="Candidats" ton="lavande" rempli={1} />
          <Compteur lettre="Q" valeur={qualifies} libelle="Qualifiés" rempli={toutes.length ? qualifies / toutes.length : 0} />
          <Compteur lettre="S" valeur={enShortlist} libelle={`En shortlist (${vises} visés)`} ton="menthe" rempli={Math.min(1, enShortlist / vises)} />
          <section className="bloc bloc-corps" style={{ paddingTop: 14 }}>
            <b className="moyen">Ce que voit le client</b>
            <p className="muted small" style={{ margin: '6px 0 10px', lineHeight: 1.5 }}>Seuls les profils envoyés en shortlist et votre synthèse sont visibles par {m?.entrepriseNom ?? 'le client'}.</p>
            <button type="button" className="lien-fleche" onClick={() => setVoirSuggestions((v) => !v)} aria-expanded={voirSuggestions}>
              {voirSuggestions ? 'Masquer les suggestions' : 'Suggestions du vivier'} <Icone nom="droite" taille={14} />
            </button>
          </section>
        </aside>

        <div className="pipeline-principal">
          {voirSuggestions && (
            <section className="bloc">
              <div className="bloc-tete"><h2>Profils du vivier les mieux classés</h2></div>
              <div className="bloc-corps">
                {suggestions.isLoading && <Chargement />}
                {suggestions.data?.length === 0 && <p className="muted">Tous les profils du vivier sont déjà dans le pipeline.</p>}
                {suggestions.data?.map((s) => (
                  <div key={s.candidatId} className="ligne-profil">
                    <span className="mono-av grand" aria-hidden="true">{initiales(s.nomComplet)}</span>
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <Link to={`/recruteur/vivier/${s.candidatId}`} className="nom-lien">{s.nomComplet}</Link>
                      <div className="muted small">{s.titre} · {s.anneesExperience} ans · {s.ville}</div>
                    </div>
                    <Tags items={s.competences.slice(0, 3)} />
                    <Score value={s.score} />
                    <button className="btn small primary" disabled={ajouter.isPending} onClick={() => ajouter.mutate(s.candidatId)}>Ajouter</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pipeline.isLoading && <Chargement />}
          <div className="kanban-epure">
            {GROUPES.map((g) => {
              const cartes = toutes.filter((c) => g.etapes.includes(c.etape));
              return (
                <section key={g.cle} className={`colonne-epure ${survol === g.cle ? 'survol' : ''}`} aria-label={g.titre}
                  onDragOver={(e) => { e.preventDefault(); setSurvol(g.cle); }} onDragLeave={() => setSurvol(null)}
                  onDrop={(e) => lacher(g, e.dataTransfer.getData('text/plain'))}>
                  <h3><span className="point-ton" style={{ background: 'var(--accent)' }} />{g.titre}<span className="nb">{cartes.length}</span></h3>
                  {cartes.map((c) => (
                    <CarteCandidat key={c.id} c={c} choisi={selection.includes(c.id)} onChoisir={SHORTLISTABLES.includes(c.etape) ? () => basculer(c.id) : undefined}
                      onEvaluer={() => setDialogue({ type: 'evaluation', candidature: c })}
                      onRefuser={() => setDialogue({ type: 'sortie', candidature: c, etape: 'REFUSE' })}
                      onPlacer={c.etape === 'OFFRE' ? () => setDialogue({ type: 'placement', candidature: c }) : undefined} />
                  ))}
                </section>
              );
            })}
            <section className="colonne-epure" aria-label="Écartés">
              <h3><span className="point-ton" style={{ background: 'var(--faint)' }} />Écartés<span className="nb">{sorties.length}</span></h3>
              {sorties.map((c) => (
                <article key={c.id} className="carte-epure">
                  <div className="carte-tete">
                    <span className="mono-av" aria-hidden="true">{initiales(c.candidatNom)}</span>
                    <div className="txt"><b>{c.candidatNom}</b><span>{c.motifSortie ?? c.etapeLibelle}</span></div>
                  </div>
                  <button className="lien-action" onClick={() => deplacer.mutate({ id: c.id, etape: 'QUALIFIE' })}>Réintégrer</button>
                </article>
              ))}
            </section>
          </div>
          <p className="muted small" style={{ margin: 0 }}>Glissez une carte d'une colonne à l'autre pour changer son étape. Cochez les profils qualifiés, puis envoyez la shortlist au client.</p>
        </div>
      </div>

      {selection.length > 0 && (
        <div className="barre-flottante" role="region" aria-label="Shortlist">
          <span className="small">{selection.length} profil(s) sélectionné(s)</span>
          <button className="btn primary" disabled={shortlist.isPending} onClick={() => shortlist.mutate()}>Envoyer la shortlist</button>
        </div>
      )}

      {annuler && m && <ModaleAnnulation mission={m} onFermer={() => setAnnuler(false)} />}
      {dialogue?.type === 'sortie' && <DialogueSortie d={dialogue} onClose={() => setDialogue(null)} onValider={(motif) => deplacer.mutate({ id: dialogue.candidature.id, etape: dialogue.etape, motif })} />}
      {dialogue?.type === 'placement' && <DialoguePlacement c={dialogue.candidature} onClose={() => setDialogue(null)} onValider={(salaireAnnuel, dateEmbauche) => deplacer.mutate({ id: dialogue.candidature.id, etape: 'PLACE', salaireAnnuel, dateEmbauche })} />}
      {dialogue?.type === 'evaluation' && <DialogueEvaluation c={dialogue.candidature} onClose={() => setDialogue(null)} onFait={() => { setDialogue(null); rafraichir(); }} />}
    </>
  );
}

function Compteur({ lettre, valeur, libelle, ton, rempli }: { lettre: string; valeur: number; libelle: string; ton?: 'lavande' | 'menthe'; rempli: number }) {
  const barres = 14, pleines = Math.round(rempli * barres);
  return (
    <div className={`compteur-carte ${ton ?? ''}`}>
      <span className="rond" aria-hidden="true">{lettre}</span>
      <div style={{ flex: 1 }}><b>{valeur}</b><span>{libelle}</span></div>
      <span className="mini-barres" aria-hidden="true">
        {Array.from({ length: barres }, (_, i) => <i key={i} className={i < pleines ? 'on' : ''} style={{ height: `${40 + ((i * 37) % 60)}%` }} />)}
      </span>
    </div>
  );
}

function CarteCandidat({ c, choisi, onChoisir, onEvaluer, onRefuser, onPlacer }: {
  c: Candidature; choisi: boolean; onChoisir?: () => void; onEvaluer: () => void; onRefuser: () => void; onPlacer?: () => void;
}) {
  return (
    <article className={`carte-epure ${choisi ? 'selection' : ''}`} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}>
      <div className="carte-tete">
        <span className="mono-av" aria-hidden="true">{initiales(c.candidatNom)}</span>
        <div className="txt">
          <Link to={`/recruteur/vivier/${c.candidatId}`}>{c.candidatNom}</Link>
          <span>{c.competences[0] ?? c.candidatTitre}, {c.candidatExperience} ans</span>
        </div>
        {onChoisir && (
          <label className="coche" title="Ajouter à la shortlist">
            <input type="checkbox" checked={choisi} onChange={onChoisir} />
            <span className="sr-only">Ajouter {c.candidatNom} à la shortlist</span>
          </label>
        )}
      </div>
      <div className="carte-pied">
        <span className={`etat-carte ${c.etape === 'PRESENTE' && !c.avisClient ? 'attente' : ''}`}>{etat(c)}</span>
        <details className="carte-menu">
          <summary aria-label={`Actions pour ${c.candidatNom}`}>⋯</summary>
          <div className="menu" onClick={(e) => (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')}>
            <button type="button" onClick={onEvaluer}>Évaluer</button>
            <Link to={versFenetre('planifier', { candidature: c.id, nom: c.candidatNom, mission: c.missionIntitule })}>Planifier une réunion</Link>
            {onPlacer && <button type="button" onClick={onPlacer}>Confirmer le placement</button>}
            <button type="button" className="danger" onClick={onRefuser}>Écarter</button>
          </div>
        </details>
      </div>
    </article>
  );
}

/** Annulation d'une mission (maquette « Modale · annuler une mission ») : motif et message au client. */
function ModaleAnnulation({ mission, onFermer }: { mission: Mission; onFermer: () => void }) {
  const qc = useQueryClient();
  const [motif, setMotif] = useState('');
  const [precision, setPrecision] = useState('');
  const MOTIFS = ['Poste pourvu en interne', 'Budget gelé', 'Besoin modifié', 'Autre'];
  const envoyer = useMutation({
    mutationFn: () => api.patch(`/api/missions/${mission.id}/statut`, { statut: 'ANNULEE', motif: [motif, precision].filter(Boolean).join(' : ') }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['missions'] }); void qc.invalidateQueries({ queryKey: ['mission', mission.id] }); onFermer(); },
  });
  return (
    <Fenetre titre="Annuler la mission" sousTitre={`${mission.intitule} · ${mission.entrepriseNom}. Les candidats en cours seront prévenus.`} onFermer={onFermer} modifie={!!motif || !!precision} largeur={480}
      pied={<><Annuler onClick={onFermer}>Garder la mission</Annuler><button className="btn danger" disabled={!motif || envoyer.isPending} onClick={() => envoyer.mutate()}>Annuler la mission</button></>}>
      <div className="field">Motif
        <div className="choix" role="radiogroup" aria-label="Motif">
          {MOTIFS.map((x) => <button key={x} type="button" role="radio" aria-checked={motif === x} onClick={() => setMotif(x)}>{x}</button>)}
        </div>
      </div>
      <label className="field">Précision pour le client (facultatif)<textarea rows={3} value={precision} onChange={(e) => setPrecision(e.target.value)} /></label>
      <div className="encadre">L'acompte déjà versé reste acquis selon les conditions du contrat.</div>
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
    </Fenetre>
  );
}

function DialogueSortie({ d, onClose, onValider }: { d: { candidature: Candidature; etape: Etape }; onClose: () => void; onValider: (motif: string) => void }) {
  const [motif, setMotif] = useState('');
  return (
    <Modal titre={`Sortir ${d.candidature.candidatNom} du pipeline`} onClose={onClose}>
      <label className="field">Motif (obligatoire)
        <select value={motif} onChange={(e) => setMotif(e.target.value)}>
          <option value="">Choisir…</option>
          <option>Compétences insuffisantes</option>
          <option>Prétentions trop élevées</option>
          <option>Disponibilité incompatible</option>
          <option>Candidat non intéressé</option>
          <option>Autre</option>
        </select>
      </label>
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn danger" disabled={!motif} onClick={() => onValider(motif)}>Confirmer le refus</button>
      </div>
    </Modal>
  );
}

function DialoguePlacement({ c, onClose, onValider }: { c: Candidature; onClose: () => void; onValider: (salaire: number, date: string) => void }) {
  const [salaire, setSalaire] = useState(c.candidatPretention ? String(c.candidatPretention) : '');
  const [date, setDate] = useState('');
  return (
    <Modal titre={`Placement de ${c.candidatNom}`} onClose={onClose}>
      <p className="muted">Une facture brouillon des honoraires sera préparée automatiquement.</p>
      <label className="field">Salaire annuel brut (MAD)<input type="number" value={salaire} onChange={(e) => setSalaire(e.target.value)} /></label>
      <label className="field">Date d'embauche<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!salaire || !date} onClick={() => onValider(Number(salaire), date)}>Confirmer le placement</button>
      </div>
    </Modal>
  );
}

function DialogueEvaluation({ c, onClose, onFait }: { c: Candidature; onClose: () => void; onFait: () => void }) {
  const [note, setNote] = useState(c.noteGlobale ?? 3);
  const [synthese, setSynthese] = useState(c.synthese ?? '');
  const enregistrer = useMutation({
    mutationFn: () => api.put(`/api/candidatures/${c.id}/evaluation`, { noteGlobale: note, synthese }),
    onSuccess: onFait,
  });
  return (
    <Modal titre={`Évaluation de ${c.candidatNom}`} onClose={onClose}>
      <label className="field">Note globale (1 à 5)
        <input type="range" min={1} max={5} value={note} onChange={(e) => setNote(Number(e.target.value))} />
        <span style={{ fontSize: 20, fontWeight: 500 }}>{note} / 5</span>
      </label>
      <label className="field">Synthèse (visible du client dans la shortlist)
        <textarea rows={4} value={synthese} onChange={(e) => setSynthese(e.target.value)} />
      </label>
      {enregistrer.error && <Erreur message={messageErreur(enregistrer.error)} />}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={enregistrer.isPending} onClick={() => enregistrer.mutate()}>Enregistrer</button>
      </div>
    </Modal>
  );
}

