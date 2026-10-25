import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api } from '../api/client';
import { initiales } from '../api/format';
import type { Entreprise } from '../api/types';
import { useTheme } from './theme';
import { Icone } from './ui';

type Lien = { to: string; label: string; end?: boolean };

function useNonLues() {
  return useQuery({
    queryKey: ['notifications', 'non-lues'],
    queryFn: async () => (await api.get<{ nonLues: number }>('/api/notifications/non-lues')).data.nonLues,
    refetchInterval: 30_000,
  });
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <circle cx="8" cy="8" r="5" fill="#E8622A" />
      <circle cx="18" cy="18" r="5" fill="#E8622A" />
      <path d="M6 20L20 6" stroke="#E8622A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BoutonTheme() {
  const { theme, basculer } = useTheme();
  const sombre = theme === 'dark';
  return (
    <button type="button" className="ico" onClick={basculer} aria-pressed={sombre} aria-label="Mode sombre" title={sombre ? 'Passer en mode clair' : 'Passer en mode sombre'}>
      <Icone nom={sombre ? 'soleil' : 'lune'} />
    </button>
  );
}

function MenuUtilisateur({ role }: { role: string }) {
  const auth = useAuth();
  const nom = auth.user?.profile.name ?? auth.user?.profile.email ?? '';
  return (
    <details className="user-menu">
      <summary aria-label={`Compte de ${nom}`}>{initiales(nom) || '?'}</summary>
      <div className="menu">
        <div>
          <div style={{ fontWeight: 600 }}>{nom}</div>
          <div className="muted small">{auth.user?.profile.email} · {role}</div>
        </div>
        <button className="btn small" type="button" onClick={() => auth.signoutRedirect()}>
          <Icone nom="sortie" taille={16} /> Se déconnecter
        </button>
      </div>
    </details>
  );
}

function Entete({ accueil, sous, liens, notifications, role }: { accueil: string; sous?: string; liens: Lien[]; notifications: string; role: string }) {
  const { data: nonLues } = useNonLues();
  return (
    <header className="app-header">
      <Link to={accueil} className="brand-pill">
        <Logo />
        <b>Recrut</b>
        {sous && <span className="brand-sub">{sous}</span>}
      </Link>
      <nav className="navpill" aria-label="Navigation principale">
        {liens.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
        ))}
      </nav>
      <div className="header-tools">
        <Link to={notifications} className="ico" aria-label={nonLues ? `Notifications, ${nonLues} non lues` : 'Notifications'}>
          <Icone nom="cloche" />
          {nonLues ? <span className="badge" aria-hidden="true">{nonLues}</span> : null}
        </Link>
        <BoutonTheme />
        <MenuUtilisateur role={role} />
      </div>
    </header>
  );
}

export function RecruteurLayout() {
  const liens: Lien[] = [
    { to: '/recruteur', label: 'Tableau de bord', end: true },
    { to: '/recruteur/missions', label: 'Missions' },
    { to: '/recruteur/vivier', label: 'Vivier' },
    { to: '/recruteur/profils', label: 'Profils' },
    { to: '/recruteur/agenda', label: 'Agenda' },
    { to: '/recruteur/entreprises', label: 'Entreprises' },
    { to: '/recruteur/facturation', label: 'Facturation' },
    { to: '/recruteur/statistiques', label: 'Statistiques' },
  ];
  return (
    <div className="app-frame">
      <Entete accueil="/recruteur" liens={liens} notifications="/recruteur/notifications" role="Recruteur" />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export function EntrepriseLayout() {
  const entreprise = useQuery({ queryKey: ['entreprise', 'me'], queryFn: async () => (await api.get<Entreprise>('/api/entreprises/me')).data });
  const liens: Lien[] = [
    { to: '/entreprise', label: 'Mes recrutements', end: true },
    { to: '/entreprise/besoin', label: 'Nouveau besoin' },
    { to: '/entreprise/entretiens', label: 'Entretiens' },
    { to: '/entreprise/factures', label: 'Factures' },
  ];
  return (
    <div className="app-frame layout-entreprise">
      <Entete accueil="/entreprise" sous={entreprise.data?.raisonSociale} liens={liens} notifications="/entreprise/notifications" role="Entreprise" />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}

export function CandidatLayout() {
  const liens: Lien[] = [
    { to: '/candidat', label: 'Accueil', end: true },
    { to: '/candidat/profil', label: 'Mon profil et CV' },
  ];
  return (
    <div className="app-frame layout-candidat">
      <Entete accueil="/candidat" liens={liens} notifications="/candidat/notifications" role="Candidat" />
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}
