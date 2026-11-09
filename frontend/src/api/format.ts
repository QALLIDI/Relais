const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const jourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const jourHeure =new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const mad = (v?: number | null) => (v == null ? '—' : `${nombre.format(v)} MAD`);
export const n = (v?: number | null) => (v == null ? '—' : nombre.format(v));
export const kmad = (v?: number | null) => (v == null ? '—' : nombre.format(Math.round(v / 1000)));
export const dateFr = (v?: string | null) => (v ? date.format(new Date(v)) : '—');
export const dateHeureFr = (v?: string | null) => (v ? jourHeure.format(new Date(v)) : '—');
export const dateCourte = (v?: string | null) => (v ? jourMois.format(new Date(v)) : '—');

export const libelleNiveau: Record<string, string> = {
  JUNIOR: 'Junior',
  CONFIRME: 'Confirmé',
  SENIOR: 'Senior',
};

export const libelleStatutMission: Record<string, string> = {
  EN_VALIDATION: 'En validation',
  BROUILLON: 'Brouillon',
  OUVERTE: 'Ouverte',
  EN_PAUSE: 'En pause',
  POURVUE: 'Pourvue',
  ANNULEE: 'Annulée',
};

export const libelleStatutFacture: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EMISE: 'Envoyée',
  PAYEE: 'Payée',
  EN_RETARD: 'En retard',
};

export const libelleDispo: Record<string, string> = {
  IMMEDIATE: 'Immédiate',
  UN_MOIS: 'Sous 1 mois',
  TROIS_MOIS: 'Sous 3 mois',
  NON_DISPONIBLE: 'Plus en recherche',
};

export const libelleAvis: Record<string, string> = {
  RETENU: 'Retenu',
  A_RENCONTRER: 'À rencontrer',
  REFUSE: 'Refusé',
};

export const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export const listeDepuisTexte = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** « il y a 2 h », « hier », « il y a 3 j » : pour les fils d'activité. */
export function ilYa(v?: string | null, maintenant = new Date()): string {
  if (!v) return '—';
  const min = Math.round((maintenant.getTime() - new Date(v).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  return j === 1 ? 'hier' : j < 30 ? `il y a ${j} j` : dateCourte(v);
}

/** Nombre de jours entiers entre aujourd'hui et la date (négatif si dépassée). */
export function joursRestants(v: string, maintenant = new Date()): number {
  const a = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const d = new Date(v);
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export const libelleJours = (j: number) => (j < 0 ? `${-j} j de retard` : j === 0 ? "aujourd'hui" : j === 1 ? 'demain' : `${j} jours`);

/** Compte des dates par semaine, de la plus ancienne à la courante (pour les mini-courbes). */
export function parSemaine(dates: (string | undefined | null)[], semaines = 6, maintenant = new Date()): number[] {
  const res = Array<number>(semaines).fill(0);
  for (const v of dates) {
    if (!v) continue;
    const ecart = Math.floor((maintenant.getTime() - new Date(v).getTime()) / (7 * 86400000));
    if (ecart >= 0 && ecart < semaines) res[semaines - 1 - ecart] += 1;
  }
  return res;
}
