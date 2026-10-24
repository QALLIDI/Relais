import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { dateFr, dateHeureFr, libelleAvis, libelleStatutMission, mad } from '../../api/format';
import type { Entretien, FacturationStats, Mission, MissionResume, SelectionStats } from '../../api/types';
import { Chargement, Kpi, Pill, toneAvis, toneMission, Vide } from '../../components/ui';

export default function Dashboard() {
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const selection = useQuery({ queryKey: ['selection', 'stats'], queryFn: async () => (await api.get<SelectionStats>('/api/selection/stats')).data });
  const entretiens = useQuery({ queryKey: ['entretiens'], queryFn: async () => (await api.get<Entretien[]>('/api/entretiens')).data });
  const factu = useQuery({ queryKey: ['facturation', 'stats'], queryFn: async () => (await api.get<FacturationStats>('/api/facturation/stats')).data });

  const ouvertes = missions.data?.filter((m) => m.statut === 'OUVERTE') ?? [];
  const aValider = missions.data?.filter((m) => m.statut === 'EN_VALIDATION') ?? [];
  const enProcess = resumes.data?.reduce((s, r) => s + r.enCours, 0) ?? 0;
  const parMission = new Map(resumes.data?.map((r) => [r.missionId, r]));
  const aujourdhui = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return (
    <>
      <header className="header">
        <div>
          <div className="muted" style={{ textTransform: 'capitalize' }}>{aujourdhui}</div>
          <h1>Tableau de bord</h1>
        </div>
        <div className="actions">
          <Link className="btn" to="/recruteur/vivier/nouveau">Ajouter un candidat</Link>
          <Link className="btn primary" to="/recruteur/missions/nouvelle">Nouvelle mission</Link>
        </div>
      </header>

      <section className="grid-auto" aria-label="Indicateurs">
        <Kpi label="Missions ouvertes" value={ouvertes.length} note={aValider.length ? `${aValider.length} besoin(s) client à valider` : 'Aucun besoin en attente'} tone={aValider.length ? 'warn' : undefined} />
        <Kpi label="Candidats en process" value={enProcess} note={`${selection.data?.retoursEnAttente ?? 0} en attente de retour client`} />
        <Kpi label="Entretiens à venir" value={entretiens.data?.length ?? '—'} />
        <Kpi label="Factures en retard" value={mad(factu.data?.enRetard)} tone={factu.data?.enRetard ? 'bad' : undefined} note="montant HT à relancer" />
      </section>

      <section className="card">
        <div className="header" style={{ marginBottom: 12 }}>
          <h2>Missions en cours</h2>
          <Link to="/recruteur/missions">Voir toutes</Link>
        </div>
        {missions.isLoading && <Chargement />}
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Mission</th><th>Client</th><th className="num">Sourcés</th><th className="num">Présentés</th><th>Statut</th><th>Échéance</th></tr>
            </thead>
            <tbody>
              {[...aValider, ...ouvertes].map((m) => (
                <tr key={m.id}>
                  <td><Link to={`/recruteur/missions/${m.id}`} style={{ color: 'var(--ink)', fontWeight: 600 }}>{m.intitule}</Link></td>
                  <td>{m.entrepriseNom}</td>
                  <td className="num">{parMission.get(m.id)?.sources ?? 0}</td>
                  <td className="num">{parMission.get(m.id)?.presentes ?? 0}</td>
                  <td><Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill></td>
                  <td>{dateFr(m.dateLimite)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Retours clients reçus</h2>
          {selection.data?.derniersRetours.length === 0 && <Vide>Pas encore de retour client.</Vide>}
          {selection.data?.derniersRetours.map((r) => (
            <div key={r.id} className="list-item">
              <div>
                <div style={{ fontWeight: 600 }}>{r.candidatNom}</div>
                <div className="muted small">{r.missionIntitule} · {r.entrepriseNom}</div>
              </div>
              <Pill tone={toneAvis(r.avisClient)}>{libelleAvis[r.avisClient ?? '']}</Pill>
            </div>
          ))}
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Entretiens à venir</h2>
          {entretiens.data?.length === 0 && <Vide>Aucun entretien planifié.</Vide>}
          {entretiens.data?.slice(0, 6).map((e) => (
            <div key={e.id} className="list-item">
              <div>
                <div style={{ fontWeight: 600 }}>{e.candidatNom}{e.type === 'CLIENT' ? ` × ${e.entrepriseNom}` : ''}</div>
                <div className="muted small">{e.missionIntitule} · {e.lieu ?? 'Lieu à préciser'}</div>
              </div>
              <span className="small mono">{dateHeureFr(e.dateHeure)}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
