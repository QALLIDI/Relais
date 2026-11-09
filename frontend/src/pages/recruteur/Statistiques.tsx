import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { kmad, n } from '../../api/format';
import type { FacturationStats, MissionStats, SelectionStats, VivierStats } from '../../api/types';
import { Barre, Batons, Kpi, Vide } from '../../components/ui';

export default function Statistiques() {
  const selection = useQuery({ queryKey: ['selection', 'stats'], queryFn: async () => (await api.get<SelectionStats>('/api/selection/stats')).data });
  const factu = useQuery({ queryKey: ['facturation', 'stats'], queryFn: async () => (await api.get<FacturationStats>('/api/facturation/stats')).data });
  const vivier = useQuery({ queryKey: ['candidats', 'stats'], queryFn: async () => (await api.get<VivierStats>('/api/candidats/stats')).data });
  const missions = useQuery({ queryKey: ['missions', 'stats'], queryFn: async () => (await api.get<MissionStats>('/api/missions/stats')).data });

  const entonnoir = selection.data?.entonnoir ?? [];
  const premier = entonnoir[0]?.nombre ?? 0;
  const ca = (factu.data?.encaisseParMois ?? []).map((m) => ({ libelle: m.mois, valeur: Math.round(Number(m.montant) / 1000) }));
  const totalCa = ca.reduce((s, m) => s + m.valeur, 0);
  const sources = Object.entries(vivier.data?.parSource ?? {}).sort((a, b) => b[1] - a[1]);
  const maxSource = Math.max(1, ...sources.map(([, v]) => v));
  const competences = missions.data?.competencesDemandees ?? [];
  const maxComp = Math.max(1, ...competences.map((c) => c.missions));

  return (
    <>
      <section className="header">
        <div>
          <h1>Statistiques</h1>
          <div className="sub">Toutes périodes confondues, sauf mention contraire</div>
        </div>
        <div className="kpis">
          <Kpi label="Placements" value={selection.data?.placements ?? '—'} />
          <Kpi label="Délai moyen de placement" value={selection.data?.delaiMoyenPlacementJours ?? '—'} unit="jours" />
          <Kpi label="Présentés → placés" value={selection.data?.tauxPresentesPlaces ?? '—'} unit="%" />
          <Kpi label="CA encaissé sur 6 mois" value={n(totalCa)} unit="k MAD" />
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Chiffre d'affaires encaissé</h2>
            <span className="muted small">k MAD HT · total {n(totalCa)}</span>
          </div>
          {ca.length ? <Batons donnees={ca} unite="k" label="CA encaissé par mois en milliers de MAD" /> : <Vide>Aucun encaissement.</Vide>}
        </section>

        <section className="card stack" style={{ gap: 14 }}>
          <div className="card-head" style={{ margin: 0 }}>
            <h2>Entonnoir de pré-sélection</h2>
            <span className="pill info">{selection.data?.tauxPresentesPlaces ?? 0} % des présentés placés</span>
          </div>
          {entonnoir.map((e, i) => {
            const precedent = entonnoir[i - 1];
            const conv = precedent && precedent.nombre > 0 ? Math.round((e.nombre / precedent.nombre) * 100) : null;
            return (
              <div key={e.etape} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 150px) 1fr 36px 48px', gap: 12, alignItems: 'center', fontSize: 14 }}
                title={`${e.libelle} : ${e.nombre} candidat(s)`}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.libelle}</span>
                <div className="barre" style={{ height: 22 }}>
                  <div style={{ width: `${premier ? Math.round((e.nombre / premier) * 100) : 0}%`, background: i === entonnoir.length - 1 ? 'var(--accent-strong)' : 'var(--accent)' }} />
                </div>
                <b className="mono" style={{ textAlign: 'right' }}>{e.nombre}</b>
                <span className="muted small" style={{ textAlign: 'right' }}>{conv != null ? `${conv} %` : ''}</span>
              </div>
            );
          })}
          <div className="muted small">Candidats ayant atteint chaque étape ; à droite, la part passée depuis l'étape précédente.</div>
        </section>
      </div>

      <div className="grid-3">
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Placements et CA par client</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th className="num">Placés</th><th className="num">Facturé (k MAD)</th></tr></thead>
              <tbody>
                {factu.data?.parClient.map((c) => (
                  <tr key={c.entreprise}><td>{c.entreprise}</td><td className="num">{c.placements}</td><td className="num">{kmad(Number(c.montantHt))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card stack" style={{ gap: 12 }}>
          <div>
            <h2>Origine des profils</h2>
            <div className="muted small">{vivier.data?.total ?? 0} profils · {vivier.data?.ajoutesCeMois ?? 0} ajoutés ce mois</div>
          </div>
          {sources.map(([s, v]) => <Barre key={s} label={s} valeur={v} max={maxSource} />)}
        </section>
        <section className="card stack" style={{ gap: 12 }}>
          <div>
            <h2>Compétences les plus demandées</h2>
            <div className="muted small">nombre de missions qui les exigent · shortlist en {selection.data?.delaiMoyenShortlistJours ?? '—'} j en moyenne</div>
          </div>
          {competences.map((c) => <Barre key={c.competence} label={c.competence} valeur={c.missions} max={maxComp} />)}
        </section>
      </div>
    </>
  );
}
