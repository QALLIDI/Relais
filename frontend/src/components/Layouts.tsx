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
import { Logo } from './Logo';
import { totalNonLus, useMessagesNonLus } from '../api/messagerie';
import { useSession } from '../auth/useSession';

/** `court` : libellé plus court pour la barre du bas sur téléphone. */
type Lien = { to: string; label: string; court?: string; icone: NomIcone; end?: boolean; compte?: number };
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

/** Nom affiché de l'utilisateur : nom complet, sinon prénom + nom ; l'e-mail seulement en dernier recours. */
function useNom() {
  const p = useAuth().user?.profile;
  const complet = p?.name?.trim() || [p?.given_name, p?.family_name].filter(Boolean).join(' ').trim();
  return complet || p?.preferred_username || p?.email || '';
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
        <div className="compte-menu-nom"><b>{nom}</b><span>{role}</span></div>
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
function Cadre({ classe, espace, accueil, sous, groupes, notifications, recherche, role, mobile, children }: {
  classe?: string; espace: 'recruteur' | 'entreprise' | 'candidat'; accueil: string; sous?: string; groupes: Groupe[];
  notifications: string; recherche?: string; role: string;
  /** Liens de la barre du bas sur téléphone (4 au plus) ; les autres sont dans « Plus ». */
  mobile: string[];
  children: ReactNode;
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
  const enBas = mobile.map((to) => tous.find((l) => l.to === to)).filter((l): l is Lien => !!l);
  const autres = tous.filter((l) => !mobile.includes(l.to));

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
                    {l.compte ? <span className="compte" aria-label={`${l.compte} non lu${l.compte > 1 ? 's' : ''}`}>{l.compte}</span> : null}
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
            <Link to={accueil} className="marque-mobile" aria-label="Recrut, accueil"><Logo taille={28} /></Link>
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
        <NavigationMobile liens={enBas} autres={autres} role={role} />
        <FenetresGlobales espace={espace} />
      </div>
    </FilContexte.Provider>
  );
}

/**
 * Téléphone et tablette : barre d'onglets fixée en bas (liens principaux + « Plus »).
 * « Plus » ouvre une feuille avec les autres pages, le compte et la déconnexion.
 */
function NavigationMobile({ liens, autres, role }: { liens: Lien[]; autres: Lien[]; role: string }) {
  const auth = useAuth();
  const nom = useNom();
  const { pathname } = useLocation();
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => { setOuvert(false); }, [pathname]);
  useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [ouvert]);
  const autreActif = autres.some((l) => pathname === l.to || pathname.startsWith(l.to + '/'));
  const compteAutres = autres.reduce((s, l) => s + (l.compte ?? 0), 0);
  return (
    <>
      <nav className="barre-bas" aria-label="Navigation principale">
        {liens.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end}>
            <span className="ico-zone"><Icone nom={l.icone} taille={20} />{l.compte ? <span className="nb" aria-label={`${l.compte} non lu(s)`}>{l.compte}</span> : null}</span>
            {l.court ?? l.label}
          </NavLink>
        ))}
        <button type="button" className={autreActif || ouvert ? 'active' : ''} aria-expanded={ouvert} aria-controls="feuille-plus" onClick={() => setOuvert((o) => !o)}>
          <span className="ico-zone"><Icone nom="grille" taille={20} />{compteAutres ? <span className="nb">{compteAutres}</span> : null}</span>
          Plus
        </button>
      </nav>
      {ouvert && (
        <div className="feuille-plus-fond" onMouseDown={(e) => { if (e.target === e.currentTarget) setOuvert(false); }}>
          <div className="feuille-plus" id="feuille-plus" role="dialog" aria-modal="true" aria-label="Plus de pages">
            <span className="poignee" aria-hidden="true" />
            <nav className="feuille-plus-liens" aria-label="Autres pages">
              {autres.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end}>
                  <Icone nom={l.icone} taille={18} /><span>{l.label}</span>
                  {l.compte ? <span className="compte">{l.compte}</span> : null}
                </NavLink>
              ))}
            </nav>
            <div className="feuille-plus-compte">
              <span className="avatar" aria-hidden="true">{initiales(nom) || '?'}</span>
              <span className="who"><b>{nom}</b><span>{role}</span></span>
              <button className="btn small" type="button" onClick={() => auth.signoutRedirect()}><Icone nom="sortie" taille={16} />Se déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function RecruteurLayout() {
  const messages = totalNonLus(useMessagesNonLus().data);
  const groupes: Groupe[] = [
    {
      titre: 'Menu principal',
      liens: [
        { to: '/recruteur', label: 'Tableau de bord', court: 'Accueil', icone: 'maison', end: true },
        { to: '/recruteur/missions', label: 'Missions', icone: 'mallette' },
        { to: '/recruteur/pipeline', label: 'Pipeline', icone: 'colonnes' },
        { to: '/recruteur/vivier', label: 'Vivier', icone: 'groupe' },
        { to: '/recruteur/profils', label: 'Profils', icone: 'grille' },
        { to: '/recruteur/agenda', label: 'Agenda', icone: 'agenda' },
        { to: '/recruteur/messages', label: 'Messages', icone: 'bulle', compte: messages },
        { to: '/recruteur/facturation', label: 'Facturation', icone: 'facture' },
        { to: '/recruteur/statistiques', label: 'Statistiques', icone: 'stats' },
      ],
    },
    { titre: 'Clients', liens: [{ to: '/recruteur/entreprises', label: 'Entreprises', icone: 'immeuble' }] },
  ];
  return (
    <Cadre espace="recruteur" accueil="/recruteur" groupes={groupes} notifications="/recruteur/notifications" recherche="/recruteur/vivier" role="Recruteur"
      mobile={['/recruteur', '/recruteur/missions', '/recruteur/vivier', '/recruteur/messages']}>
      <main className="app-main">
        <Outlet />
      </main>
    </Cadre>
  );
}

export function EntrepriseLayout() {
  const entreprise = useQuery({ queryKey: ['entreprise', 'me'], queryFn: async () => (await api.get<Entreprise>('/api/entreprises/me')).data });
  const messages = totalNonLus(useMessagesNonLus().data);
  const { admin } = useSession();
  const groupes: Groupe[] = [
    {
      titre: 'Menu principal',
      liens: [
        { to: '/entreprise', label: 'Mes recrutements', court: 'Accueil', icone: 'maison', end: true },
        { to: '/entreprise/entretiens', label: 'Entretiens', icone: 'agenda' },
        { to: '/entreprise/messages', label: 'Messages', icone: 'bulle', compte: messages },
        // Factures et propositions : réservées aux administrateurs de l'entreprise.
        ...(admin ? [{ to: '/entreprise/factures', label: 'Factures', icone: 'facture' as const }] : []),
        { to: '/entreprise/equipe', label: 'Équipe', icone: 'groupe' },
      ],
    },
    ...(admin ? [{ titre: 'Actions', liens: [{ to: '/entreprise/besoin', label: 'Nouveau besoin', icone: 'plus' as const }] }] : []),
  ];
  return (
    <Cadre classe="layout-entreprise" espace="entreprise" accueil="/entreprise" sous={entreprise.data?.raisonSociale} groupes={groupes} notifications="/entreprise/notifications" role={admin ? 'Administrateur' : 'Membre'}
      mobile={['/entreprise', '/entreprise/entretiens', '/entreprise/messages', admin ? '/entreprise/besoin' : '/entreprise/equipe']}>
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
    <Cadre classe="layout-candidat" espace="candidat" accueil="/candidat" groupes={groupes} notifications="/candidat/notifications" role="Candidat"
      mobile={['/candidat', '/candidat/profil', '/candidat/donnees']}>
      <main className="app-main">
        <Outlet />
      </main>
    </Cadre>
  );
}
