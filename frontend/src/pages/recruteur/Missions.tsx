import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateFr, libelleStatutMission } from '../../api/format';
import type { Mission, MissionResume, StatutMission } from '../../api/types';
import { Chargement, Erreur, Pill, Tags, toneMission } from '../../components/ui';

const FILTRES: (StatutMission | 'TOUTES')[] = ['TOUTES', 'EN_VALIDATION', 'OUVERTE', 'EN_PAUSE', 'POURVUE', 'ANNULEE'];

export default function Missions() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState<StatutMission | 'TOUTES'>('TOUTES');
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const statut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: StatutMission }) => api.patch(`/api/missions/${id}/statut`, { statut: s }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
  });
  const parMission = new Map(resumes.data?.map((r) => [r.missionId, r]));
  const liste = missions.data?.filter((m) => filtre === 'TOUTES' || m.statut === filtre) ?? [];

  return (
    <>
      <section className="header">
        <div>
          <h1>Missions</h1>
          <div className="sub">{missions.data ? `${liste.length} mission(s) affichée(s) sur ${missions.data.length}` : ''}</div>
        </div>
        <div className="actions">
          <div className="tabs" role="group" aria-label="Filtrer par statut">
            {FILTRES.map((f) => (
              <button key={f} className={`tab ${filtre === f ? 'on' : ''}`} aria-pressed={filtre === f} onClick={() => setFiltre(f)}>
                {f === 'TOUTES' ? 'Toutes' : libelleStatutMission[f]}
              </button>
            ))}
          </div>
          <Link className="btn accent" to="/recruteur/missions/nouvelle">Nouvelle mission</Link>
        </div>
      </section>
      {statut.error && <Erreur message={messageErreur(statut.error)} />}
      <section className="card">
        {missions.isLoading && <Chargement />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Mission</th><th>Client</th><th>Compétences</th><th className="num">Pipeline</th><th>Statut</th><th>Échéance</th><th /></tr>
            </thead>
            <tbody>
              {liste.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link to={`/recruteur/missions/${m.id}`} style={{ fontWeight: 600 }}>{m.intitule}</Link>
                    <div className="muted small">{[m.typeContrat, m.ville, m.teletravail].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td>{m.entrepriseNom}</td>
                  <td><Tags items={m.competencesRequises} /></td>
                  <td className="num">{parMission.get(m.id)?.enCours ?? 0}</td>
                  <td><Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill></td>
                  <td>{dateFr(m.dateLimite)}</td>
                  <td>
                    {m.statut === 'EN_VALIDATION' && (
                      <button className="btn small primary" onClick={() => statut.mutate({ id: m.id, s: 'OUVERTE' })}>Valider et ouvrir</button>
                    )}
                    {m.statut === 'OUVERTE' && (
                      <button className="btn small" onClick={() => statut.mutate({ id: m.id, s: 'EN_PAUSE' })}>Mettre en pause</button>
                    )}
                    {m.statut === 'EN_PAUSE' && (
                      <button className="btn small" onClick={() => statut.mutate({ id: m.id, s: 'OUVERTE' })}>Rouvrir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
