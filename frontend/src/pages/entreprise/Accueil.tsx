import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { dateFr, dateHeureFr, libelleStatutFacture, libelleStatutMission } from '../../api/format';
import type { Entreprise, Entretien, Facture, Mission, MissionResume } from '../../api/types';
import { Chargement, Kpi, Pill, Progression, toneFacture, toneMission, Vide } from '../../components/ui';

/** Étapes vues par le client : besoin validé, recherche, shortlist, entretiens, embauche. */
function etapeClient(m: Mission, r?: MissionResume): number {
  if (m.statut === 'EN_VALIDATION' || m.statut === 'BROUILLON') return 0;
  if (m.statut === 'POURVUE' || (r?.places ?? 0) > 0) return 5;
  if ((r?.presentes ?? 0) > 0) return r && r.aEvaluer > 0 ? 3 : 4;
  return 2;
}

export default function EntrepriseAccueil() {
  const entreprise = useQuery({ queryKey: ['entreprise', 'me'], queryFn: async () => (await api.get<Entreprise>('/api/entreprises/me')).data });
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const entretiens = useQuery({ queryKey: ['entretiens'], queryFn: async () => (await api.get<Entretien[]>('/api/entretiens')).data });
  const factures = useQuery({ queryKey: ['factures'], queryFn: async () => (await api.get<Facture[]>('/api/factures')).data });

  const parMission = new Map(resumes.data?.map((r) => [r.missionId, r]));
  const actives = missions.data?.filter((m) => ['OUVERTE', 'EN_VALIDATION', 'EN_PAUSE'].includes(m.statut)) ?? [];
  const aEvaluer = resumes.data?.reduce((s, r) => s + r.aEvaluer, 0) ?? 0;
  const pourvus = resumes.data?.reduce((s, r) => s + r.places, 0) ?? 0;

  return (
    <main className="page">
      <header className="header">
        <div>
          <div className="muted">{entreprise.data?.raisonSociale}</div>
          <h1>Mes recrutements</h1>
        </div>
        <Link className="btn primary" to="/entreprise/besoin">Exprimer un besoin</Link>
      </header>

      <section className="grid-auto" aria-label="Indicateurs">
        <Kpi label="Postes ouverts" value={missions.data?.filter((m) => m.statut === 'OUVERTE').length ?? '—'} note={`${missions.data?.filter((m) => m.statut === 'EN_VALIDATION').length ?? 0} en validation`} />
        <Kpi label="Profils à évaluer" value={aEvaluer} tone={aEvaluer ? 'warn' : undefined} />
        <Kpi label="Entretiens à venir" value={entretiens.data?.length ?? '—'} />
        <Kpi label="Postes pourvus" value={pourvus} tone="ok" />
      </section>

      <section className="stack">
        <h2 style={{ fontSize: 18 }}>Missions en cours</h2>
        {missions.isLoading && <Chargement />}
        {actives.length === 0 && !missions.isLoading && <Vide>Aucune mission en cours. Exprimez un besoin pour lancer un recrutement.</Vide>}
        {actives.map((m) => {
          const r = parMission.get(m.id);
          const etape = etapeClient(m, r);
          return (
            <article key={m.id} className="card row" style={{ alignItems: 'center', gap: 20 }}>
              <div style={{ flex: '1 1 240px' }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{m.intitule}</div>
                <div className="muted">{[m.typeContrat, m.ville].filter(Boolean).join(' · ')} · créée le {dateFr(m.createdAt)}</div>
              </div>
              <div className="stack" style={{ flex: '2 1 360px', gap: 6 }}>
                <Progression etape={etape} total={5} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, fontSize: 11 }} className="muted">
                  <span>Besoin validé</span><span>Recherche</span><span>Shortlist</span><span>Entretiens</span><span>Embauche</span>
                </div>
              </div>
              {r && r.aEvaluer > 0 ? (
                <Link className="btn primary" to={`/entreprise/shortlist/${m.id}`}>Évaluer {r.aEvaluer} profil(s)</Link>
              ) : r && r.presentes > 0 ? (
                <Link className="btn" to={`/entreprise/shortlist/${m.id}`}>Voir les profils</Link>
              ) : (
                <Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill>
              )}
            </article>
          );
        })}
      </section>

      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Entretiens à venir</h2>
          {entretiens.data?.length === 0 && <Vide>Aucun entretien planifié.</Vide>}
          {entretiens.data?.map((e) => (
            <div key={e.id} className="list-item">
              <div><b>{e.candidatNom}</b> · {e.missionIntitule}<div className="muted small">{e.lieu} · {e.statut === 'CONFIRME' ? 'confirmé par le candidat' : 'en attente de confirmation'}</div></div>
              <span className="mono small">{dateHeureFr(e.dateHeure)}</span>
            </div>
          ))}
        </section>
        <section className="card">
          <h2 style={{ marginBottom: 8 }}>Factures</h2>
          {factures.data?.length === 0 && <Vide>Aucune facture.</Vide>}
          {factures.data?.slice(0, 4).map((f) => (
            <div key={f.id} className="list-item"><span>{f.objet}</span><Pill tone={toneFacture(f.statut)}>{libelleStatutFacture[f.statut]}</Pill></div>
          ))}
          <Link to="/entreprise/factures" className="small" style={{ fontWeight: 600 }}>Voir toutes les factures</Link>
        </section>
      </div>
    </main>
  );
}
