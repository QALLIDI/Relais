import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { dateCourte, initiales } from '../../api/format';
import { plage, useReunions } from '../../api/reunions';
import type { Candidat, MaCandidature } from '../../api/types';
import { Chargement, Progression, Vide } from '../../components/ui';

function completude(c: Candidat): { pct: number; manque?: string } {
  const champs: [boolean, string][] = [
    [!!c.titre, 'votre titre'],
    [c.competences.length > 0, 'vos compétences'],
    [!!c.ville, 'votre ville'],
    [c.experiences.length > 0, 'vos expériences'],
    [!!c.langues, 'vos langues'],
    [c.cvDisponible, 'votre CV'],
    [c.pretentionSalaire != null, 'vos prétentions'],
  ];
  const ok = champs.filter(([v]) => v).length;
  return { pct: Math.round((ok / champs.length) * 100), manque: champs.find(([v]) => !v)?.[1] };
}

export default function CandidatAccueil() {
  const profil = useQuery({
    queryKey: ['candidat', 'me'],
    queryFn: async () => (await api.get<Candidat>('/api/candidats/me')).data,
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 404) && count < 1,
  });
  const candidatures = useQuery({ queryKey: ['candidatures', 'mes'], queryFn: async () => (await api.get<MaCandidature[]>('/api/candidatures/mes')).data });
  const reunions = useReunions();

  const pasDeProfil = axios.isAxiosError(profil.error) && profil.error.response?.status === 404;
  if (profil.isLoading) return <main className="page narrow"><Chargement /></main>;
  if (pasDeProfil) {
    return (
      <main className="page narrow">
        <div className="card stack">
          <h1 style={{ fontSize: 34 }}>Bienvenue</h1>
          <p className="muted">Créez votre profil pour que le cabinet puisse vous proposer des postes qui vous correspondent.</p>
          <Link className="btn accent" to="/candidat/profil" style={{ alignSelf: 'flex-start' }}>Créer mon profil</Link>
        </div>
      </main>
    );
  }
  const c = profil.data;
  const comp = c ? completude(c) : null;
  const aConfirmer = reunions.data?.filter((r) => r.statut === 'PROPOSEE') ?? [];
  const confirmees = reunions.data?.filter((r) => r.statut === 'CONFIRMEE' && r.fin && new Date(r.fin) >= new Date()) ?? [];
  const arc = 2 * Math.PI * 16;

  return (
    <main className="page narrow">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="muted">Bonjour</div>
          <h1 style={{ fontSize: 34 }}>{c?.nomComplet}</h1>
        </div>
        <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #FFB38A, #C9501E)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }} aria-hidden="true">
          {initiales(c?.nomComplet ?? '')}
        </span>
      </header>

      {comp && (
        <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 24 }}>
          <svg width="64" height="64" viewBox="0 0 42 42" role="img" aria-label={`Profil complété à ${comp.pct} %`}>
            <circle cx="21" cy="21" r="16" fill="none" stroke="var(--line)" strokeWidth="5" />
            <circle cx="21" cy="21" r="16" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(arc * comp.pct) / 100} ${arc}`} transform="rotate(-90 21 21)" />
            <text x="21" y="24.5" textAnchor="middle" fontSize="9" fill="var(--ink)">{comp.pct} %</text>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{comp.pct === 100 ? 'Profil complet' : comp.pct >= 70 ? 'Profil presque complet' : 'Profil à compléter'}</div>
            {comp.manque && <div className="muted small">Ajoutez {comp.manque} pour finir.</div>}
            {comp.manque && <Link to="/candidat/profil" className="small" style={{ display: 'inline-block', marginTop: 6, color: 'var(--accent-ink)', fontWeight: 600 }}>Compléter</Link>}
          </div>
        </section>
      )}

      {aConfirmer.map((r) => (
        <Link key={r.id} to={`/candidat/reunions/${r.id}`} className="card accent stack" style={{ gap: 10, borderRadius: 24, padding: 18, textDecoration: 'none' }}>
          <div className="card-head" style={{ margin: 0 }}>
            <span className="pill veil">Entretien : choisissez un créneau</span>
            <span className="small">{r.creneaux.length} créneau(x)</span>
          </div>
          <div style={{ fontSize: 22, lineHeight: 1.15 }}>{r.entrepriseNom}<br />{r.missionIntitule}</div>
          <div className="small">{r.natureLibelle} · {r.dureeMinutes} min · {r.typeLibelle.toLowerCase()}{r.creneaux[0] ? ` · dès le ${dateCourte(r.creneaux[0].debut)}` : ''}</div>
          <span className="btn light" style={{ alignSelf: 'flex-start' }}>Choisir mon créneau</span>
        </Link>
      ))}

      {confirmees.length > 0 && (
        <section className="card stack" style={{ borderRadius: 24, gap: 10 }}>
          <h2>Mes entretiens</h2>
          {confirmees.map((r) => (
            <Link key={r.id} to={`/candidat/reunions/${r.id}`} className="tile" style={{ textDecoration: 'none' }}>
              <span style={{ flex: '1 1 180px', minWidth: 0 }}><b style={{ fontWeight: 600 }}>{r.missionIntitule}</b>
                <span className="muted small" style={{ display: 'block' }}>{r.debut && r.fin ? plage(r.debut, r.fin) : ''} · {r.type === 'PRESENTIEL' ? r.lieu ?? 'sur site' : r.typeLibelle}</span></span>
              <span className="pill ok">Confirmé</span>
            </Link>
          ))}
        </section>
      )}

      <section className="card stack" style={{ borderRadius: 24, gap: 14 }}>
        <h2>Mes candidatures</h2>
        {candidatures.data?.length === 0 && <Vide>Aucune candidature en cours. Le cabinet vous contacte dès qu'un poste vous correspond.</Vide>}
        {candidatures.data?.map((x, i) => (
          <div key={x.id} className="stack" style={{ gap: 8, borderTop: i ? '1px solid var(--line)' : 0, paddingTop: i ? 14 : 0 }}>
            <div className="card-head" style={{ margin: 0 }}><b style={{ fontWeight: 600 }}>{x.missionIntitule}</b><span className="muted small">{x.entreprise}</span></div>
            {x.etapeNumero > 0 ? <Progression etape={x.etapeNumero} total={x.etapesTotal} enCours={x.etapeNumero < x.etapesTotal} /> : null}
            <div className="small" style={{ color: x.etapeNumero === 0 ? 'var(--muted)' : 'var(--ink-2)' }}>
              {x.etapeNumero > 0 ? `${x.etapeLibelle} · étape ${x.etapeNumero} sur ${x.etapesTotal}` : 'Candidature close'}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
