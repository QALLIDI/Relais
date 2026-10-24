import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateFr, libelleStatutMission, mad } from '../../api/format';
import type { Candidature, Etape, Mission, Pipeline, Suggestion } from '../../api/types';
import { Chargement, Erreur, Modal, Pill, Score, Tags, toneMission } from '../../components/ui';

type Dialogue =
  | { type: 'sortie'; candidature: Candidature; etape: Etape }
  | { type: 'placement'; candidature: Candidature }
  | { type: 'evaluation'; candidature: Candidature }
  | { type: 'entretien'; candidature: Candidature }
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

  return (
    <>
      <div className="muted small"><Link to="/recruteur/missions">Missions</Link> / {m?.entrepriseNom}</div>
      {m && (
        <header className="header" style={{ alignItems: 'flex-start' }}>
          <div className="stack" style={{ gap: 8 }}>
            <div className="actions">
              <h1 style={{ fontSize: 26 }}>{m.intitule}</h1>
              <Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill>
            </div>
            <div className="muted">
              {[m.entrepriseNom, m.typeContrat, m.ville, m.teletravail, m.experienceMin != null ? `${m.experienceMin} ans et plus` : null,
                m.salaireMax ? `${mad(m.salaireMin)} – ${mad(m.salaireMax)} brut/an` : null, m.dateLimite ? `échéance ${dateFr(m.dateLimite)}` : null]
                .filter(Boolean).join(' · ')}
            </div>
            <Tags items={[...m.competencesRequises, ...m.competencesSouhaitees.map((c) => `${c} (souhaité)`)]} />
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setVoirSuggestions((v) => !v)}>
              {voirSuggestions ? 'Masquer les suggestions' : 'Suggestions du vivier'}
            </button>
            <button className="btn primary" disabled={selection.length === 0 || shortlist.isPending} onClick={() => shortlist.mutate()}>
              Envoyer la shortlist ({selection.length})
            </button>
          </div>
        </header>
      )}
      {erreur && <Erreur message={messageErreur(erreur)} />}

      {voirSuggestions && (
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Profils du vivier les mieux classés</h2>
          {suggestions.isLoading && <Chargement />}
          {suggestions.data?.length === 0 && <p className="muted">Tous les profils du vivier sont déjà dans le pipeline.</p>}
          {suggestions.data?.map((s) => (
            <div key={s.candidatId} className="list-item">
              <div className="stack" style={{ gap: 4 }}>
                <span><Link to={`/recruteur/vivier/${s.candidatId}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.nomComplet}</Link> <span className="muted small">{s.titre} · {s.anneesExperience} ans · {s.ville} · {s.disponibilite}</span></span>
                <Tags items={s.competences} />
              </div>
              <div className="actions">
                <Score value={s.score} />
                <button className="btn small" disabled={ajouter.isPending} onClick={() => ajouter.mutate(s.candidatId)}>Ajouter</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {pipeline.isLoading && <Chargement />}
      <div className="table-wrap" style={{ paddingBottom: 8 }}>
        <div className="kanban">
          {pipeline.data?.colonnes.map((col) => (
            <section
              key={col.etape}
              className={`colonne ${survol === col.etape ? 'survol' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setSurvol(col.etape); }}
              onDragLeave={() => setSurvol(null)}
              onDrop={(e) => lacher(col.etape, e.dataTransfer.getData('text/plain'))}
              aria-label={col.libelle}
            >
              <h3>{col.libelle}<span className="mono muted">{col.candidatures.length}</span></h3>
              {col.candidatures.map((c) => (
                <article
                  key={c.id}
                  className={`carte ${selection.includes(c.id) ? 'selection' : ''}`}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                >
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'nowrap' }}>
                    <div>
                      <Link to={`/recruteur/vivier/${c.candidatId}`} style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{c.candidatNom}</Link>
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
                      <label className="check small"><input type="checkbox" checked={selection.includes(c.id)} onChange={() => basculer(c.id)} /> Shortlist</label>
                    )}
                    <button className="btn small" onClick={() => setDialogue({ type: 'evaluation', candidature: c })}>Évaluer</button>
                    <button className="btn small" onClick={() => setDialogue({ type: 'entretien', candidature: c })}>Entretien</button>
                    <button className="btn small danger" onClick={() => setDialogue({ type: 'sortie', candidature: c, etape: 'REFUSE' })}>Refuser</button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
      <p className="muted small">Glissez une carte d'une colonne à l'autre pour changer son étape. Cochez les profils qualifiés pour composer une shortlist.</p>

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
      {dialogue?.type === 'entretien' && <DialogueEntretien c={dialogue.candidature} onClose={() => setDialogue(null)} onFait={() => { setDialogue(null); rafraichir(); void qc.invalidateQueries({ queryKey: ['entretiens'] }); }} />}
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
        <span className="mono">{note} / 5</span>
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

function DialogueEntretien({ c, onClose, onFait }: { c: Candidature; onClose: () => void; onFait: () => void }) {
  const [quand, setQuand] = useState('');
  const [type, setType] = useState(c.etape === 'PRESENTE' ? 'CLIENT' : 'RECRUTEUR');
  const [lieu, setLieu] = useState('Visio');
  const planifier = useMutation({
    mutationFn: () => api.post('/api/entretiens', { candidatureId: c.id, dateHeure: new Date(quand).toISOString(), type, lieu }),
    onSuccess: onFait,
  });
  return (
    <Modal titre={`Planifier un entretien avec ${c.candidatNom}`} onClose={onClose}>
      <label className="field">Date et heure<input type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} /></label>
      <label className="field">Type
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="PREQUALIFICATION">Pré-qualification</option>
          <option value="RECRUTEUR">Entretien recruteur</option>
          <option value="CLIENT">Entretien client</option>
        </select>
      </label>
      <label className="field">Lieu<input value={lieu} onChange={(e) => setLieu(e.target.value)} /></label>
      {planifier.error && <Erreur message={messageErreur(planifier.error)} />}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!quand || planifier.isPending} onClick={() => planifier.mutate()}>Planifier et prévenir</button>
      </div>
    </Modal>
  );
}
