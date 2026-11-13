import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { FilMessages, MessageMission, MessagesNonLus } from './types';

/** Longueur maximale d'un message, alignée sur le back (MessagerieService.LONGUEUR_MAX). */
export const LONGUEUR_MAX_MESSAGE = 4000;

/** Fils contenant des messages non lus ; rafraîchi toutes les minutes pour la pastille du menu. */
export function useMessagesNonLus(actif = true) {
  return useQuery({
    queryKey: ['messagerie', 'non-lus'],
    queryFn: async () => (await api.get<MessagesNonLus[]>('/api/missions/messagerie/non-lus')).data,
    refetchInterval: 60_000,
    enabled: actif,
  });
}

export const totalNonLus = (l?: MessagesNonLus[]) => (l ?? []).reduce((s, f) => s + f.nonLus, 0);

export function useFils() {
  return useQuery({
    queryKey: ['messagerie', 'fils'],
    queryFn: async () => (await api.get<FilMessages[]>('/api/missions/messagerie/fils')).data,
    refetchInterval: 60_000,
  });
}

/** Messages d'un fil ; rafraîchi souvent tant que le fil est ouvert. */
export function useFil(missionId: string) {
  return useQuery({
    queryKey: ['messagerie', 'fil', missionId],
    queryFn: async () => (await api.get<MessageMission[]>(`/api/missions/${missionId}/messages`)).data,
    refetchInterval: 15_000,
  });
}
