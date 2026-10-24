import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { hasAuthParams, useAuth } from 'react-oidc-context';
import { setTokenProvider } from './api/client';
import { lireSession } from './auth/auth';
import { EspaceLayout, RecruteurLayout } from './components/Layouts';
import Dashboard from './pages/recruteur/Dashboard';
import Missions from './pages/recruteur/Missions';
import NouvelleMission from './pages/recruteur/NouvelleMission';
import PipelinePage from './pages/recruteur/Pipeline';
import Vivier from './pages/recruteur/Vivier';
import FicheCandidat from './pages/recruteur/FicheCandidat';
import NouveauCandidat from './pages/recruteur/NouveauCandidat';
import Profils from './pages/recruteur/Profils';
import Entreprises from './pages/recruteur/Entreprises';
import Facturation from './pages/recruteur/Facturation';
import Statistiques from './pages/recruteur/Statistiques';
import Notifications from './pages/Notifications';
import EntrepriseAccueil from './pages/entreprise/Accueil';
import NouveauBesoin from './pages/entreprise/NouveauBesoin';
import Shortlist from './pages/entreprise/Shortlist';
import FacturesClient from './pages/entreprise/Factures';
import CandidatAccueil from './pages/candidat/Accueil';
import MonProfil from './pages/candidat/MonProfil';

export default function App() {
  const auth = useAuth();

  // Le jeton courant est lu à chaque appel API (il est renouvelé en silence).
  setTokenProvider(() => auth.user?.access_token);

  useEffect(() => {
    if (!hasAuthParams() && !auth.isAuthenticated && !auth.activeNavigator && !auth.isLoading && !auth.error) {
      void auth.signinRedirect();
    }
  }, [auth]);

  if (auth.error) {
    return (
      <div className="centre">
        <div className="alert error">Connexion impossible : {auth.error.message}</div>
        <button className="btn primary" onClick={() => auth.signinRedirect()}>Réessayer</button>
      </div>
    );
  }
  if (auth.isLoading || !auth.isAuthenticated || !auth.user) {
    return <div className="centre"><p className="muted">Connexion en cours…</p></div>;
  }

  const session = lireSession(auth.user.access_token);
  const accueil = session.role === 'RECRUTEUR' ? '/recruteur' : session.role === 'ENTREPRISE' ? '/entreprise' : '/candidat';

  if (!session.role) {
    return (
      <div className="centre">
        <div className="alert error">Votre compte n'a aucun rôle sur la plateforme. Contactez le cabinet.</div>
        <button className="btn" onClick={() => auth.signoutRedirect()}>Se déconnecter</button>
      </div>
    );
  }

  return (
    <Routes>
      {session.roles.includes('RECRUTEUR') && (
        <Route path="/recruteur" element={<RecruteurLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="missions" element={<Missions />} />
          <Route path="missions/nouvelle" element={<NouvelleMission />} />
          <Route path="missions/:id" element={<PipelinePage />} />
          <Route path="vivier" element={<Vivier />} />
          <Route path="vivier/nouveau" element={<NouveauCandidat />} />
          <Route path="vivier/:id" element={<FicheCandidat />} />
          <Route path="profils" element={<Profils />} />
          <Route path="entreprises" element={<Entreprises />} />
          <Route path="facturation" element={<Facturation />} />
          <Route path="statistiques" element={<Statistiques />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      )}
      {session.roles.includes('ENTREPRISE') && (
        <Route
          path="/entreprise"
          element={
            <EspaceLayout
              titre="Espace entreprise"
              liens={[
                { to: '/entreprise', label: 'Mes recrutements', end: true },
                { to: '/entreprise/besoin', label: 'Nouveau besoin' },
                { to: '/entreprise/factures', label: 'Factures' },
                { to: '/entreprise/notifications', label: 'Notifications' },
              ]}
            />
          }
        >
          <Route index element={<EntrepriseAccueil />} />
          <Route path="besoin" element={<NouveauBesoin />} />
          <Route path="shortlist/:missionId" element={<Shortlist />} />
          <Route path="factures" element={<FacturesClient />} />
          <Route path="notifications" element={<div className="page"><Notifications /></div>} />
        </Route>
      )}
      {session.roles.includes('CANDIDAT') && (
        <Route
          path="/candidat"
          element={
            <EspaceLayout
              titre="Espace candidat"
              liens={[
                { to: '/candidat', label: 'Accueil', end: true },
                { to: '/candidat/profil', label: 'Mon profil et CV' },
              ]}
            />
          }
        >
          <Route index element={<CandidatAccueil />} />
          <Route path="profil" element={<MonProfil />} />
        </Route>
      )}
      <Route path="*" element={<Navigate to={accueil} replace />} />
    </Routes>
  );
}
