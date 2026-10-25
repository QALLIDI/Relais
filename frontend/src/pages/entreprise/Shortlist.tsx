import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateCourte, dateFr, initiales, kmad, libelleAvis } from '../../api/format';
import type { AvisClient, Mission, ProfilPresente } from '../../api/types';
import { Chargement, Erreur, Pill, Tags, teinte, toneAvis, Vide } from '../../components/ui';

export default function Shortlist() {
  const { missionId = '' } = useParams();
  const qc = useQueryClient();
  const [commentaires, setCommentaires] = useState<Record<string, string>>({});
  const mission = useQuery({ queryKey: ['mission', missionId], queryFn: async () => (await api.get<Mission>(`/api/missions/${missionId}`)).data });
  const profils = useQuery({ queryKey: ['shortlist', missionId], queryFn: async () => (await api.get<ProfilPresente[]>(`/api/shortlists/mission/${missionId}`)).data });
  const avis = useMutation({
    mutationFn: ({ id, valeur }: { id: string; valeur: AvisClient }) => api.post(`/api/candidatures/${id}/avis`, { avis: valeur, commentaire: commentaires[id] || undefined }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['shortlist', missionId] }); void qc.invalidateQueries({ queryKey: ['selection'] }); },
  });

  const donnes = profils.data?.filter((p) => p.avisClient).length ?? 0;
  const total = profils.data?.length ?? 0;
  const premier = profils.data?.map((p) => p.presenteLe).filter(Boolean).sort()[0];

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="crumbs"><Link to="/entreprise">Mes recrutements</Link><span>/</span><span>{premier ? `Shortlist reçue le ${dateCourte(premier)}` : 'Shortlist'}</span></div>
          <h1>{mission.data?.intitule}</h1>
          <div className="sub">Profils pré-sélectionnés par votre recruteur. Donnez votre avis sur chacun.</div>
        </div>
        <div className="card row" style={{ alignItems: 'center', gap: 14, padding: '12px 18px', borderRadius: 999 }}>
          <span className="muted small">Avis donnés</span>
          <b style={{ fontSize: 22, fontWeight: 500 }}>{donnes} / {total}</b>
          <span style={{ display: 'flex', gap: 4 }} aria-hidden="true">
            {profils.data?.map((p) => <span key={p.candidatureId} style={{ width: 10, height: 10, borderRadius: '50%', background: p.avisClient ? 'var(--accent)' : 'var(--line)' }} />)}
          </span>
        </div>
      </section>
      {avis.error && <Erreur message={messageErreur(avis.error)} />}
      {profils.isLoading && <Chargement />}
      {profils.data?.length === 0 && <Vide>Aucun profil ne vous a encore été présenté pour cette mission.</Vide>}

      <div className="grid-3">
        {profils.data?.map((p, i) => (
          <article key={p.candidatureId} className="card stack" style={{ gap: 14 }}>
            <div className="card-head" style={{ margin: 0 }}>
              <span className={`avatar ${teinte(i)}`} style={{ width: 56, height: 56, flexBasis: 56, fontSize: 18 }} aria-hidden="true">{initiales(p.candidatNom)}</span>
              <Pill tone={toneAvis(p.avisClient)}>{p.avisClient ? libelleAvis[p.avisClient] : 'En attente'}</Pill>
            </div>
            <div>
              <h2 style={{ fontSize: 22 }}>{p.candidatNom}</h2>
              <div className="muted">{p.candidatTitre} · {p.candidatExperience} ans</div>
            </div>
            <Tags items={p.competences} />
            {p.synthese && (
              <div className="box small" style={{ lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <b style={{ fontWeight: 600 }}>Avis du recruteur</b>{p.noteGlobale ? <span>{p.noteGlobale} / 5</span> : null}
                </div>
                {p.synthese}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, fontSize: 13 }}>
              <div><div className="muted small">Dispo</div><b style={{ fontWeight: 600 }}>{p.candidatDisponibilite ?? '—'}</b></div>
              <div><div className="muted small">Prétentions</div><b style={{ fontWeight: 600 }}>{p.candidatPretention != null ? `${kmad(p.candidatPretention)} k MAD` : '—'}</b></div>
              <div><div className="muted small">Ville</div><b style={{ fontWeight: 600 }}>{p.candidatVille ?? '—'}</b></div>
            </div>
            {p.etape === 'PRESENTE' && !p.avisClient && (
              <>
                <label className="field">Commentaire (facultatif)
                  <input value={commentaires[p.candidatureId] ?? ''} onChange={(e) => setCommentaires({ ...commentaires, [p.candidatureId]: e.target.value })} />
                </label>
                <div role="group" aria-label="Votre décision" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  <button className="btn small" onClick={() => avis.mutate({ id: p.candidatureId, valeur: 'RETENU' })}>Retenir</button>
                  <button className="btn small accent" onClick={() => avis.mutate({ id: p.candidatureId, valeur: 'A_RENCONTRER' })}>À rencontrer</button>
                  <button className="btn small danger" onClick={() => avis.mutate({ id: p.candidatureId, valeur: 'REFUSE' })}>Refuser</button>
                </div>
              </>
            )}
            {p.avisClient && p.avisClient !== 'REFUSE' && p.etape === 'PRESENTE' && (
              <Link className="btn primary" to={`/entreprise/entretiens/planifier?candidature=${p.candidatureId}&nom=${encodeURIComponent(p.candidatNom)}&mission=${encodeURIComponent(p.missionIntitule)}`}>Proposer un entretien</Link>
            )}
            {p.etape !== 'PRESENTE' && p.etape !== 'REFUSE' && <Pill tone="info">{p.etapeLibelle}</Pill>}
            <div className="muted small">Présenté le {dateFr(p.presenteLe)}</div>
          </article>
        ))}
      </div>
    </main>
  );
}

