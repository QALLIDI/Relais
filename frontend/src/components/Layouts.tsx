import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api } from '../api/client';
import { initiales } from '../api/format';
import type { Entreprise } from '../api/types';
import { useTheme } from './theme';
import { Icone, type NomIcone } from './ui';

type Lien = { to: string; label: string; icone: NomIcone; end?: boolean };

function useNonLues() {
  return useQuery({
    queryKey: ['notifications', 'non-lues'],
    queryFn: async () => (await api.get<{ nonLues: number }>('/api/notifications/non-lues')).data.nonLues,
    refetchInterval: 30_000,
  });
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <g stroke="var(--accent)" strokeWidth="3.2" strokeLinecap="round">
        <path d="M14 3v22M3 14h22M6.2 6.2l15.6 15.6M21.8 6.2L6.2 21.8" />
      </g>
    </svg>
  );
}

function BoutonTheme() {
  const { theme, basculer } = useTheme();
  const sombre = theme === 'dark';
  return (
    <button type="button" className="side-link" onClick={basculer} aria-pressed={sombre}>
      <Icone nom={sombre ? 'soleil' : 'lune'} taille={20} />
      {sombre ? 'Mode clair' : 'Mode sombre'}
    </button>
  );
}

function useNom() {
  const auth = useAuth();
  return auth.user?.profile.name ?? auth.user?.profile.email ?? '';
}

function MenuUtilisateur({ role }: { role: string }) {
  const auth = useAuth();
  const nom = useNom();
  return (
    <details className="user-menu">
      <summary aria-label={`Compte de ${nom}`}>
        <span className="avatar ink" aria-hidden="true">{initiales(nom) || '?'}</span>
        <span className="who"><b>{nom}</b><span>{role}</span></span>
        <Icone nom="chevron" taille={16} />
      </summary>
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

/** Cadre commun aux trois espaces : barre latérale (navigation) et bandeau supérieur (notifications, compte). */
function Cadre({ classe, accueil, sous, liens, notifications, role, children }: {
  classe?: string; accueil: string; sous?: string; liens: Lien[]; notifications: string; role: string; children: ReactNode;
}) {
  const auth = useAuth();
  const prenom = useNom().split(' ')[0];
  const { data: nonLues } = useNonLues();
  return (
    <div className={`app-frame ${classe ?? ''}`}>
      <aside className="sidebar">
        <Link to={accueil} className="brand"><Logo /><b>RECRUT</b></Link>
        {sous && <span className="brand-sub">{sous}</span>}
        <div className="side-label">Menu</div>
        <nav className="side-nav" aria-label="Navigation principale">
          {liens.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="side-link">
              <Icone nom={l.icone} taille={20} />{l.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-label">Outils &amp; compte</div>
        <NavLink to={notifications} className="side-link">
          <Icone nom="cloche" taille={20} />Notifications
          {nonLues ? <span className="compte" aria-label={`${nonLues} non lues`}>{nonLues}</span> : null}
        </NavLink>
        <BoutonTheme />
        <div className="side-spacer" />
        <button type="button" className="logout" onClick={() => auth.signoutRedirect()}>
          <Icone nom="sortie" /> Se déconnecter
        </button>
      </aside>
      <div className="app-body">
        <div className="topbar">
          <span className="hello">Bonjour{prenom ? <>, <b>{prenom}</b></> : null}</span>
          <div className="header-tools">
            <Link to={notifications} className="ico" aria-label={nonLues ? `Notifications, ${nonLues} non lues` : 'Notifications'}>
              <Icone nom="cloche" />
              {nonLues ? <span className="badge" aria-hidden="true">{nonLues}</span> : null}
            </Link>
            <MenuUtilisateur role={role} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function RecruteurLayout() {
  const liens: Lien[] = [
    { to: '/recruteur', label: 'Tableau de bord', icone: 'maison', end: true },
    { to: '/recruteur/missions', label: 'Missions', icone: 'mallette' },
    { to: '/recruteur/vivier', label: 'Vivier', icone: 'groupe' },
    { to: '/recruteur/profils', label: 'Profils', icone: 'grille' },
    { to: '/recruteur/agenda', label: 'Agenda', icone: 'agenda' },
    { to: '/recruteur/entreprises', label: 'Entreprises', icone: 'immeuble' },
    { to: '/recruteur/facturation', label: 'Facturation', icone: 'facture' },
    { to: '/recruteur/statistiques', label: 'Statistiques', icone: 'stats' },
  ];
  return (
    <Cadre accueil="/recruteur" liens={liens} notifications="/recruteur/notifications" role="Recruteur">
      <main className="app-main">
        <Outlet />
      </main>
    </Cadre>
  );
}

export function EntrepriseLayout() {
  const entreprise = useQuery({ queryKey: ['entreprise', 'me'], queryFn: async () => (await api.get<Entreprise>('/api/entreprises/me')).data });
  const liens: Lien[] = [
    { to: '/entreprise', label: 'Mes recrutements', icone: 'maison', end: true },
    { to: '/entreprise/besoin', label: 'Nouveau besoin', icone: 'plus' },
    { to: '/entreprise/entretiens', label: 'Entretiens', icone: 'agenda' },
    { to: '/entreprise/factures', label: 'Factures', icone: 'facture' },
  ];
  return (
    <Cadre classe="layout-entreprise" accueil="/entreprise" sous={entreprise.data?.raisonSociale} liens={liens} notifications="/entreprise/notifications" role="Entreprise">
      <div className="app-main">
        <Outlet />
      </div>
    </Cadre>
  );
}

export function CandidatLayout() {
  const liens: Lien[] = [
    { to: '/candidat', label: 'Accueil', icone: 'maison', end: true },
    { to: '/candidat/profil', label: 'Mon profil et CV', icone: 'profil' },
  ];
  return (
    <Cadre classe="layout-candidat" accueil="/candidat" liens={liens} notifications="/candidat/notifications" role="Candidat">
      <div className="app-main">
        <Outlet />
      </div>
    </Cadre>
  );
}
