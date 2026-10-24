import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import { kmad, n } from '../../api/format';
import type { FacturationStats, MissionStats, SelectionStats, VivierStats } from '../../api/types';
import { Barre, Kpi } from '../../components/ui';

export default function Statistiques() {
  const selection = useQuery({ queryKey: ['selection', 'stats'], queryFn: async () => (await api.get<SelectionStats>('/api/selection/stats')).data });
  const factu = useQuery({ queryKey: ['facturation', 'stats'], queryFn: async () => (await api.get<FacturationStats>('/api/facturation/stats')).data });
  const vivier = useQuery({ queryKey: ['candidats', 'stats'], queryFn: async () => (await api.get<VivierStats>('/api/candidats/stats')).data });
  const missions = useQuery({ queryKey: ['missions', 'stats'], queryFn: async () => (await api.get<MissionStats>('/api/missions/stats')).data });

  const entonnoir = selection.data?.entonnoir ?? [];
  const premier = entonnoir[0]?.nombre ?? 0;
  const ca = (factu.data?.encaisseParMois ?? []).map((m) => ({ mois: m.mois, k: Math.round(Number(m.montant) / 1000) }));
  const totalCa = ca.reduce((s, m) => s + m.k, 0);
  const sources = Object.entries(vivier.data?.parSource ?? {}).sort((a, b) => b[1] - a[1]);
  const maxSource = Math.max(1, ...sources.map(([, v]) => v));
  const competences = missions.data?.competencesDemandees ?? [];
  const maxComp = Math.max(1, ...competences.map((c) => c.missions));

  return (
    <>
      <header className="header">
        <div>
          <h1>Statistiques</h1>
          <div className="muted">Toutes périodes confondues, sauf mention contraire</div>
        </div>
      </header>

      <section className="grid-auto" aria-label="Indicateurs clés">
        <Kpi label="Placements" value={selection.data?.placements ?? '—'} />
        <Kpi label="Délai moyen de placement" value={selection.data?.delaiMoyenPlacementJours ?? '—'} unit="jours" />
        <Kpi label="Présentés → placés" value={selection.data?.tauxPresentesPlaces ?? '—'} unit="%" />
        <Kpi label="CA encaissé sur 6 mois" value={n(totalCa)} unit="k MAD" />
        <Kpi label="Délai moyen jusqu'à la shortlist" value={selection.data?.delaiMoyenShortlistJours ?? '—'} unit="jours" />
        <Kpi label="Profils ajoutés ce mois" value={vivier.data?.ajoutesCeMois ?? '—'} note={`${vivier.data?.total ?? 0} profils dans le vivier`} />
      </section>

      <div className="grid-2">
        <section className="card stack">
          <div>
            <h2>Chiffre d'affaires encaissé par mois</h2>
            <div className="muted small">en milliers de MAD HT · total {n(totalCa)}</div>
          </div>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={ca} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#ecece7" />
                <XAxis dataKey="mois" tickLine={false} axisLine={{ stroke: '#b8b8b1' }} tick={{ fontSize: 12, fill: '#5b5f66' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#5b5f66' }} />
                <Tooltip formatter={(v) => [`${v} k MAD`, 'Encaissé']} cursor={{ fill: '#f1f1ec' }} />
                <Bar dataKey="k" fill="#0b6b66" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card stack">
          <div>
            <h2>Entonnoir de pré-sélection</h2>
            <div className="muted small">candidats ayant atteint chaque étape · {selection.data?.tauxPresentesPlaces ?? 0} % des présentés sont placés</div>
          </div>
          {entonnoir.map((e, i) => {
            const suivant = entonnoir[i + 1];
            return (
              <div key={e.etape} className="stack" style={{ gap: 2 }}>
                <Barre label={e.libelle} valeur={e.nombre} max={premier} />
                {suivant && e.nombre > 0 && (
                  <div className="muted" style={{ fontSize: 11, paddingLeft: 182 }}>↓ {Math.round((suivant.nombre / e.nombre) * 100)} % passent à l'étape suivante</div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2 style={{ marginBottom: 12 }}>Placements et CA par client</h2>
          <table>
            <thead><tr><th>Client</th><th className="num">Placés</th><th className="num">Facturé (k MAD)</th></tr></thead>
            <tbody>
              {factu.data?.parClient.map((c) => (
                <tr key={c.entreprise}><td>{c.entreprise}</td><td className="num">{c.placements}</td><td className="num">{kmad(Number(c.montantHt))}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card stack" style={{ gap: 10 }}>
          <h2>Origine des profils du vivier</h2>
          {sources.map(([s, v]) => <Barre key={s} label={s} valeur={v} max={maxSource} />)}
        </section>
        <section className="card stack" style={{ gap: 10 }}>
          <div>
            <h2>Compétences les plus demandées</h2>
            <div className="muted small">nombre de missions qui les exigent</div>
          </div>
          {competences.map((c) => <Barre key={c.competence} label={c.competence} valeur={c.missions} max={maxComp} />)}
        </section>
      </div>
    </>
  );
}
