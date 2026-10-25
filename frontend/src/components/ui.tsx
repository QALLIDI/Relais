import { type ReactNode, useEffect } from 'react';

type Ton = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

/** Indicateur « gros chiffre » : libellé, valeur et, si un ton est donné, une pastille colorée. */
export function Kpi({ label, value, unit, note, tone }: { label: string; value: ReactNode; unit?: string; note?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  return (
    <div className="kpi">
      <span className="label">{label}</span>
      <span className="line">
        <span className="value">{value}</span>
        {unit && <span className="unit">{unit}</span>}
        {note && tone && <span className={`pill ${tone}`} style={{ borderRadius: 6, padding: '2px 8px' }}>{note}</span>}
      </span>
      {note && !tone && <span className="note">{note}</span>}
    </div>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: Ton | 'dark'; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Tags({ items }: { items: string[] }) {
  return (
    <div className="tags">
      {items.map((t) => (
        <span key={t} className="tag">{t}</span>
      ))}
    </div>
  );
}

export function Score({ value }: { value: number }) {
  const classe = value >= 80 ? 'haut' : value >= 60 ? 'moyen' : 'bas';
  return <span className={`score ${classe}`} title="Score de correspondance">{value} %</span>;
}

export function Barre({ label, valeur, max, suffixe }: { label: string; valeur: number; max: number; suffixe?: string }) {
  const pct = max > 0 ? Math.round((valeur / max) * 100) : 0;
  return (
    <div className="barre-ligne" title={`${label} : ${valeur}${suffixe ?? ''}`}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div className="barre"><div style={{ width: `${pct}%` }} /></div>
      <span className="mono" style={{ textAlign: 'right' }}>{valeur}</span>
    </div>
  );
}

/** Barre segmentée : étapes franchies en noir, étape en cours en orange. */
export function Progression({ etape, total, enCours }: { etape: number; total: number; enCours?: boolean }) {
  return (
    <div className="progress" role="img" aria-label={`Étape ${etape} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={i < etape - (enCours ? 1 : 0) ? 'on' : enCours && i === etape - 1 ? 'cur' : ''} />
      ))}
    </div>
  );
}

/** Histogramme en bâtons arrondis ; le mois le plus haut est mis en avant. */
export function Batons({ donnees, unite, label }: { donnees: { libelle: string; valeur: number }[]; unite: string; label: string }) {
  const max = Math.max(1, ...donnees.map((d) => d.valeur));
  const top = donnees.reduce((m, d, i) => (d.valeur > (donnees[m]?.valeur ?? -1) ? i : m), 0);
  return (
    <div className="colonnes" role="img" aria-label={`${label} : ${donnees.map((d) => `${d.libelle} ${d.valeur}`).join(', ')}`}>
      {donnees.map((d, i) => (
        <div key={d.libelle} title={`${d.libelle} : ${d.valeur} ${unite}`}>
          {i === top && d.valeur > 0 && <span className="bulle">{d.valeur} {unite}</span>}
          <span className={`baton ${i === top && d.valeur > 0 ? 'top' : ''}`} style={{ height: `${Math.round((d.valeur / max) * 100)}%` }} />
          <span className="mois">{d.libelle}</span>
        </div>
      ))}
    </div>
  );
}

/** Pastilles de couleur tournantes pour les avatars et les groupes. */
export const TEINTES = ['t-peach', 't-violet', 't-blue', 't-green', 't-pink', 't-ink'] as const;
export const teinte = (i: number) => TEINTES[i % TEINTES.length];

export function Chargement() {
  return <p className="muted">Chargement…</p>;
}

export function Erreur({ message }: { message: string }) {
  return <div className="alert error">{message}</div>;
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="muted">{children}</p>;
}

export function Modal({ titre, onClose, children }: { titre: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const fermer = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()}>
        <h2>{titre}</h2>
        {children}
      </div>
    </div>
  );
}

export function Icone({ nom, taille = 18 }: { nom: 'cloche' | 'lune' | 'soleil' | 'fleche' | 'plus' | 'loupe' | 'sortie'; taille?: number }) {
  const chemins: Record<typeof nom, ReactNode> = {
    cloche: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    lune: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
    soleil: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    fleche: <path d="M7 17L17 7M9 7h8v8" />,
    plus: <path d="M12 5v14M5 12h14" />,
    loupe: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
    sortie: <><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></>,
  };
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {chemins[nom]}
    </svg>
  );
}

const tonsMission: Record<string, Ton> = {
  OUVERTE: 'info',
  EN_VALIDATION: 'warn',
  BROUILLON: 'neutral',
  EN_PAUSE: 'neutral',
  POURVUE: 'ok',
  ANNULEE: 'bad',
};
export const toneMission = (s: string) => tonsMission[s] ?? 'neutral';

const tonsFacture: Record<string, Ton> = {
  BROUILLON: 'neutral',
  EMISE: 'warn',
  PAYEE: 'ok',
  EN_RETARD: 'bad',
};
export const toneFacture = (s: string) => tonsFacture[s] ?? 'neutral';

export const toneAvis = (s?: string) => (s === 'REFUSE' ? 'bad' : s ? 'ok' : 'neutral');
