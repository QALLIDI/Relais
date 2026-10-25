import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api } from '../../api/client';
import { dateFr, initiales, libelleStatutFacture, libelleStatutMission, n } from '../../api/format';
import type { Entretien, Facture, Mission, MissionResume, ProfilPresente } from '../../api/types';

const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
import { Chargement, Kpi, Pill, Progression, toneFacture, toneMission, Vide } from '../../components/ui';

/** Étapes vues par le client : besoin validé, recherche, shortlist, entretiens, embauche. */
function etapeClient(m: Mission, r?: MissionResume): number {
  if (m.statut === 'EN_VALIDATION' || m.statut === 'BROUILLON') return 0;
  if (m.statut === 'POURVUE' || (r?.places ?? 0) > 0) return 5;
  if ((r?.presentes ?? 0) > 0) return r && r.aEvaluer > 0 ? 3 : 4;
  return 2;
}

export default function EntrepriseAccueil() {
  const auth = useAuth();
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const entretiens = useQuery({ queryKey: ['entretiens'], queryFn: async () => (await api.get<Entretien[]>('/api/entretiens')).data });
  const factures = useQuery({ queryKey: ['factures'], queryFn: async () => (await api.get<Facture[]>('/api/factures')).data });
  const aVoir = useQuery({ queryKey: ['shortlist', 'a-evaluer'], queryFn: async () => (await api.get<ProfilPresente[]>('/api/shortlists/a-evaluer')).data });

  const parMission = new Map(resumes.data?.map((r) => [r.missionId, r]));
  const actives = missions.data?.filter((m) => ['OUVERTE', 'EN_VALIDATION', 'EN_PAUSE'].includes(m.statut)) ?? [];
  const aEvaluer = resumes.data?.reduce((s, r) => s + r.aEvaluer, 0) ?? 0;
  const pourvus = resumes.data?.reduce((s, r) => s + r.places, 0) ?? 0;
  const prenom = auth.user?.profile.given_name ?? auth.user?.profile.name;

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="sub" style={{ marginTop: 0 }}>{prenom ? `Bonjour ${prenom}` : 'Bonjour'}</div>
          <h1>Mes recrutements</h1>
        </div>
        <div className="kpis">
          <Kpi label="Postes ouverts" value={missions.data?.filter((m) => m.statut === 'OUVERTE').length ?? '—'} />
          <Kpi label="Profils à évaluer" value={aEvaluer} note={aEvaluer ? 'en attente' : undefined} tone={aEvaluer ? 'warn' : undefined} />
          <Kpi label="Postes pourvus" value={pourvus} />
        </div>
      </section>

      {missions.isLoading && <Chargement />}
      {actives.length === 0 && !missions.isLoading && (
        <section className="card stack">
          <Vide>Aucune mission en cours. Exprimez un besoin pour lancer un recrutement.</Vide>
          <Link className="btn accent" to="/entreprise/besoin" style={{ alignSelf: 'flex-start' }}>Exprimer un besoin</Link>
        </section>
      )}
      <div className="grid-2">
        {actives.map((m) => {
          const r = parMission.get(m.id);
          const etape = etapeClient(m, r);
          if (r && r.aEvaluer > 0) {
            const visages = aVoir.data?.filter((c) => c.missionId === m.id).slice(0, 3) ?? [];
            return (
              <Link key={m.id} to={`/entreprise/shortlist/${m.id}`} className="card accent" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24, textDecoration: 'none', minHeight: 230 }}>
                <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                  <div>
                    <span className="pill veil">Shortlist reçue</span>
                    <div style={{ fontSize: 26, marginTop: 10, lineHeight: 1.15 }}>{m.intitule}</div>
                  </div>
                  <span className="btn light small">Évaluer les profils →</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex' }} aria-hidden="true">
                    {visages.map((c) => (
                      <span key={c.candidatureId} style={{ width: 44, height: 44, marginRight: -10, borderRadius: '50%', border: '2px solid #fff', background: '#fff', color: '#17181c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{initiales(c.candidatNom)}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                    <span className="big">{r.aEvaluer}</span>
                    <span className="small" style={{ paddingBottom: 8 }}>profil(s)<br />à évaluer</span>
                  </div>
                </div>
              </Link>
            );
          }
          return (
            <section key={m.id} className="card stack" style={{ gap: 14 }}>
              <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>{m.intitule}</h2>
                  <div className="muted small">{[m.typeContrat, m.ville].filter(Boolean).join(' · ')} · créée le {dateFr(m.createdAt)}</div>
                </div>
                <Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill>
              </div>
              <div className="muted small">
                {m.statut === 'EN_VALIDATION' ? 'Votre recruteur revient vers vous pour valider le besoin.' : r && r.presentes > 0 ? `${r.presentes} profil(s) présenté(s).` : 'La recherche de profils est en cours.'}
              </div>
              <Progression etape={Math.max(etape, 1)} total={5} enCours={etape < 5} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, fontSize: 11 }} className="muted">
                <span>Besoin validé</span><span>Recherche</span><span>Shortlist</span><span>Entretiens</span><span>Embauche</span>
              </div>
              {r && r.presentes > 0 && <Link className="btn small" to={`/entreprise/shortlist/${m.id}`} style={{ alignSelf: 'flex-start' }}>Voir les profils</Link>}
            </section>
          );
        })}
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Entretiens à venir</h2>
          {entretiens.data?.length === 0 && <Vide>Aucun entretien planifié.</Vide>}
          {entretiens.data?.map((e) => {
            const d = new Date(e.dateHeure);
            return (
              <div key={e.id} className="tile">
                <div className="box" style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--surface)' }}>
                  <div className="muted small" style={{ textTransform: 'capitalize' }}>{jour.format(d)}</div>
                  <div style={{ fontSize: 22, fontWeight: 500 }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{e.candidatNom} · {e.missionIntitule}</div>
                  <div className="muted small">{heure.format(d)} · {e.lieu ?? 'lieu à préciser'}</div>
                </div>
                <Pill tone={e.statut === 'CONFIRME' ? 'ok' : 'warn'}>{e.statut === 'CONFIRME' ? 'Confirmé' : 'À confirmer'}</Pill>
              </div>
            );
          })}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Factures</h2>
            <Link to="/entreprise/factures" className="btn small">Tout voir</Link>
          </div>
          {factures.data?.length === 0 && <Vide>Aucune facture.</Vide>}
          {factures.data?.slice(0, 4).map((f) => (
            <div key={f.id} className="tile">
              <span style={{ flex: '1 1 180px', minWidth: 0 }}>{f.objet}<span className="muted small" style={{ display: 'block' }}>{f.numero ?? 'Brouillon'}</span></span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{n(f.montantTtc)}</span>
              <Pill tone={toneFacture(f.statut)}>{libelleStatutFacture[f.statut]}</Pill>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
