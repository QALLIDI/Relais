import { useAuth } from 'react-oidc-context';
import { lireSession, type Session } from './auth';

/** Session de l'utilisateur connecté (rôles, entreprise, administrateur), lue dans le jeton d'accès. */
export function useSession(): Session {
  const auth = useAuth();
  return auth.user ? lireSession(auth.user.access_token) : { roles: [], role: null, admin: false };
}
