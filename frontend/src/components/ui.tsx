import { type ReactNode, useEffect } from 'react';

export function Kpi({ label, value, unit, note, tone }: { label: string; value: ReactNode; unit?: string; note?: string; tone?: 'ok' | 'warn' | 'bad' }) {
  const couleur = tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : undefined;
  return (
    <div className="card kpi">
      <span className="label">{label}</span>
      <span>
        <span className="value" style={{ color: couleur }}>{value}</span>
        {unit && <span className="muted"> {unit}</span>}
      </span>
      {note && <span className="note" style={{ color: couleur }}>{note}</span>}
    </div>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'neutral'; children: ReactNode }) {
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

export function Progression({ etape, total }: { etape: number; total: number }) {
  return (
    <div className="progress" role="img" aria-label={`Étape ${etape} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={i < etape ? 'on' : ''} />
      ))}
    </div>
  );
}

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

const tonsMission: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  OUVERTE: 'info',
  EN_VALIDATION: 'warn',
  BROUILLON: 'neutral',
  EN_PAUSE: 'neutral',
  POURVUE: 'ok',
  ANNULEE: 'bad',
};
export const toneMission = (s: string) => tonsMission[s] ?? 'neutral';

const tonsFacture: Record<string, 'ok' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  BROUILLON: 'neutral',
  EMISE: 'warn',
  PAYEE: 'ok',
  EN_RETARD: 'bad',
};
export const toneFacture = (s: string) => tonsFacture[s] ?? 'neutral';

export const toneAvis = (s?: string) => (s === 'REFUSE' ? 'bad' : s ? 'ok' : 'neutral');
