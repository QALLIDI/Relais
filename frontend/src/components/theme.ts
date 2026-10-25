import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function lireChoix(): Theme | null {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

/** Thème effectif (choix enregistré, sinon celui du système) et bascule clair / sombre. */
export function useTheme() {
  const [choix, setChoix] = useState<Theme | null>(lireChoix);
  const [systeme, setSysteme] = useState<Theme>(() => (media().matches ? 'dark' : 'light'));

  useEffect(() => {
    const m = media();
    const ecouter = () => setSysteme(m.matches ? 'dark' : 'light');
    m.addEventListener('change', ecouter);
    return () => m.removeEventListener('change', ecouter);
  }, []);

  useEffect(() => {
    if (choix) document.documentElement.dataset.theme = choix;
    else delete document.documentElement.dataset.theme;
  }, [choix]);

  const theme = choix ?? systeme;
  const basculer = () => {
    const suivant: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('theme', suivant);
    } catch {
      // Stockage indisponible (navigation privée) : le choix vaut pour la session en cours.
    }
    setChoix(suivant);
  };
  return { theme, basculer };
}
