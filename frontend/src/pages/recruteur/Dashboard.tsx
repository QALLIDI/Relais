import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../../api/client';
import { dateFr, kmad, libelleAvis, libelleStatutMission } from '../../api/format';
import { useReunions } from '../../api/reunions';
import type { Candidature, FacturationStats, Groupe, Mission, MissionResume, SelectionStats, VivierStats } from '../../api/types';
import { Batons, Chargement, Icone, Kpi, Pill, toneAvis, toneMission, Vide } from '../../components/ui';

const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const memeJour = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const COULEURS_SOURCES = ['var(--accent)', 'var(--ink)', '#F3B08C', '#C9C9C4'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const selection = useQuery({ queryKey: ['selection', 'stats'], queryFn: async () => (await api.get<SelectionStats>('/api/selection/stats')).data });
  const reunions = useReunions();
  const factu = useQuery({ queryKey: ['facturation', 'stats'], queryFn: async () => (await api.get<FacturationStats>('/api/facturation/stats')).data });
  const vivier = useQuery({ queryKey: ['candidats', 'stats'], queryFn: async () => (await api.get<VivierStats>('/api/candidats/stats')).data });
  const villes = useQuery({ queryKey: ['groupes', 'ville'], queryFn: async () => (await api.get<Groupe[]>('/api/candidats/groupes', { params: { par: 'ville' } })).data });
  const enCours = useQuery({ queryKey: ['candidatures', 'en-cours'], queryFn: async () => (await api.get<Candidature[]>('/api/candidatures')).data });

  const ouvertes = missions.data?.filter((m) => m.statut === 'OUVERTE') ?? [];
  const aValider = missions.data?.filter((m) => m.statut === 'EN_VALIDATION') ?? [];
  const enProcess = resumes.data?.reduce((s, r) => s + r.enCours, 0) ?? 0;
  const parMission = new Map(resumes.data?.map((r) => [r.missionId, r]));
  const aPresenter = enCours.data?.filter((c) => c.etape === 'QUALIFIE' || c.etape === 'ENTRETIEN_RECRUTEUR').length ?? 0;
  const taux = selection.data?.tauxPresentesPlaces ?? 0;
  const sources = Object.entries(vivier.data?.parSource ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const ville = villes.data?.[0];

  const maintenant = new Date();
  // Réunions confirmées (agenda-service), à partir d'aujourd'hui.
  const aVenir = (reunions.data ?? []).flatMap((r) => (r.statut === 'CONFIRMEE' && r.debut ? [{ ...r, dateHeure: r.debut }] : []))
    .filter((e) => new Date(e.dateHeure) >= new Date(maintenant.toDateString()))
    .sort((a, b) => a.dateHeure.localeCompare(b.dateHeure));
  const prochain = aVenir.find((e) => new Date(e.dateHeure) >= maintenant);
  const aujourdhui = aVenir.filter((e) => memeJour(new Date(e.dateHeure), maintenant));
  const semaine = Array.from({ length: 7 }, (_, i) => {
    const jour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i);
    return { jour, nombre: aVenir.filter((e) => memeJour(new Date(e.dateHeure), jour)).length };
  });
  const ca = (factu.data?.encaisseParMois ?? []).map((m) => ({ libelle: m.mois, valeur: Math.round(Number(m.montant) / 1000) }));

  // Jauge demi-cercle : 283 = longueur de l'arc de rayon 90.
  const angle = Math.PI * (1 - Math.min(taux, 100) / 100);

  return (
    <>
      <section className="header" style={{ alignItems: 'center' }}>
        <form role="search" style={{ flex: '1 1 420px', display: 'flex', alignItems: 'center', gap: 12 }}
          onSubmit={(e) => { e.preventDefault(); navigate(`/recruteur/vivier${recherche.trim() ? `?q=${encodeURIComponent(recherche.trim())}` : ''}`); }}>
          <label htmlFor="recherche" className="sr-only">Rechercher un profil</label>
          <input id="recherche" className="input big-search" type="search" placeholder="Rechercher un profil…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          <button type="submit" className="ico" aria-label="Lancer la recherche"><Icone nom="loupe" /></button>
        </form>
        <div className="kpis">
          <Kpi label="Missions ouvertes" value={ouvertes.length} note={aValider.length ? `${aValider.length} à valider` : undefined} tone={aValider.length ? 'warn' : undefined} />
          <Kpi label="Candidats en process" value={enProcess} note={selection.data?.retoursEnAttente ? `${selection.data.retoursEnAttente} retours attendus` : undefined} tone="ok" />
          <Kpi label="Factures en retard" value={factu.data?.enRetard ? `${kmad(factu.data.enRetard)} k` : '0'} note={factu.data?.enRetard ? 'à relancer' : undefined} tone={factu.data?.enRetard ? 'bad' : undefined} />
        </div>
      </section>

      <div className="grid-auto">
        <section className="card span-2 stack" style={{ gap: 14, minHeight: 250 }}>
          <div className="card-head" style={{ margin: 0 }}>
            <h2>Conversion du pipeline</h2>
            <Link to="/recruteur/statistiques" className="ico" aria-label="Voir les statistiques"><Icone nom="fleche" taille={16} /></Link>
          </div>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="muted small">Présentés devenus placés</div>
              <div style={{ fontSize: 48, fontWeight: 500 }}>{taux} %</div>
              <div className="muted small">{selection.data?.placements ?? 0} placement(s) au total</div>
            </div>
            <svg width="220" height="120" viewBox="0 0 220 120" role="img" aria-label={`Jauge : ${taux} % de conversion`}>
              <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="var(--line)" strokeWidth="26" />
              <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="var(--accent)" strokeWidth="26" strokeDasharray="283" strokeDashoffset={283 * (1 - Math.min(taux, 100) / 100)} />
              <path d={`M110 110 L${110 + 62 * Math.cos(angle)} ${110 - 62 * Math.sin(angle)}`} stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
              <circle cx="110" cy="110" r="8" fill="var(--ink)" />
            </svg>
          </div>
          <div className="chips" aria-label="Origine des profils du vivier">
            {sources.map(([s, v], i) => (
              <span key={s} className="chip"><span className="dot" style={{ background: COULEURS_SOURCES[i] }} />{s} <b>{v}</b></span>
            ))}
          </div>
        </section>

        <section className="card accent" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, minHeight: 250 }}>
          <h2 style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.15 }}>Profils à<br />présenter</h2>
          <Link to="/recruteur/missions" className="btn light small" style={{ alignSelf: 'flex-start' }}>Composer une shortlist</Link>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <span className="big">{aPresenter}</span>
            <span className="small" style={{ paddingBottom: 8 }}>profils qualifiés<br />en attente</span>
          </div>
        </section>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12, minHeight: 250 }}>
          <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
            <h2 style={{ lineHeight: 1.2 }}>Prochain<br />entretien</h2>
            <Link to="/recruteur/agenda/planifier" className="ico" aria-label="Planifier une réunion"><Icone nom="plus" taille={16} /></Link>
          </div>
          {prochain ? (
            <div className="box stack" style={{ gap: 6 }}>
              <span className="pill neutral" style={{ alignSelf: 'flex-start', background: 'var(--surface)', fontWeight: 400 }}>
                {memeJour(new Date(prochain.dateHeure), maintenant) ? "Aujourd'hui" : jourCourt.format(new Date(prochain.dateHeure))} · {heure.format(new Date(prochain.dateHeure))}
              </span>
              <div style={{ fontWeight: 600 }}>{prochain.candidatNom}{prochain.nature === 'ENTRETIEN_CLIENT' ? ` × ${prochain.entrepriseNom}` : ''}</div>
              <div className="muted small">{prochain.missionIntitule} · {prochain.type === 'PRESENTIEL' ? prochain.lieu ?? 'sur site' : prochain.typeLibelle}</div>
            </div>
          ) : <Vide>Aucun entretien planifié.</Vide>}
        </section>

        <section className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12, minHeight: 250 }}>
          <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
            <h2 style={{ lineHeight: 1.2 }}>Vivier par<br />ville</h2>
            <Link to="/recruteur/profils" className="ico" aria-label="Voir les profils regroupés"><Icone nom="fleche" taille={16} /></Link>
          </div>
          {ville ? (
            <Link to="/recruteur/profils" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', borderRadius: 999, padding: '6px 6px 6px 8px', boxShadow: 'var(--shadow)', textDecoration: 'none' }}>
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)' }} aria-hidden="true" />
              <span style={{ fontSize: 30, fontWeight: 500 }}>{ville.nombre}</span>
              <span className="muted" style={{ fontSize: 11, lineHeight: 1.2, flex: 1 }}>profils à<br />{ville.libelle}</span>
            </Link>
          ) : <Vide>Vivier vide.</Vide>}
          <div className="muted small">{vivier.data ? `${vivier.data.total} profils · ${vivier.data.ajoutesCeMois} ajoutés ce mois` : ''}</div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Chiffre d'affaires encaissé</h2>
            <span className="pill neutral" style={{ fontWeight: 400, padding: '8px 14px', fontSize: 13 }}>6 derniers mois</span>
          </div>
          {ca.length ? <Batons donnees={ca} unite="k" label="Chiffre d'affaires mensuel en milliers de MAD" /> : <Vide>Aucun encaissement.</Vide>}
        </section>

        <section className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: 300 }}>
          <div className="card-head">
            <Link to="/recruteur/agenda" style={{ textDecoration: 'none' }}><h2>Entretiens de la semaine</h2></Link>
            <span className="pill neutral" style={{ fontWeight: 400, padding: '8px 14px', fontSize: 13 }}>{aVenir.length} à venir</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, textAlign: 'center' }}>
            {semaine.map(({ jour, nombre }, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }} title={`${jourCourt.format(jour)} : ${nombre} entretien(s)`}>
                <span className={i === 0 ? 'pill dark' : 'muted small'} style={{ padding: '6px 10px', fontWeight: 400, fontSize: 12 }}>{jourCourt.format(jour)}</span>
                <span style={{ width: 46, height: 46, maxWidth: '100%', borderRadius: '50%', background: nombre > 1 ? 'var(--accent)' : nombre === 1 ? 'var(--accent-soft)' : 'transparent', border: nombre ? 0 : '1px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: nombre > 1 ? '#fff' : 'var(--accent-ink)' }}>
                  {nombre || ''}
                </span>
              </div>
            ))}
          </div>
          {aujourdhui.length > 0 && (
            <div className="card night stack" style={{ position: 'absolute', right: 22, bottom: 18, width: 240, padding: 16, gap: 10, boxShadow: 'var(--shadow)' }}>
              <div style={{ fontSize: 17, lineHeight: 1.2 }}>Entretiens<br />d'aujourd'hui</div>
              {aujourdhui.slice(0, 2).map((e) => (
                <div key={e.id} className="stack" style={{ gap: 6 }}>
                  <div className="chips">
                    <span className="pill" style={{ background: 'var(--accent-strong)', color: '#fff', fontWeight: 400 }}>{e.candidatNom}</span>
                    <span className="pill veil">{heure.format(new Date(e.dateHeure))}</span>
                  </div>
                  <div className="small" style={{ opacity: 0.8 }}>{e.missionIntitule}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Missions en cours</h2>
            <Link to="/recruteur/missions" className="btn small">Voir toutes</Link>
          </div>
          {missions.isLoading && <Chargement />}
          {[...aValider, ...ouvertes].slice(0, 6).map((m) => (
            <Link key={m.id} to={`/recruteur/missions/${m.id}`} className="tile" style={{ textDecoration: 'none' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{m.intitule}</div>
                <div className="muted small">{m.entrepriseNom} · {parMission.get(m.id)?.sources ?? 0} sourcés · {parMission.get(m.id)?.presentes ?? 0} présentés · échéance {dateFr(m.dateLimite)}</div>
              </div>
              <Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill>
            </Link>
          ))}
        </section>
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
      </div>
    </>
  );
}
