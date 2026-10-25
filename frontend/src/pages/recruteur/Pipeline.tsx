import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateCourte, initiales, libelleStatutMission, mad } from '../../api/format';
import type { Candidature, Etape, Mission, Pipeline, Suggestion } from '../../api/types';
import { Chargement, Erreur, Kpi, Modal, Pill, Score, Tags, teinte, toneMission } from '../../components/ui';

type Dialogue =
  | { type: 'sortie'; candidature: Candidature; etape: Etape }
  | { type: 'placement'; candidature: Candidature }
  | { type: 'evaluation'; candidature: Candidature }
  | null;

const SHORTLISTABLES: Etape[] = ['QUALIFIE', 'ENTRETIEN_RECRUTEUR'];

export default function PipelinePage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [selection, setSelection] = useState<string[]>([]);
  const [survol, setSurvol] = useState<Etape | null>(null);
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [voirSuggestions, setVoirSuggestions] = useState(false);

  const mission = useQuery({ queryKey: ['mission', id], queryFn: async () => (await api.get<Mission>(`/api/missions/${id}`)).data });
  const pipeline = useQuery({ queryKey: ['pipeline', id], queryFn: async () => (await api.get<Pipeline>(`/api/pipeline/${id}`)).data });
  const suggestions = useQuery({
    queryKey: ['suggestions', id],
    queryFn: async () => (await api.get<Suggestion[]>(`/api/pipeline/${id}/suggestions`)).data,
    enabled: voirSuggestions,
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

  const lacher = (etape: Etape, candidatureId: string) => {
    setSurvol(null);
    const c = pipeline.data?.colonnes.flatMap((col) => col.candidatures).find((x) => x.id === candidatureId);
    if (!c || c.etape === etape) return;
    if (etape === 'PLACE') setDialogue({ type: 'placement', candidature: c });
    else deplacer.mutate({ id: c.id, etape });
  };

  const basculer = (cid: string) =>
    setSelection((s) => (s.includes(cid) ? s.filter((x) => x !== cid) : [...s, cid]));

  const m = mission.data;
  const erreur = deplacer.error ?? ajouter.error ?? shortlist.error;
  const colonnes = pipeline.data?.colonnes ?? [];
  const total = colonnes.reduce((s, col) => s + col.candidatures.length, 0);
  const presentes = colonnes.find((col) => col.etape === 'PRESENTE')?.candidatures ?? [];
  const enAttente = presentes.filter((c) => !c.avisClient).length;

  return (
    <>
      {m && (
        <section className="header">
          <div className="stack" style={{ gap: 10 }}>
            <div className="crumbs">
              <Link to="/recruteur/missions">Missions</Link><span>/</span><span>{m.entrepriseNom}</span>
              {m.priorite === 'Haute' && <Pill tone="info">Priorité haute</Pill>}
              <Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill>
            </div>
            <h1>{m.intitule}</h1>
            <div className="chips">
              {[m.typeContrat, [m.ville, m.teletravail?.toLowerCase()].filter(Boolean).join(' · '), m.experienceMin != null ? `${m.experienceMin} ans et plus` : null,
                m.salaireMax ? `${mad(m.salaireMin)} – ${mad(m.salaireMax)}` : null].filter(Boolean).map((x) => <span key={x} className="chip">{x}</span>)}
              {m.competencesRequises.map((c) => <span key={c} className="chip dark">{c}</span>)}
              {m.competencesSouhaitees.map((c) => <span key={c} className="chip">{c} (souhaité)</span>)}
            </div>
          </div>
          <div className="kpis" style={{ alignItems: 'flex-end', gap: 36 }}>
            <Kpi label="Dans le pipeline" value={total} />
            <Kpi label="Présentés" value={presentes.length} note={enAttente ? 'en attente' : undefined} tone={enAttente ? 'warn' : undefined} />
            <Kpi label="Échéance" value={m.dateLimite ? dateCourte(m.dateLimite) : '—'} />
            <button className="btn" onClick={() => setVoirSuggestions((v) => !v)} aria-expanded={voirSuggestions}>
              <span className="dot" />{voirSuggestions ? 'Masquer les suggestions' : 'Suggestions du vivier'}
            </button>
          </div>
        </section>
      )}
      {erreur && <Erreur message={messageErreur(erreur)} />}

      {voirSuggestions && (
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Profils du vivier les mieux classés</h2>
          {suggestions.isLoading && <Chargement />}
          {suggestions.data?.length === 0 && <p className="muted">Tous les profils du vivier sont déjà dans le pipeline.</p>}
          {suggestions.data?.map((s) => (
            <div key={s.candidatId} className="tile">
              <span className="avatar" aria-hidden="true">{initiales(s.nomComplet)}</span>
              <div className="stack" style={{ gap: 4, flex: '1 1 260px', minWidth: 0 }}>
                <span><Link to={`/recruteur/vivier/${s.candidatId}`} style={{ fontWeight: 600 }}>{s.nomComplet}</Link> <span className="muted small">{s.titre} · {s.anneesExperience} ans · {s.ville} · {s.disponibilite}</span></span>
                <Tags items={s.competences} />
              </div>
              <div className="actions">
                <Score value={s.score} />
                <button className="btn small primary" disabled={ajouter.isPending} onClick={() => ajouter.mutate(s.candidatId)}>Ajouter</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {pipeline.isLoading && <Chargement />}
      <div className="table-wrap" style={{ paddingBottom: 8 }}>
        <div className="kanban">
          {colonnes.map((col) => (
            <section
              key={col.etape}
              className={`colonne ${col.etape === 'PRESENTE' ? 'chaude' : ''} ${col.etape === 'PLACE' && col.candidatures.length === 0 ? 'fin' : ''} ${survol === col.etape ? 'survol' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setSurvol(col.etape); }}
              onDragLeave={() => setSurvol(null)}
              onDrop={(e) => lacher(col.etape, e.dataTransfer.getData('text/plain'))}
              aria-label={col.libelle}
            >
              <h3>{col.libelle}<span className="compteur">{col.candidatures.length}</span></h3>
              {col.candidatures.map((c, i) => {
                const choisi = selection.includes(c.id);
                return (
                  <article
                    key={c.id}
                    className={`carte ${choisi ? 'selection' : ''}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`avatar ${teinte(i)}`} aria-hidden="true">{initiales(c.candidatNom)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/recruteur/vivier/${c.candidatId}`} style={{ fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>{c.candidatNom}</Link>
                        <div className="muted small">{c.candidatTitre} · {c.candidatExperience} ans</div>
                      </div>
                      <Score value={c.score} />
                    </div>
                    <Tags items={c.competences.slice(0, 3)} />
                    {c.noteGlobale && <div className="small">Évaluation : <b>{c.noteGlobale}/5</b></div>}
                    {c.avisClient && <div className="small" style={{ color: c.avisClient === 'REFUSE' ? 'var(--bad)' : 'var(--ok)' }}>Client : {c.avisClient === 'A_RENCONTRER' ? 'à rencontrer' : c.avisClient === 'RETENU' ? 'retenu' : 'refusé'}</div>}
                    {c.etape === 'PRESENTE' && !c.avisClient && <div className="small" style={{ color: 'var(--warn)' }}>En attente du retour client</div>}
                    <div className="actions" style={{ gap: 4 }}>
                      {SHORTLISTABLES.includes(c.etape) && (
                        <button className={`btn small ${choisi ? 'on' : ''}`} aria-pressed={choisi} onClick={() => basculer(c.id)}>
                          {choisi ? 'Dans la shortlist' : '+ Shortlist'}
                        </button>
                      )}
                      <button className="btn small" onClick={() => setDialogue({ type: 'evaluation', candidature: c })}>Évaluer</button>
                      <Link className="btn small" to={`/recruteur/agenda/planifier?candidature=${c.id}`}>Entretien</Link>
                      <button className="btn small danger" onClick={() => setDialogue({ type: 'sortie', candidature: c, etape: 'REFUSE' })}>Refuser</button>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>Glissez une carte d'une colonne à l'autre pour changer son étape. Ajoutez les profils qualifiés à la shortlist, puis envoyez-la au client.</p>

      <div className="barre-flottante" role="region" aria-label="Shortlist">
        <span className="small">{selection.length} profil(s) sélectionné(s)</span>
        <button className="btn accent" disabled={selection.length === 0 || shortlist.isPending} onClick={() => shortlist.mutate()}>Envoyer la shortlist</button>
      </div>

      {pipeline.data && pipeline.data.sorties.length > 0 && (
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Sortis du pipeline</h2>
          {pipeline.data.sorties.map((c) => (
            <div key={c.id} className="list-item">
              <span><b>{c.candidatNom}</b> <span className="muted small">{c.etapeLibelle} · {c.motifSortie}</span></span>
              <button className="btn small" onClick={() => deplacer.mutate({ id: c.id, etape: 'QUALIFIE' })}>Réintégrer</button>
            </div>
          ))}
        </section>
      )}

      {dialogue?.type === 'sortie' && <DialogueSortie d={dialogue} onClose={() => setDialogue(null)} onValider={(motif) => deplacer.mutate({ id: dialogue.candidature.id, etape: dialogue.etape, motif })} />}
      {dialogue?.type === 'placement' && <DialoguePlacement c={dialogue.candidature} onClose={() => setDialogue(null)} onValider={(salaireAnnuel, dateEmbauche) => deplacer.mutate({ id: dialogue.candidature.id, etape: 'PLACE', salaireAnnuel, dateEmbauche })} />}
      {dialogue?.type === 'evaluation' && <DialogueEvaluation c={dialogue.candidature} onClose={() => setDialogue(null)} onFait={() => { setDialogue(null); rafraichir(); }} />}
    </>
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

