import { type CSSProperties, type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';

export type TypeFenetre = 'modal' | 'drawer' | 'sheet';

const FOCUSABLES = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CONFIRMATION = 'Abandonner les modifications ?';

/**
 * Fenêtre accessible : modale centrée, panneau latéral (drawer) ou feuille montante (sheet).
 * Une seule à la fois ; Échap, ✕, « Annuler » ou un clic à l'extérieur la ferment, avec confirmation
 * si le contenu a été modifié. Le focus reste dans la fenêtre puis revient au bouton d'origine.
 * Sous 700 px de large, modales et panneaux s'affichent en feuille (CSS).
 */
export function Fenetre({ type = 'modal', titre, sousTitre, onFermer, pied, children, modifie = false, largeur }: {
  type?: TypeFenetre;
  titre: ReactNode;
  sousTitre?: ReactNode;
  onFermer: () => void;
  pied?: ReactNode;
  children: ReactNode;
  modifie?: boolean;
  largeur?: number;
}) {
  const id = useId();
  const boite = useRef<HTMLDivElement>(null);
  const derniere = useRef({ onFermer, modifie });
  derniere.current = { onFermer, modifie };

  const demanderFermeture = () => {
    const { onFermer: fermer, modifie: sale } = derniere.current;
    if (!sale || window.confirm(CONFIRMATION)) fermer();
  };

  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    const corps = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const premier = boite.current?.querySelector('.fenetre-corps')?.querySelector<HTMLElement>(FOCUSABLES) ?? boite.current;
    premier?.focus();

    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); demanderFermeture(); return; }
      if (e.key !== 'Tab' || !boite.current) return;
      const elements = [...boite.current.querySelectorAll<HTMLElement>(FOCUSABLES)].filter((el) => el.offsetParent !== null);
      if (elements.length === 0) return;
      const [a, z] = [elements[0], elements[elements.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', clavier);
    return () => {
      document.removeEventListener('keydown', clavier);
      document.body.style.overflow = corps;
      avant?.focus?.();
    };
    // Ouverture unique : la fenêtre est montée une fois par affichage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className={`fenetre-fond ${type}`} onMouseDown={(e) => { if (e.target === e.currentTarget) demanderFermeture(); }}>
      <div ref={boite} className={`fenetre ${type}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1}
        style={largeur ? ({ '--largeur': `${largeur}px` } as CSSProperties) : undefined}>
        <div className="fenetre-tete">
          <div>
            <h2 id={`${id}-t`}>{titre}</h2>
            {sousTitre && <p>{sousTitre}</p>}
          </div>
          <button type="button" className="fermer" aria-label="Fermer" onClick={demanderFermeture}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="fenetre-corps">{children}</div>
        {pied && <div className="fenetre-pied">{pied}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Bouton « Annuler » des pieds de fenêtre (lien discret, comme dans les maquettes). */
export function Annuler({ onClick, children = 'Annuler' }: { onClick: () => void; children?: ReactNode }) {
  return <button type="button" className="lien-action" onClick={onClick}>{children}</button>;
}

/** Paramètres d'URL des fenêtres ouvertes par lien : ?fenetre=planifier&candidature=… */
export const PARAMS_FENETRE = ['fenetre', 'candidature', 'reunion', 'nom', 'mission'] as const;
export type NomFenetre = 'planifier' | 'evaluation' | 'mission';

/** Lien relatif qui ouvre une fenêtre sur la page courante (à passer à <Link to=…>). */
export function versFenetre(nom: NomFenetre, params: Record<string, string | undefined> = {}) {
  const p = new URLSearchParams({ fenetre: nom });
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  return { search: `?${p.toString()}` };
}

/** Fenêtre demandée dans l'URL, et fermeture qui retire ses paramètres sans changer de page. */
export function useFenetreUrl() {
  const [params, setParams] = useSearchParams();
  const fermer = () => {
    const suite = new URLSearchParams(params);
    PARAMS_FENETRE.forEach((k) => suite.delete(k));
    setParams(suite, { replace: true });
  };
  return { nom: params.get('fenetre') as NomFenetre | null, params, fermer };
}
