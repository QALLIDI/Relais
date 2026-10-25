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
      </span>
      {note && tone && <span className={`pill ${tone === 'ok' ? 'ok-soft' : tone}`}>{note}</span>}
      {note && !tone && <span className="note">{note}</span>}
    </div>
  );
}

const glyphes: Partial<Record<Ton, NomIcone>> = { ok: 'check', bad: 'croix', warn: 'horloge', info: 'suivant', neutral: 'tiret' };

/** Pastille de statut, précédée d'un pictogramme qui double la couleur (lisible sans distinguer les teintes). */
export function Pill({ tone = 'neutral', children }: { tone?: Ton | 'dark'; children: ReactNode }) {
  const glyphe = tone !== 'dark' ? glyphes[tone] : undefined;
  return <span className={`pill ${tone}`}>{glyphe && <Icone nom={glyphe} taille={14} />}{children}</span>;
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

export type NomIcone =
  | 'cloche' | 'lune' | 'soleil' | 'fleche' | 'plus' | 'loupe' | 'sortie'
  | 'maison' | 'mallette' | 'groupe' | 'grille' | 'immeuble' | 'facture' | 'stats' | 'agenda' | 'profil' | 'filtre' | 'chevron'
  | 'check' | 'croix' | 'horloge' | 'tiret' | 'suivant' | 'externe' | 'etincelle';

export function Icone({ nom, taille = 18 }: { nom: NomIcone; taille?: number }) {
  const chemins: Record<NomIcone, ReactNode> = {
    cloche: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    lune: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
    soleil: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    fleche: <path d="M7 17L17 7M9 7h8v8" />,
    plus: <path d="M12 5v14M5 12h14" />,
    loupe: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
    sortie: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
    maison: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
    mallette: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    groupe: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>,
    grille: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    immeuble: <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M2 21h20" />,
    facture: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" />,
    stats: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    agenda: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    profil: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    filtre: <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />,
    chevron: <path d="M6 9l6 6 6-6" />,
    check: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5 5.5-6" /></>,
    croix: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
    horloge: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    tiret: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
    suivant: <><circle cx="12" cy="12" r="9" /><path d="M10.5 8l4 4-4 4" /></>,
    externe: <path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />,
    etincelle: <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />,
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
