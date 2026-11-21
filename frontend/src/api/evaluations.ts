import { useQuery } from '@tanstack/react-query';
import { api } from './client';

/** Évaluations techniques intégrées (DAT, section 15). */

export type TypeQuestion = 'QCM' | 'QCM_MULTI' | 'CODE' | 'COURTE' | 'OUVERTE';
export type Niveau = 'JUNIOR' | 'CONFIRME' | 'SENIOR';
export type Mode = 'TEST' | 'GRILLE';
export type StatutEvaluation = 'ENVOYEE' | 'COMMENCEE' | 'A_CORRIGER' | 'CORRIGEE' | 'EXPIREE' | 'EN_COURS';
export type TypeSignal = 'ONGLET' | 'FENETRE' | 'PLEIN_ECRAN' | 'COPIE' | 'COLLAGE';

export interface Question {
  id: string; type: TypeQuestion; enonce: string; code?: string; langage?: string; choix: string[]; attendues?: string;
  indice?: string; explication?: string; competence: string; niveau: Niveau; points: number; plateforme: boolean;
  auteur?: string; utilisations: number;
}
export interface QuestionSaisie {
  type: TypeQuestion; enonce: string; code?: string; langage?: string; choix: string[]; attendues?: string;
  indice?: string; explication?: string; competence: string; niveau: Niveau; points: number;
}
export interface Element {
  id?: string; questionId?: string; questionEnonce?: string; competence?: string; niveau?: Niveau | null; nombre?: number;
  libelle?: string; guides: string[]; poids?: number;
}
export interface Modele {
  id: string; mode: Mode; intitule: string; competences: string[]; dureeMinutes?: number; seuil: number; delaiJours: number;
  melanger: boolean; indices: boolean; scoreVisible: boolean; pleinEcran: boolean; signaux: boolean;
  alerteSorties: number; alerteSecondes: number; auteur?: string; utilisations: number; nombreQuestions: number; points: number;
  elements: Element[];
}
export interface Integrite { sorties: number; secondesHors: number; collages: number; aVerifier: number; alerte: boolean }
export interface EvaluationResume {
  id: string; candidatureId: string; candidatNom: string; missionIntitule: string; mode: Mode; intitule: string;
  statut: StatutEvaluation; dureeMinutes?: number; dateLimite?: string; envoyeeLe: string; debut?: string; fin?: string;
  score?: number; seuil: number; scoresCompetences: Record<string, number>; aNoter: number; integrite: Integrite;
}
export interface LigneResultat {
  id: string; ordre: number; type: TypeQuestion | 'CRITERE'; enonce: string; code?: string; langage?: string; choix: string[];
  attendues?: string; explication?: string; competence: string; points: number; reponse?: string; correcte?: boolean | null;
  pointsObtenus?: number | null; tempsMs?: number; aVerifier: boolean; motifVerification?: string;
}
export interface EvenementDto { ordre?: number; type: TypeSignal; debut: string; dureeMs?: number; longueur?: number }
export interface EvaluationDetail { resume: EvaluationResume; commentaire?: string; lignes: LigneResultat[]; evenements: EvenementDto[] }

export interface MonTest {
  id: string; intitule: string; missionIntitule: string; entrepriseNom: string; statut: StatutEvaluation; nombreQuestions: number;
  dureeMinutes?: number; dateLimite?: string; envoyeeLe: string; fin?: string; score?: number; message?: string; pleinEcran: boolean;
}
export interface QuestionPassage {
  ordre: number; type: TypeQuestion; enonce: string; code?: string; langage?: string; choix: string[]; indice?: string;
  competence: string; reponse?: string;
}
export interface Passage {
  id: string; intitule: string; missionIntitule: string; entrepriseNom: string; statut: StatutEvaluation; debut?: string;
  secondesRestantes: number; pleinEcran: boolean; signaux: boolean; questions: QuestionPassage[];
}
export interface Fin { statut: StatutEvaluation; score?: number; scoresCompetences: Record<string, number>; provisoire: boolean }

export const LIBELLE_TYPE: Record<TypeQuestion, string> = {
  QCM: 'Choix unique', QCM_MULTI: 'Choix multiple', CODE: 'Lecture de code', COURTE: 'Réponse courte', OUVERTE: 'Question ouverte',
};
export const AIDE_TYPE: Record<TypeQuestion, string> = {
  QCM: 'Une seule bonne réponse, corrigée automatiquement.',
  QCM_MULTI: 'Plusieurs bonnes réponses : il faut toutes les cocher, et seulement elles.',
  CODE: '« Que va afficher ce code ? » : un extrait et des propositions.',
  COURTE: 'Le candidat écrit un mot ou une phrase ; acceptée si elle contient une des réponses prévues.',
  OUVERTE: 'Réponse libre que vous notez vous-même après le test.',
};
export const LIBELLE_NIVEAU: Record<Niveau, string> = { JUNIOR: 'Junior', CONFIRME: 'Confirmé', SENIOR: 'Senior' };
export const LIBELLE_STATUT: Record<StatutEvaluation, string> = {
  ENVOYEE: 'Envoyé', COMMENCEE: 'En cours', A_CORRIGER: 'À corriger', CORRIGEE: 'Corrigé', EXPIREE: 'Expiré', EN_COURS: 'Entretien en cours',
};
export const TON_STATUT: Record<StatutEvaluation, 'ok' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  ENVOYEE: 'neutral', COMMENCEE: 'info', A_CORRIGER: 'warn', CORRIGEE: 'ok', EXPIREE: 'bad', EN_COURS: 'info',
};
export const LIBELLE_SIGNAL: Record<TypeSignal, string> = {
  ONGLET: 'Changement d’onglet', FENETRE: 'Autre fenêtre', PLEIN_ECRAN: 'Sortie du plein écran', COPIE: 'Copie', COLLAGE: 'Texte collé',
};

export const useQuestions = () =>
  useQuery({ queryKey: ['eval', 'questions'], queryFn: async () => (await api.get<Question[]>('/api/selection/evaluation/questions')).data });
export const useModeles = () =>
  useQuery({ queryKey: ['eval', 'modeles'], queryFn: async () => (await api.get<Modele[]>('/api/selection/evaluation/modeles')).data });
export const useEvaluationsRecentes = () =>
  useQuery({ queryKey: ['eval', 'recentes'], queryFn: async () => (await api.get<EvaluationResume[]>('/api/selection/evaluations')).data });
export const useEvaluationsDe = (candidatureId: string) =>
  useQuery({ queryKey: ['eval', 'candidature', candidatureId], queryFn: async () => (await api.get<EvaluationResume[]>(`/api/candidatures/${candidatureId}/evaluations`)).data });
export const useEvaluation = (id: string) =>
  useQuery({ queryKey: ['eval', 'detail', id], queryFn: async () => (await api.get<EvaluationDetail>(`/api/selection/evaluations/${id}`)).data });
export const useMesTests = () =>
  useQuery({ queryKey: ['mes-tests'], queryFn: async () => (await api.get<MonTest[]>('/api/selection/mes-tests')).data });

/** « 12 min 30 s » ou « 45 s ». */
export function duree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = Math.round(secondes % 60);
  return m > 0 ? `${m} min${s ? ` ${s} s` : ''}` : `${s} s`;
}
/** Chronomètre « 12:05 ». */
export const chrono = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
