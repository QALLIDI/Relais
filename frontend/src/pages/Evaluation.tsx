import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, messageErreur } from '../api/client';
import { fmtJourLong, libelleDecision, useReunion } from '../api/reunions';
import type { DecisionEntretien, ProfilPresente } from '../api/types';
import { Chargement, Erreur } from '../components/ui';

type Critere = 'technique' | 'communication' | 'motivation' | 'adequationEquipe';
const CRITERES: [Critere, string, string][] = [
  ['technique', 'Compétences techniques', 'Maîtrise des outils et des méthodes du poste'],
  ['communication', 'Communication', 'Clarté, écoute, échanges avec l’équipe'],
  ['motivation', 'Motivation', 'Intérêt pour le poste et l’entreprise'],
  ['adequationEquipe', 'Adéquation à l’équipe', 'Façon de travailler, valeurs'],
];
const DECISIONS: DecisionEntretien[] = ['RETENIR', 'SECOND_ENTRETIEN', 'NE_PAS_RETENIR'];

/** Grille d'évaluation après entretien (maquette EmberEvaluation), commune à tous les entretiens. */
export default function Evaluation({ espace }: { espace: 'recruteur' | 'entreprise' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reunion = useReunion(id);
  const r = reunion.data;
  const shortlist = useQuery({
    queryKey: ['shortlist', r?.missionId],
    queryFn: async () => (await api.get<ProfilPresente[]>(`/api/shortlists/mission/${r?.missionId}`)).data,
    enabled: !!r?.missionId,
  });
  const profil = shortlist.data?.find((p) => p.candidatureId === r?.candidatureId);
  const [notes, setNotes] = useState<Record<Critere, number>>({ technique: 0, communication: 0, motivation: 0, adequationEquipe: 0 });
  const [decision, setDecision] = useState<DecisionEntretien | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const retour = espace === 'entreprise' ? '/entreprise/entretiens' : '/recruteur/agenda';

  const envoyer = useMutation({
    mutationFn: () => api.post(`/api/reunions/${id}/evaluation`, { ...notes, decision, commentaire: commentaire || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reunions'] });
      void qc.invalidateQueries({ queryKey: ['shortlist'] });
      void qc.invalidateQueries({ queryKey: ['selection'] });
      navigate(retour);
    },
  });

  if (reunion.isLoading) return <main className="page"><Chargement /></main>;
  if (reunion.error || !r) return <main className="page"><Erreur message={messageErreur(reunion.error)} /></main>;

  const donnees = Object.values(notes).filter((v) => v > 0);
  const moyenne = donnees.length ? (donnees.reduce((a, b) => a + b, 0) / donnees.length).toFixed(1).replace('.', ',') : '—';
  const complet = donnees.length === 4 && !!decision;

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="crumbs"><Link to={retour}>Entretiens</Link><span>/</span><span>Entretien du {r.debut ? fmtJourLong(r.debut) : '—'} · {r.missionIntitule}</span></div>
          <h1>Évaluer {r.candidatNom}</h1>
        </div>
        <span className="chip" style={{ padding: '12px 18px', fontSize: 14 }}>Grille commune à tous les entretiens</span>
      </section>
      {r.evaluation && <div className="alert info">Cet entretien a déjà été évalué ({libelleDecision[r.evaluation.decision].toLowerCase()}).</div>}
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
        <section className="card stack" style={{ gap: 4 }}>
          {CRITERES.map(([k, nom, aide]) => (
            <div key={k} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
              <div><div style={{ fontSize: 17, fontWeight: 500 }}>{nom}</div><div className="muted small">{aide}</div></div>
              <div className="notes" role="radiogroup" aria-label={nom}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={notes[k] === v} onClick={() => setNotes({ ...notes, [k]: v })}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          <label className="field" style={{ marginTop: 12 }}>Commentaire pour le recruteur
            <textarea rows={3} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </label>
          <div className="decision" role="radiogroup" aria-label="Décision" style={{ marginTop: 14 }}>
            {DECISIONS.map((d) => (
              <button key={d} type="button" role="radio" className={d === 'RETENIR' ? 'accent' : ''} aria-checked={decision === d} onClick={() => setDecision(d)}>{libelleDecision[d]}</button>
            ))}
          </div>
          <button type="button" className="btn accent" style={{ marginTop: 14 }} disabled={!complet || !!r.evaluation || envoyer.isPending} onClick={() => envoyer.mutate()}>Envoyer mon avis</button>
          <div className="muted small" style={{ marginTop: 6 }}>« Second entretien » prévient votre recruteur, qui vous propose aussitôt de nouveaux créneaux. « Retenir » fait passer la candidature à l'offre.</div>
        </section>

        <section className="card soft stack" style={{ gap: 10 }}>
          <div className="small" style={{ color: 'var(--ink-2)' }}>Votre note moyenne</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ fontSize: 64, lineHeight: 1 }}>{moyenne}</span><span style={{ fontSize: 18, color: 'var(--ink-2)' }}>/ 5</span></div>
          <div className="box" style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--veil)' }}><span>Note du recruteur</span><b style={{ fontWeight: 600 }}>{profil?.noteGlobale ? `${profil.noteGlobale} / 5` : '—'}</b></div>
          {profil?.synthese && <div className="box small" style={{ background: 'var(--veil)', lineHeight: 1.5 }}>{profil.synthese}</div>}
          <div className="box" style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--veil)' }}><span>Format</span><b style={{ fontWeight: 600 }}>{r.typeLibelle} · {r.dureeMinutes} min</b></div>
        </section>
      </div>
    </main>
  );
}
