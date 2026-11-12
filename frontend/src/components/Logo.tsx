/**
 * Logo Recrut, dans le bleu d'action de l'application.
 * Le même dessin sert d'icône d'onglet (public/favicon.svg) : penser à les garder identiques.
 */
export function Logo({ taille = 30 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="9" fill="#2f6fb8" />
      <circle cx="11" cy="11" r="3.6" fill="#ffffff" />
      <circle cx="19" cy="19" r="3.6" fill="#a9cdf5" />
      <path d="M10 20L20 10" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
