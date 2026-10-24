import axios from 'axios';

let tokenProvider: () => string | undefined = () => undefined;

/** Branché par AuthGate : chaque appel part avec le jeton Keycloak courant. */
export function setTokenProvider(provider: () => string | undefined) {
  tokenProvider = provider;
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = tokenProvider();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Message lisible à partir d'une erreur API (ProblemDetail). */
export function messageErreur(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string } | undefined;
    if (data?.detail) return data.detail;
    if (error.response?.status === 403) return "Vous n'avez pas accès à cette action.";
    if (!error.response) return 'Service injoignable. Vérifiez que la gateway tourne.';
  }
  return 'Une erreur est survenue.';
}

/** Télécharge un fichier protégé (CV, facture PDF) avec le jeton. */
export async function telecharger(url: string, nomParDefaut: string) {
  const res = await api.get(url, { responseType: 'blob' });
  const disposition = String(res.headers['content-disposition'] ?? '');
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(res.data as Blob);
  lien.download = match?.[1] ?? nomParDefaut;
  lien.click();
  URL.revokeObjectURL(lien.href);
}
