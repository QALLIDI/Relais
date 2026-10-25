import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { DecisionEntretien, Reunion, StatutReunion, TypeReunion } from './types';

/** Toutes les réunions visibles par l'utilisateur (le service filtre selon le rôle). */
export function useReunions() {
  return useQuery({ queryKey: ['reunions'], queryFn: async () => (await api.get<Reunion[]>('/api/reunions')).data });
}

export function useReunion(id: string) {
  return useQuery({ queryKey: ['reunions', id], queryFn: async () => (await api.get<Reunion>(`/api/reunions/${id}`)).data, enabled: !!id });
}

export const libelleStatutReunion: Record<StatutReunion, string> = {
  A_PLANIFIER: 'À planifier',
  PROPOSEE: 'En attente du candidat',
  CONFIRMEE: 'Confirmée',
  REPORTEE: 'Reportée',
  ANNULEE: 'Annulée',
  TERMINEE: 'Terminée',
};

export const toneStatutReunion = (s: StatutReunion) =>
  s === 'CONFIRMEE' ? 'ok' : s === 'PROPOSEE' || s === 'A_PLANIFIER' || s === 'REPORTEE' ? 'warn' : s === 'ANNULEE' ? 'bad' : 'neutral';

export const libelleType: Record<TypeReunion, string> = { VISIO: 'Visio', PRESENTIEL: 'Sur site', TELEPHONE: 'Téléphone' };

export const libelleDecision: Record<DecisionEntretien, string> = {
  RETENIR: 'Retenir',
  SECOND_ENTRETIEN: 'Second entretien',
  NE_PAS_RETENIR: 'Ne pas retenir',
};

/** Date de référence : créneau confirmé, sinon premier créneau proposé. */
export const repere = (r: Reunion) => r.debut ?? r.creneaux[0]?.debut;

/** Réunion confirmée dont l'heure est passée (ou close) et que le client n'a pas encore évaluée. */
export const avisAttendu = (r: Reunion) =>
  r.nature === 'ENTRETIEN_CLIENT' && !r.evaluation && (r.statut === 'TERMINEE' || (r.statut === 'CONFIRMEE' && !!r.fin && new Date(r.fin) < new Date()));

const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtHeure = (v: string) => heure.format(new Date(v));
export const fmtJour = (v: string) => jour.format(new Date(v));
export const fmtJourLong = (v: string) => jourLong.format(new Date(v));
export const plage = (debut: string, fin: string) => `${fmtJour(debut)} · ${fmtHeure(debut)}–${fmtHeure(fin)}`;

/** Lundi 0 h (heure locale) de la semaine qui contient la date. */
export function lundi(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

export const memeJour = (a: Date, b: Date) => a.toDateString() === b.toDateString();
