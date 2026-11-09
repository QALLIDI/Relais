import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api } from '../api/client';
import { initiales } from '../api/format';
import type { Entreprise } from '../api/types';
import { FenetresGlobales } from './FenetresGlobales';
import { useTheme } from './theme';
import { Icone, type NomIcone } from './ui';

type Lien = { to: string; label: string; icone: NomIcone; end?: boolean };
type Groupe = { titre: string; liens: Lien[] };
export type Miette = { label: string; to?: string };

function useNonLues() {
  return useQuery({
    queryKey: ['notifications', 'non-lues'],
    queryFn: async () => (await api.get<{ nonLues: number }>('/api/notifications/non-lues')).data.nonLues,
    refetchInterval: 30_000,
  });
}

/* Fil d'Ariane : déduit du menu, une page peut le préciser avec useFilAriane([...]). */
const FilContexte = createContext<(m: Miette[] | null) => void>(() => {});
export function useFilAriane(miettes: Miette[] | null) {
  const definir = useContext(FilContexte);
  const cle = JSON.stringify(miettes);
  useEffect(() => {
    definir(miettes);
    return () => definir(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, definir]);
}

/** Logo Recrut : la seule touche d'orange de l'application, avec la pastille de notification. */
function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="9" fill="#17181c" />
      <circle cx="11" cy="11" r="3.6" fill="#ffffff" />
      <circle cx="19" cy="19" r="3.6" fill="#e8622a" />
      <path d="M10 20L20 10" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function useNom() {
  const auth = useAuth();
  return auth.user?.profile.name ?? auth.user?.profile.email ?? '';
}

/** Carte « Compte » en bas de la barre latérale : ouvre un petit menu avec la déconnexion. */
function Compte({ role }: { role: string }) {
  const auth = useAuth();
  const nom = useNom();
  return (
    <details className="compte-carte">
      <summary aria-label={`Compte de ${nom}`}>
        <span className="avatar" aria-hidden="true">{initiales(nom) || '?'}</span>
        <span className="who"><b>{nom}</b><span>{role}</span></span>
      </summary>
      <div className="menu">
        <div className="muted small">{auth.user?.profile.email}</div>
        <button className="btn small danger" type="button" onClick={() => auth.signoutRedirect()}>
          <Icone nom="sortie" taille={16} /> Se déconnecter
        </button>
      </div>
    </details>
  );
}

function lireReplie() {
  try { return localStorage.getItem('menu-replie') === '1'; } catch { return false; }
}

/** Cadre commun aux trois espaces : barre latérale groupée, bandeau avec fil d'Ariane, recherche, notifications et thème. */
function Cadre({ classe, espace, accueil, sous, groupes, notifications, recherche, role, children }: {
  classe?: string; espace: 'recruteur' | 'entreprise' | 'candidat'; accueil: string; sous?: string; groupes: Groupe[];
  notifications: string; recherche?: string; role: string; children: ReactNode;
}) {
  const { data: nonLues } = useNonLues();
  const { theme, basculer } = useTheme();
  const { pathname } = useLocation();
  const [fil, setFil] = useState<Miette[] | null>(null);
  const [replie, setReplie] = useState(lireReplie);

  const basculerMenu = () => {
    setReplie((r) => {
      try { localStorage.setItem('menu-replie', r ? '0' : '1'); } catch { /* stockage indisponible */ }
      return !r;
    });
  };

  // Fil par défaut : le lien du menu qui correspond le mieux à l'adresse.
  const tous = groupes.flatMap((g) => g.liens);
  const courant = tous
    .filter((l) => (l.end ? pathname === l.to : pathname === l.to || pathname.startsWith(l.to + '/')))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const miettes: Miette[] = fil ?? (pathname.endsWith('/notifications') ? [{ label: 'Notifications' }] : courant ? [{ label: courant.label }] : []);

  return (
    <FilContexte.Provider value={setFil}>
      <div className={`app-frame ${replie ? 'replie' : ''} ${classe ?? ''}`}>
        <aside className="sidebar">
          <div className="brand-ligne">
            <Link to={accueil} className="brand"><Logo /><b>Recrut</b></Link>
            <button type="button" className="ico petit replier" onClick={basculerMenu} aria-pressed={replie} aria-label={replie ? 'Déplier le menu' : 'Replier le menu'}>
              <Icone nom="panneau" taille={18} />
            </button>
          </div>
          {sous && <span className="brand-sub">{sous}</span>}
          {groupes.map((g) => (
            <div key={g.titre} className="side-groupe">
              <div className="side-label">{g.titre}</div>
              <nav className="side-nav" aria-label={g.titre}>
                {g.liens.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} className="side-link" title={replie ? l.label : undefined}>
                    <Icone nom={l.icone} taille={18} /><span className="libelle">{l.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
          <div className="side-spacer" />
          <div className="side-label">Compte</div>
          <Compte role={role} />
        </aside>
        <div className="app-body">
          <header className="topbar">
            <nav className="fil" aria-label="Fil d'Ariane">
              <ol>
                <li><Link to={accueil}>Recrut</Link></li>
                {miettes.map((m, i) => (
                  <li key={i} aria-current={i === miettes.length - 1 ? 'page' : undefined}>
                    <Icone nom="droite" taille={12} />
                    {m.to && i < miettes.length - 1 ? <Link to={m.to}>{m.label}</Link> : <span>{m.label}</span>}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="header-tools">
              {recherche && <Link to={recherche} className="ico" aria-label="Rechercher un profil"><Icone nom="loupe" /></Link>}
              <Link to={notifications} className="ico" aria-label={nonLues ? `Notifications, ${nonLues} non lues` : 'Notifications'}>
                <Icone nom="cloche" />
                {nonLues ? <span className="point" aria-hidden="true" /> : null}
              </Link>
              <button type="button" className="ico" onClick={basculer} aria-pressed={theme === 'dark'} aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}>
                <Icone nom={theme === 'dark' ? 'soleil' : 'lune'} />
              </button>
            </div>
          </header>
          {children}
        </div>
        <FenetresGlobales espace={espace} />
      </div>
    </FilContexte.Provider>
  );
}

export function RecruteurLayout() {
  const groupes: Groupe[] = [
    {
      titre: 'Menu principal',
      liens: [
        { to: '/recruteur', label: 'Tableau de bord', icone: 'maison', end: true },
        { to: '/recruteur/missions', label: 'Missions', icone: 'mallette' },
        { to: '/recruteur/pipeline', label: 'Pipeline', icone: 'colonnes' },
        { to: '/recruteur/vivier', label: 'Vivier', icone: 'groupe' },
        { to: '/recruteur/profils', label: 'Profils', icone: 'grille' },
        { to: '/recruteur/agenda', label: 'Agenda', icone: 'agenda' },
        { to: '/recruteur/facturation', label: 'Facturation', icone: 'facture' },
        { to: '/recruteur/statistiques', label: 'Statistiques', icone: 'stats' },
      ],
    },
    { titre: 'Clients', liens: [{ to: '/recruteur/entreprises', label: 'Entreprises', icone: 'immeuble' }] },
  ];
  return (
    <Cadre espace="recruteur" accueil="/recruteur" groupes={groupes} notifications="/recruteur/notifications" recherche="/recruteur/vivier" role="Recruteur">
      <main className="app-main">
        <Outlet />
      </main>
    </Cadre>
  );
}

export function EntrepriseLayout() {
  const entreprise = useQuery({ queryKey: ['entreprise', 'me'], queryFn: async () => (await api.get<Entreprise>('/api/entreprises/me')).data });
  const groupes: Groupe[] = [
    {
      titre: 'Menu principal',
      liens: [
        { to: '/entreprise', label: 'Mes recrutements', icone: 'maison', end: true },
        { to: '/entreprise/entretiens', label: 'Entretiens', icone: 'agenda' },
        { to: '/entreprise/factures', label: 'Factures', icone: 'facture' },
        { to: '/entreprise/equipe', label: 'Équipe', icone: 'groupe' },
      ],
    },
    { titre: 'Actions', liens: [{ to: '/entreprise/besoin', label: 'Nouveau besoin', icone: 'plus' }] },
  ];
  return (
    <Cadre classe="layout-entreprise" espace="entreprise" accueil="/entreprise" sous={entreprise.data?.raisonSociale} groupes={groupes} notifications="/entreprise/notifications" role="Entreprise">
      <main className="app-main">
        <Outlet />
      </main>
    </Cadre>
  );
}

export function CandidatLayout() {
  const groupes: Groupe[] = [
    {
      titre: 'Menu principal',
      liens: [
        { to: '/candidat', label: 'Accueil', icone: 'maison', end: true },
        { to: '/candidat/profil', label: 'Mon profil', icone: 'profil' },
        { to: '/candidat/donnees', label: 'Mes données', icone: 'coche' },
        { to: '/candidat/notifications', label: 'Alertes', icone: 'cloche' },
      ],
    },
  ];
  return (
    <Cadre classe="layout-candidat" espace="candidat" accueil="/candidat" groupes={groupes} notifications="/candidat/notifications" role="Candidat">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="barre-bas" aria-label="Navigation candidat">
        {groupes[0].liens.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}><Icone nom={l.icone} taille={18} />{l.label}</NavLink>
        ))}
      </nav>
    </Cadre>
  );
}
