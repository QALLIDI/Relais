import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateFr, libelleAvis, mad } from '../../api/format';
import type { AvisClient, Mission, ProfilPresente } from '../../api/types';
import { Chargement, Erreur, Modal, Pill, Tags, toneAvis, Vide } from '../../components/ui';

export default function Shortlist() {
  const { missionId = '' } = useParams();
  const qc = useQueryClient();
  const [commentaires, setCommentaires] = useState<Record<string, string>>({});
  const [entretienPour, setEntretienPour] = useState<ProfilPresente | null>(null);
  const mission = useQuery({ queryKey: ['mission', missionId], queryFn: async () => (await api.get<Mission>(`/api/missions/${missionId}`)).data });
  const profils = useQuery({ queryKey: ['shortlist', missionId], queryFn: async () => (await api.get<ProfilPresente[]>(`/api/shortlists/mission/${missionId}`)).data });
  const avis = useMutation({
    mutationFn: ({ id, valeur }: { id: string; valeur: AvisClient }) => api.post(`/api/candidatures/${id}/avis`, { avis: valeur, commentaire: commentaires[id] || undefined }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['shortlist', missionId] }); void qc.invalidateQueries({ queryKey: ['selection'] }); },
  });

  const donnes = profils.data?.filter((p) => p.avisClient).length ?? 0;

  return (
    <main className="page">
      <div className="muted small"><Link to="/entreprise">Mes recrutements</Link> / {mission.data?.intitule}</div>
      <header className="header">
        <div>
          <h1>{mission.data?.intitule}</h1>
          <div className="muted">Profils pré-sélectionnés par votre recruteur. Donnez votre avis sur chacun.</div>
        </div>
        <div className="card" style={{ padding: '10px 14px' }}>Avis donnés : <b>{donnes} / {profils.data?.length ?? 0}</b></div>
      </header>
      {avis.error && <Erreur message={messageErreur(avis.error)} />}
      {profils.isLoading && <Chargement />}
      {profils.data?.length === 0 && <Vide>Aucun profil ne vous a encore été présenté pour cette mission.</Vide>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {profils.data?.map((p) => (
          <article key={p.candidatureId} className="card stack">
            <div className="header" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 18 }}>{p.candidatNom}</h2>
                <div className="muted">{p.candidatTitre} · {p.candidatExperience} ans</div>
              </div>
              <Pill tone={toneAvis(p.avisClient)}>{p.avisClient ? libelleAvis[p.avisClient] : 'En attente'}</Pill>
            </div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 14 }}>
              <dt className="muted">Disponibilité</dt><dd style={{ margin: 0 }}>{p.candidatDisponibilite ?? '—'}</dd>
              <dt className="muted">Prétentions</dt><dd style={{ margin: 0 }}>{mad(p.candidatPretention)} brut/an</dd>
              <dt className="muted">Localisation</dt><dd style={{ margin: 0 }}>{p.candidatVille ?? '—'}</dd>
              <dt className="muted">Présenté le</dt><dd style={{ margin: 0 }}>{dateFr(p.presenteLe)}</dd>
            </dl>
            <Tags items={p.competences} />
            {p.synthese && (
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, fontSize: 14, lineHeight: 1.5 }}>
                <div className="small" style={{ fontWeight: 600, color: 'var(--teal)', marginBottom: 4 }}>Avis du recruteur{p.noteGlobale ? ` · ${p.noteGlobale} / 5` : ''}</div>
                {p.synthese}
              </div>
            )}
            {p.etape === 'PRESENTE' && !p.avisClient && (
              <>
                <label className="field">Commentaire (facultatif)
                  <input value={commentaires[p.candidatureId] ?? ''} onChange={(e) => setCommentaires({ ...commentaires, [p.candidatureId]: e.target.value })} />
                </label>
                <div role="group" aria-label="Votre décision" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  <button className="btn" onClick={() => avis.mutate({ id: p.candidatureId, valeur: 'RETENU' })}>Retenir</button>
                  <button className="btn primary" onClick={() => avis.mutate({ id: p.candidatureId, valeur: 'A_RENCONTRER' })}>À rencontrer</button>
                  <button className="btn danger" onClick={() => avis.mutate({ id: p.candidatureId, valeur: 'REFUSE' })}>Refuser</button>
                </div>
              </>
            )}
            {p.avisClient && p.avisClient !== 'REFUSE' && p.etape === 'PRESENTE' && (
              <button className="btn primary" onClick={() => setEntretienPour(p)}>Proposer un entretien</button>
            )}
            {p.etape !== 'PRESENTE' && p.etape !== 'REFUSE' && <Pill tone="info">{p.etapeLibelle}</Pill>}
          </article>
        ))}
      </div>
      {entretienPour && (
        <ProposerEntretien profil={entretienPour} onClose={() => setEntretienPour(null)} onFait={() => { setEntretienPour(null); void qc.invalidateQueries({ queryKey: ['shortlist', missionId] }); void qc.invalidateQueries({ queryKey: ['entretiens'] }); }} />
      )}
    </main>
  );
}

function ProposerEntretien({ profil, onClose, onFait }: { profil: ProfilPresente; onClose: () => void; onFait: () => void }) {
  const [quand, setQuand] = useState('');
  const [lieu, setLieu] = useState('Sur site');
  const proposer = useMutation({
    mutationFn: () => api.post('/api/entretiens', { candidatureId: profil.candidatureId, dateHeure: new Date(quand).toISOString(), type: 'CLIENT', lieu }),
    onSuccess: onFait,
  });
  return (
    <Modal titre={`Entretien avec ${profil.candidatNom}`} onClose={onClose}>
      <label className="field">Date et heure<input type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} /></label>
      <label className="field">Lieu<input value={lieu} onChange={(e) => setLieu(e.target.value)} /></label>
      {proposer.error && <Erreur message={messageErreur(proposer.error)} />}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!quand || proposer.isPending} onClick={() => proposer.mutate()}>Proposer</button>
      </div>
    </Modal>
  );
}
