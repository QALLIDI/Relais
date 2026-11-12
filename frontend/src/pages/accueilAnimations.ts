import { courbe, decalage, duree, glissement } from '../design/motion';

/** Blocs qui apparaissent au défilement, section par section. */
const APPARITIONS = [
  '.acc-bandeau',
  '.acc-section .surtitre',
  '.acc-section h2',
  '.acc-titre-section > p',
  '.acc-intro',
  '.acc-etapes > li',
  '.acc-public',
  '.acc-tuile',
  '.acc-formule',
  '.acc-questions > details',
  '.acc-contact',
].join(', ');

/**
 * Animations de la page d'accueil (DAT, section Animations) : GSAP + ScrollTrigger, chargés à la demande
 * pour ne pas alourdir les espaces connectés.
 * - titre en séquence à l'ouverture ;
 * - chiffres clés qui défilent et barres de score qui se remplissent ;
 * - maquettes qui glissent au défilement ;
 * - sections qui apparaissent.
 * Avec « réduire les animations », il ne reste que des fondus, sans mouvement ni défilement de chiffres.
 * Seules transform et opacity sont animées ; 600 ms au plus. Renvoie la fonction qui annule tout.
 * Si `signal` est annulé pendant le chargement (page quittée, double montage en StrictMode), rien n'est lancé :
 * deux séries de `from` sur les mêmes éléments laisseraient sinon le contenu invisible.
 */
export async function animerAccueil(racine: HTMLElement, signal?: AbortSignal): Promise<() => void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
  if (signal?.aborted) return () => {};
  gsap.registerPlugin(ScrollTrigger);
  const q = gsap.utils.selector(racine);
  const mm = gsap.matchMedia(racine);

  mm.add({ mouvement: '(prefers-reduced-motion: no-preference)', reduit: '(prefers-reduced-motion: reduce)' }, (contexte) => {
    const { mouvement } = contexte.conditions as { mouvement: boolean; reduit: boolean };
    const d = mouvement ? glissement : 0;

    // 1. Ouverture : en-tête, titre ligne par ligne, texte, boutons, chiffres, puis les maquettes.
    const ouverture = gsap.timeline({ defaults: { duration: duree.accueil, ease: courbe.sortie } });
    ouverture
      .from(q('.acc-entete'), { autoAlpha: 0, y: -d / 2, duration: 0.4 })
      .from(q('.acc-bascule'), { autoAlpha: 0, y: d }, 0.1)
      .from(q('.acc-hero h1 > span'), { autoAlpha: 0, y: d, stagger: decalage * 1.5 }, 0.15)
      .from(q('.acc-chapeau, .acc-actions, .acc-chiffres > div'), { autoAlpha: 0, y: d, stagger: decalage }, 0.35)
      .from(q('.acc-carte'), { autoAlpha: 0, y: d * 1.5, stagger: 0.12 }, 0.25);

    if (mouvement) {
      // 2. Chiffres clés qui défilent jusqu'à leur valeur (le texte final est déjà dans la page).
      q('[data-compte]').forEach((el: HTMLElement) => {
        const fin = Number(el.dataset.compte);
        const valeur = { v: 0 };
        el.textContent = '0';
        ouverture.to(valeur, {
          v: fin,
          duration: duree.accueil,
          ease: courbe.douce,
          onUpdate: () => { el.textContent = String(Math.round(valeur.v)); },
        }, 0.45);
      });
      ouverture.from(q('.acc-carte .score > i > i'), { scaleX: 0, transformOrigin: 'left center', stagger: decalage }, 0.55);

      // 3. Maquettes qui glissent à des vitesses différentes pendant le défilement (yPercent, indépendant de l'entrée).
      const visuel = q('.acc-visuel')[0];
      if (visuel) {
        const vitesses: [string, number][] = [['.acc-carte.shortlist', -8], ['.acc-carte.entretien', -30], ['.acc-carte.verif', -14]];
        vitesses.forEach(([selecteur, yPercent]) => {
          gsap.to(q(selecteur), {
            yPercent,
            ease: 'none',
            scrollTrigger: { trigger: visuel, start: 'top top', end: 'bottom top', scrub: true },
          });
        });
      }
    }

    // 4. Sections qui apparaissent quand elles entrent à l'écran, une fois.
    const cibles = q(APPARITIONS);
    gsap.set(cibles, { autoAlpha: 0, y: d });
    ScrollTrigger.batch(cibles, {
      start: 'top 90%',
      once: true,
      onEnter: (lot) => gsap.to(lot, { autoAlpha: 1, y: 0, duration: duree.accueil, ease: courbe.sortie, stagger: decalage, overwrite: true }),
    });

    // Si tout est annulé en cours de route, les chiffres reprennent leur valeur réelle.
    return () => q('[data-compte]').forEach((el: HTMLElement) => { el.textContent = el.dataset.compte ?? el.textContent; });
  });

  return () => mm.revert();
}
