import { WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

export const oidcConfig: AuthProviderProps = {
  authority: import.meta.env.VITE_KEYCLOAK_URL,
  client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  redirect_uri: window.location.origin + '/',
  post_logout_redirect_uri: window.location.origin + '/',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Après la connexion, retire ?code=...&state=... de l'URL.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

export type Role = 'RECRUTEUR' | 'ENTREPRISE' | 'CANDIDAT';

export interface Session {
  roles: Role[];
  role: Role | null;
  entrepriseId?: string;
  email?: string;
  nom?: string;
}

/** Lit les rôles Keycloak et l'entreprise dans le jeton d'accès. */
export function lireSession(accessToken: string): Session {
  try {
    const payload = JSON.parse(decodeBase64Url(accessToken.split('.')[1]));
    const roles: Role[] = (payload.realm_access?.roles ?? []).filter((r: string) =>
      ['RECRUTEUR', 'ENTREPRISE', 'CANDIDAT'].includes(r),
    );
    const role: Role | null = roles.includes('RECRUTEUR')
      ? 'RECRUTEUR'
      : roles.includes('ENTREPRISE')
        ? 'ENTREPRISE'
        : roles.includes('CANDIDAT')
          ? 'CANDIDAT'
          : null;
    return { roles, role, entrepriseId: payload.entrepriseId, email: payload.email, nom: payload.name };
  } catch {
    return { roles: [], role: null };
  }
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
