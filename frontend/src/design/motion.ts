/**
 * Jetons d'animation partagés (DAT, section Animations) : durées et courbes, comme les couleurs du design Épuré.
 * Interface : 150 à 250 ms. Page d'accueil : 600 ms au plus. Seules transform et opacity sont animées.
 */
export const duree = {
  rapide: 0.15,
  interface: 0.22,
  accueil: 0.6,
} as const;

/** Courbes au format GSAP (et équivalents CSS pour les transitions simples). */
export const courbe = {
  sortie: 'power3.out',
  douce: 'power2.out',
  css: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

/** Décalage entre deux éléments d'une même séquence. */
export const decalage = 0.08;

/** Distance de glissement à l'apparition (px). */
export const glissement = 24;
