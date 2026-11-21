import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { hasAuthParams, useAuth } from 'react-oidc-context';
import { setTokenProvider } from './api/client';
import { lireSession } from './auth/auth';
import RattachementEnAttente from './pages/entreprise/RattachementEnAttente';
import Accueil from './pages/Accueil';
import { CandidatLayout, EntrepriseLayout, RecruteurLayout } from './components/Layouts';
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
import Equipe from './pages/entreprise/Equipe';
import Shortlist from './pages/entreprise/Shortlist';
import FacturesClient from './pages/entreprise/Factures';
import CandidatAccueil from './pages/candidat/Accueil';
import MonProfil from './pages/candidat/MonProfil';
import Agenda from './pages/recruteur/Agenda';
import Qualification from './pages/recruteur/Qualification';
import ReunionsClient from './pages/entreprise/Reunions';
import ReunionCandidat from './pages/candidat/Reunion';
import MesDonnees from './pages/candidat/MesDonnees';
import Messages from './pages/Messages';
import ReserveAdmin from './pages/entreprise/ReserveAdmin';
import Evaluations from './pages/recruteur/evaluations/Evaluations';
import MesTests from './pages/candidat/MesTests';
import PassageTest from './pages/candidat/PassageTest';

export default function App() {
  const auth = useAuth();

  // Le jeton courant est lu à chaque appel API (il est renouvelé en silence).
  setTokenProvider(() => auth.user?.access_token);

  // La page d'accueil publique (« / ») s'affiche sans connexion ; les autres adresses demandent de se connecter.
  const surAccueil = location.pathname === '/' && !hasAuthParams();

  useEffect(() => {
    if (!surAccueil && !hasAuthParams() && !auth.isAuthenticated && !auth.activeNavigator && !auth.isLoading && !auth.error) {
      void auth.signinRedirect();
    }
  }, [auth, surAccueil]);

  if (surAccueil && !auth.isLoading && !auth.isAuthenticated) {
    return <Accueil />;
  }

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

  // Compte entreprise inscrit en ligne : aucun accès tant que le recruteur ne l'a pas rattaché.
  if (session.role === 'ENTREPRISE' && !session.entrepriseId) {
    return <RattachementEnAttente />;
  }

  return (
    <Routes>
      {session.roles.includes('RECRUTEUR') && (
        <Route path="/recruteur" element={<RecruteurLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="missions" element={<Missions />} />
          <Route path="missions/nouvelle" element={<NouvelleMission />} />
          <Route path="missions/:id" element={<PipelinePage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="candidatures/:id/qualification" element={<Qualification />} />
          <Route path="evaluations" element={<Evaluations />} />
          <Route path="vivier" element={<Vivier />} />
          <Route path="vivier/nouveau" element={<NouveauCandidat />} />
          <Route path="vivier/:id" element={<FicheCandidat />} />
          <Route path="profils" element={<Profils />} />
          <Route path="entreprises" element={<Entreprises />} />
          <Route path="facturation" element={<Facturation />} />
          <Route path="statistiques" element={<Statistiques />} />
          <Route path="agenda" element={<Agenda />} />
          {/* Anciennes adresses (liens d'e-mails) : la fenêtre s'ouvre désormais par-dessus la page. */}
          <Route path="agenda/planifier" element={<VersFenetre page="/recruteur/agenda" fenetre="planifier" />} />
          <Route path="agenda/:id/evaluation" element={<VersFenetre page="/recruteur/agenda" fenetre="evaluation" />} />
          <Route path="messages" element={<Messages espace="recruteur" />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      )}
      {session.roles.includes('ENTREPRISE') && (
        <Route path="/entreprise" element={<EntrepriseLayout />}>
          <Route index element={<EntrepriseAccueil />} />
          <Route path="besoin" element={session.admin ? <NouveauBesoin /> : <ReserveAdmin action="exprimer un nouveau besoin" />} />
          <Route path="shortlist/:missionId" element={<Shortlist />} />
          <Route path="factures" element={session.admin ? <FacturesClient /> : <ReserveAdmin action="consulter les factures et les propositions commerciales" />} />
          <Route path="equipe" element={<Equipe />} />
          <Route path="entretiens" element={<ReunionsClient />} />
          <Route path="entretiens/planifier" element={<VersFenetre page="/entreprise/entretiens" fenetre="planifier" />} />
          <Route path="entretiens/:id/evaluation" element={<VersFenetre page="/entreprise/entretiens" fenetre="evaluation" />} />
          <Route path="messages" element={<Messages espace="entreprise" />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      )}
      {session.roles.includes('CANDIDAT') && (
        <Route path="/candidat" element={<CandidatLayout />}>
          <Route index element={<CandidatAccueil />} />
          <Route path="profil" element={<MonProfil />} />
          <Route path="donnees" element={<MesDonnees />} />
          <Route path="tests" element={<MesTests />} />
          <Route path="reunions/:id" element={<ReunionCandidat />} />
          <Route path="notifications" element={<div className="page narrow"><Notifications /></div>} />
        </Route>
      )}
      {/* Passage d'un test : plein écran, sans menu, pour rester concentré. */}
      {session.roles.includes('CANDIDAT') && <Route path="/candidat/tests/:id" element={<PassageTest />} />}
      <Route path="*" element={<Navigate to={accueil} replace />} />
    </Routes>
  );
}

/** Redirige une ancienne page (planifier, évaluation) vers la page hôte avec la fenêtre ouverte. */
function VersFenetre({ page, fenetre }: { page: string; fenetre: 'planifier' | 'evaluation' }) {
  const { search } = useLocation();
  const { id } = useParams();
  const p = new URLSearchParams(search);
  p.set('fenetre', fenetre);
  if (id) p.set('reunion', id);
  return <Navigate to={`${page}?${p.toString()}`} replace />;
}
