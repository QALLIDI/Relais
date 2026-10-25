import axios from 'axios';
import { api } from './client';

export type TypeCompte = 'CANDIDAT' | 'ENTREPRISE';

/** État d'une inscription renvoyé par compte-service (étapes 1 à 5). */
export interface EtatInscription {
  id: string;
  etape: number;
  type: TypeCompte;
  email: string;
  prenom: string;
  telephoneMasque?: string;
  /** Secondes avant de pouvoir redemander un code (ou l'e-mail à l'étape 4). */
  renvoiDans: number;
}

const base = '/public/inscription';

export const inscription = {
  commencer: async (req: { type: TypeCompte; email: string; prenom: string; nom: string; raisonSociale?: string }) =>
    (await api.post<EtatInscription>(base, req)).data,
  etat: async (id: string) => (await api.get<EtatInscription>(`${base}/${id}`)).data,
  compte: async (id: string, req: { telephone: string; motDePasse: string }) =>
    (await api.post<EtatInscription>(`${base}/${id}/compte`, req)).data,
  renvoyerCode: async (id: string) => (await api.post<EtatInscription>(`${base}/${id}/code/renvoi`)).data,
  verifierCode: async (id: string, code: string) =>
    (await api.post<EtatInscription>(`${base}/${id}/code/verification`, { code })).data,
  renvoyerEmail: async (id: string) => (await api.post<EtatInscription>(`${base}/${id}/email/renvoi`)).data,
};

/** Délai d'attente (secondes) renvoyé avec un refus 429, s'il y en a un. */
export function reessayerDans(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { reessayerDans?: number } | undefined;
    return data?.reessayerDans;
  }
  return undefined;
}

/** Inscription introuvable ou expirée (404) : il faut recommencer. */
export function estExpiree(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}
