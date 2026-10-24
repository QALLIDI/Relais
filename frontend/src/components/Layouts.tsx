import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api } from '../api/client';

function useNonLues() {
  return useQuery({
    queryKey: ['notifications', 'non-lues'],
    queryFn: async () => (await api.get<{ nonLues: number }>('/api/notifications/non-lues')).data.nonLues,
    refetchInterval: 30_000,
  });
}

function Deconnexion() {
  const auth = useAuth();
  return (
    <button className="btn small" type="button" onClick={() => auth.signoutRedirect()}>
      Se déconnecter
    </button>
  );
}

export function RecruteurLayout() {
  const auth = useAuth();
  const { data: nonLues } = useNonLues();
  const liens = [
    { to: '/recruteur', label: 'Tableau de bord', end: true },
    { to: '/recruteur/missions', label: 'Missions' },
    { to: '/recruteur/vivier', label: 'Vivier de candidats' },
    { to: '/recruteur/profils', label: 'Profils regroupés' },
    { to: '/recruteur/entreprises', label: 'Entreprises' },
    { to: '/recruteur/facturation', label: 'Facturation' },
    { to: '/recruteur/statistiques', label: 'Statistiques' },
  ];
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Navigation principale">
        <div className="brand"><div className="logo">R</div>Plateforme de recrutement</div>
        {liens.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
        ))}
        <NavLink to="/recruteur/notifications">
          Notifications {nonLues ? <span className="pill info">{nonLues}</span> : null}
        </NavLink>
        <div className="grow" />
        <div className="user">
          <span>{auth.user?.profile.name ?? auth.user?.profile.email} · Recruteur</span>
          <Deconnexion />
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export function EspaceLayout({ titre, liens }: { titre: string; liens: { to: string; label: string; end?: boolean }[] }) {
  const { data: nonLues } = useNonLues();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" style={{ padding: 0 }}>
            <div className="logo">R</div>
            <span>Plateforme de recrutement</span>
            <span className="muted" style={{ fontWeight: 400, paddingLeft: 10, borderLeft: '1px solid var(--border)' }}>{titre}</span>
          </div>
          <nav aria-label={titre}>
            {liens.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
            ))}
            {nonLues ? <span className="pill info" title="Notifications non lues">{nonLues} nouvelle(s)</span> : null}
            <Deconnexion />
          </nav>
        </div>
      </header>
      <Outlet />
    </>
  );
}
