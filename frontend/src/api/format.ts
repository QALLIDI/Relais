const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const jourHeure = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const mad = (v?: number | null) => (v == null ? '—' : `${nombre.format(v)} MAD`);
export const n = (v?: number | null) => (v == null ? '—' : nombre.format(v));
export const kmad = (v?: number | null) => (v == null ? '—' : nombre.format(Math.round(v / 1000)));
export const dateFr = (v?: string | null) => (v ? date.format(new Date(v)) : '—');
export const dateHeureFr = (v?: string | null) => (v ? jourHeure.format(new Date(v)) : '—');

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
