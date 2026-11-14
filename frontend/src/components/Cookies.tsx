import { useEffect, useState } from 'react';

/**
 * Consentement cookies (politique « Cookies ») : seuls les cookies nécessaires sont déposés avant le choix ;
 * « Tout refuser » est aussi visible que « Tout accepter » ; le choix est gardé 6 mois puis redemandé.
 * La mesure d'audience, quand un outil sera retenu, ne doit démarrer que si audienceAcceptee() est vrai.
 */
const CLE = 'consentement-cookies';
const DUREE_MS = 183 * 24 * 3600 * 1000;
const EVENEMENT = 'recrut:gerer-cookies';

type Choix = { audience: boolean; date: string };

export function lireConsentement(): Choix | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const c = JSON.parse(brut) as Choix;
    if (!c.date || Date.now() - new Date(c.date).getTime() > DUREE_MS) return null;
    return c;
  } catch {
    return null;
  }
}

export const audienceAcceptee = () => lireConsentement()?.audience === true;

function enregistrer(audience: boolean) {
  try { localStorage.setItem(CLE, JSON.stringify({ audience, date: new Date().toISOString() })); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new CustomEvent('recrut:cookies', { detail: { audience } }));
}

/** Rouvre le bandeau (lien « Gérer les cookies » en bas des pages). */
export function gererCookies() {
  window.dispatchEvent(new Event(EVENEMENT));
}

export function BandeauCookies() {
  const [visible, setVisible] = useState(() => lireConsentement() === null);
  useEffect(() => {
    const ouvrir = () => setVisible(true);
    window.addEventListener(EVENEMENT, ouvrir);
    return () => window.removeEventListener(EVENEMENT, ouvrir);
  }, []);
  if (!visible) return null;
  const choisir = (audience: boolean) => { enregistrer(audience); setVisible(false); };
  return (
    <section className="bandeau-cookies" role="region" aria-label="Cookies">
      <p>
        Nous utilisons uniquement les cookies nécessaires au fonctionnement du site, et une mesure d'audience anonyme si vous l'acceptez.{' '}
        <a href="/cookies">En savoir plus</a>
      </p>
      <div className="bandeau-cookies-boutons">
        <button type="button" className="btn" onClick={() => choisir(false)}>Tout refuser</button>
        <button type="button" className="btn" onClick={() => choisir(true)}>Tout accepter</button>
      </div>
    </section>
  );
}
