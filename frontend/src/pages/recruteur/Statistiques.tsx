import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { kmad, n } from '../../api/format';
import type { FacturationStats, MissionStats, SelectionStats, VivierStats } from '../../api/types';
import { Barre, Batons, Indicateur, TetePage, Vide } from '../../components/ui';

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
  const clients = factu.data?.parClient ?? [];
  const tiret = (v?: number | null) => (v == null ? '—' : v);

  return (
    <>
      <TetePage titre="Statistiques" sous="Toutes périodes confondues, sauf mention contraire." />

      <section className="indicateurs" aria-label="Indicateurs clés">
        <Indicateur label="Placements" valeur={tiret(selection.data?.placements)} note={`${tiret(factu.data?.placements)} facturé(s)`} ton="vert" />
        <Indicateur label="Délai moyen de placement" valeur={tiret(selection.data?.delaiMoyenPlacementJours)} unite="jours"
          note={`shortlist en ${tiret(selection.data?.delaiMoyenShortlistJours)} j en moyenne`} ton="lavande" />
        <Indicateur label="Présentés → placés" valeur={tiret(selection.data?.tauxPresentesPlaces)} unite="%" note="taux de transformation" />
        <Indicateur label="CA encaissé" coin="6 mois" valeur={n(totalCa)} unite="k MAD" note="hors taxes" tendance={ca.map((m) => m.valeur)} ton="ambre" />
      </section>

      <div className="grid-2">
        <section className="bloc" aria-labelledby="st-ca">
          <div className="bloc-tete"><h2 id="st-ca">Chiffre d'affaires encaissé</h2><span className="lien-discret">k MAD HT · par mois</span></div>
          <div className="bloc-corps">
            {ca.length ? <Batons donnees={ca} unite="k" label="CA encaissé par mois en milliers de MAD" /> : <Vide>Aucun encaissement.</Vide>}
          </div>
        </section>

        <section className="bloc" aria-labelledby="st-entonnoir">
          <div className="bloc-tete">
            <h2 id="st-entonnoir">Entonnoir de présélection</h2>
            <span className="pill info">{selection.data?.tauxPresentesPlaces ?? 0} % des présentés placés</span>
          </div>
          <div className="bloc-corps st-entonnoir">
            {entonnoir.length === 0 && <Vide>Aucune candidature pour l'instant.</Vide>}
            {entonnoir.map((e, i) => {
              const precedent = entonnoir[i - 1];
              const conv = precedent && precedent.nombre > 0 ? Math.round((e.nombre / precedent.nombre) * 100) : null;
              return (
                <div key={e.etape} className="st-etape" title={`${e.libelle} : ${e.nombre} candidat(s)`}>
                  <span className="lib">{e.libelle}</span>
                  <div className="barre"><div style={{ width: `${premier ? Math.round((e.nombre / premier) * 100) : 0}%`, background: i === entonnoir.length - 1 ? 'var(--accent-strong)' : 'var(--accent)' }} /></div>
                  <b className="mono">{e.nombre}</b>
                  <span className="conv">{conv != null ? `${conv} %` : ''}</span>
                </div>
              );
            })}
            {entonnoir.length > 0 && <p className="st-note">Candidats ayant atteint chaque étape ; à droite, la part passée depuis l'étape précédente.</p>}
          </div>
        </section>
      </div>

      <div className="grid-3">
        <section className="bloc" aria-labelledby="st-clients">
          <div className="bloc-tete"><h2 id="st-clients">Placements et CA par client</h2></div>
          {clients.length === 0 ? <div className="bloc-corps"><Vide>Aucun placement facturé.</Vide></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Client</th><th className="num">Placés</th><th className="num">Facturé (k MAD)</th></tr></thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.entreprise}><td>{c.entreprise}</td><td className="num">{c.placements}</td><td className="num">{kmad(Number(c.montantHt))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="bloc" aria-labelledby="st-sources">
          <div className="bloc-tete">
            <h2 id="st-sources">Origine des profils</h2>
            <span className="lien-discret">{vivier.data?.total ?? 0} profils · +{vivier.data?.ajoutesCeMois ?? 0} ce mois</span>
          </div>
          <div className="bloc-corps st-barres">
            {sources.length === 0 ? <Vide>Aucun profil.</Vide> : sources.map(([s, v]) => <Barre key={s} label={s} valeur={v} max={maxSource} />)}
          </div>
        </section>
        <section className="bloc" aria-labelledby="st-comp">
          <div className="bloc-tete">
            <h2 id="st-comp">Compétences les plus demandées</h2>
            <span className="lien-discret">en nombre de missions</span>
          </div>
          <div className="bloc-corps st-barres">
            {competences.length === 0 ? <Vide>Aucune mission.</Vide> : competences.map((c) => <Barre key={c.competence} label={c.competence} valeur={c.missions} max={maxComp} />)}
          </div>
        </section>
      </div>
    </>
  );
}
