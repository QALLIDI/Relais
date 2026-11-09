import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { messageErreur, telecharger } from '../../api/client';
import { fmtHeure, fmtJourLong, useReunion } from '../../api/reunions';
import type { Creneau, Reunion as ReunionT } from '../../api/types';
import { Chargement, Erreur } from '../../components/ui';
import { FeuilleConfirmation, FeuilleCreneau } from './FeuillesReunion';

const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

function quandRelatif(d: Date) {
  const jours = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000);
  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return 'Demain';
  if (jours < 7) return `Dans ${jours} jours`;
  return 'Semaine prochaine';
}

/** Choix du créneau par le candidat, pensé pour le téléphone (maquette EmberCandidatReunion). */
export default function Reunion() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const reunion = useReunion(id);
  const [choix, setChoix] = useState<string | null>(null);
  const [feuille, setFeuille] = useState<{ type: 'confirmer'; creneau: Creneau } | { type: 'creneau' } | null>(null);
  const rafraichir = () => { setFeuille(null); void qc.invalidateQueries({ queryKey: ['reunions'] }); };

  if (reunion.isLoading) return <div className="page narrow"><Chargement /></div>;
  const r = reunion.data;
  if (!r) return <div className="page narrow"><Erreur message={messageErreur(reunion.error)} /></div>;

  return (
    <div className="page narrow" style={{ maxWidth: 480 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/candidat" className="ico" aria-label="Retour">←</Link>
        <span className="chip" style={{ padding: '8px 14px' }}>Entretien</span>
        <span style={{ width: 44 }} />
      </header>
      {r.statut === 'PROPOSEE' && <Choix r={r} choix={choix ?? r.creneaux[0]?.id ?? null} setChoix={setChoix}
        onConfirmer={(cid) => { const c = r.creneaux.find((x) => x.id === cid); if (c) setFeuille({ type: 'confirmer', creneau: c }); }} enCours={false} onAucun={() => setFeuille({ type: 'creneau' })} />}
      {(r.statut === 'CONFIRMEE' || r.statut === 'TERMINEE') && <Confirme r={r} onChanger={() => setFeuille({ type: 'creneau' })} />}
      {(r.statut === 'REPORTEE' || r.statut === 'ANNULEE') && (
        <section className="card stack" style={{ borderRadius: 24 }}>
          <h1 style={{ fontSize: 26 }}>{r.statut === 'REPORTEE' ? 'Entretien reporté' : 'Entretien annulé'}</h1>
          <p className="muted" style={{ margin: 0 }}>{r.statut === 'REPORTEE' ? 'De nouveaux créneaux vont vous être proposés par e-mail.' : 'Cet entretien n’aura pas lieu.'}{r.motif ? ` Motif : ${r.motif}` : ''}</p>
          <Link to="/candidat" className="btn primary">Retour à l'accueil</Link>
        </section>
      )}
      {feuille?.type === 'confirmer' && <FeuilleConfirmation r={r} creneau={feuille.creneau} onFermer={() => setFeuille(null)} onFait={rafraichir} />}
      {feuille?.type === 'creneau' && <FeuilleCreneau r={r} onFermer={() => setFeuille(null)} onFait={rafraichir} onChoisi={(c) => setFeuille({ type: 'confirmer', creneau: c })} />}
    </div>
  );
}

function Entete({ r }: { r: ReunionT }) {
  return (
    <div className="card accent stack" style={{ gap: 6, borderRadius: 24, padding: 18 }}>
      <span className="small" style={{ opacity: 0.9 }}>{r.nature === 'ENTRETIEN_CLIENT' ? `${r.entrepriseNom} vous propose un entretien` : 'Votre recruteur vous propose un entretien'}</span>
      <span style={{ fontSize: 24, lineHeight: 1.15 }}>{r.missionIntitule}</span>
      <span className="small" style={{ opacity: 0.9 }}>{r.natureLibelle} · {r.dureeMinutes} min · {r.type === 'PRESENTIEL' ? r.lieu ?? 'sur site' : r.typeLibelle.toLowerCase()}</span>
    </div>
  );
}

function Choix({ r, choix, setChoix, onConfirmer, enCours, onAucun }: {
  r: ReunionT; choix: string | null; setChoix: (id: string) => void; onConfirmer: (id: string) => void; enCours: boolean; onAucun: () => void;
}) {
  const sel = r.creneaux.find((c) => c.id === choix);
  return (
    <>
      <Entete r={r} />
      <h1 style={{ fontSize: 24, margin: '4px 0 0' }}>Choisissez un créneau</h1>
      <div role="radiogroup" aria-label="Créneaux proposés" className="stack" style={{ gap: 8 }}>
        {r.creneaux.map((c) => {
          const d = new Date(c.debut);
          return (
            <button key={c.id} type="button" role="radio" aria-checked={c.id === choix} className="choix-creneau" onClick={() => setChoix(c.id)}>
              <span className="date"><span style={{ display: 'block', fontSize: 11, textTransform: 'capitalize' }}>{jourCourt.format(d)}</span><span style={{ display: 'block', fontSize: 20 }}>{d.getDate()}</span></span>
              <span style={{ flex: 1 }}><span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>{fmtHeure(c.debut)} – {fmtHeure(c.fin)}</span><span style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>{quandRelatif(d)}</span></span>
              <span className="rond" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onAucun} style={{ border: 0, background: 'transparent', font: 'inherit', fontSize: 14, color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer' }}>Aucun créneau ne me convient</button>
      <button type="button" className="btn primary" style={{ width: '100%', minHeight: 50, fontSize: 15 }} disabled={!sel || enCours} onClick={() => sel && onConfirmer(sel.id)}>
        Confirmer {sel ? `${jourCourt.format(new Date(sel.debut))} ${new Date(sel.debut).getDate()} à ${fmtHeure(sel.debut)}` : ''}
      </button>
    </>
  );
}

function Confirme({ r, onChanger }: { r: ReunionT; onChanger: () => void }) {
  const autres = r.participants.filter((p) => p.role !== 'CANDIDAT').map((p) => p.nom).filter(Boolean).join(' et ');
  return (
    <>
      <div className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 10, paddingTop: 10 }}>
        <span style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.2"><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <h1 style={{ fontSize: 26 }}>Entretien confirmé</h1>
        <p className="muted" style={{ margin: 0 }}>L'invitation a été envoyée {r.nature === 'ENTRETIEN_CLIENT' ? `à ${r.entrepriseNom} et ` : ''}à votre recruteur.</p>
      </div>
      <div className="card stack" style={{ gap: 10, borderRadius: 24, background: 'var(--inverse)', color: 'var(--inverse-ink)' }}>
        <span className="small" style={{ opacity: 0.7, textTransform: 'capitalize' }}>{r.debut && r.fin ? `${fmtJourLong(r.debut)} · ${fmtHeure(r.debut)} – ${fmtHeure(r.fin)}` : ''}</span>
        <span style={{ fontSize: 20 }}>{r.missionIntitule}</span>
        {autres && <span className="small" style={{ opacity: 0.75 }}>Avec {autres}</span>}
        {r.lienVisio ? <a className="btn accent" href={r.lienVisio} target="_blank" rel="noreferrer">Rejoindre la visio</a>
          : <span className="small" style={{ opacity: 0.75 }}>{r.type === 'PRESENTIEL' ? r.lieu : r.typeLibelle}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button type="button" className="btn" onClick={() => telecharger(`/api/reunions/${r.id}/invitation.ics`, 'invitation.ics')}>Ajouter au calendrier</button>
        {r.statut === 'CONFIRMEE' && <button type="button" className="btn" onClick={onChanger}>Changer de créneau</button>}
      </div>
      <div className="card stack small" style={{ gap: 6, borderRadius: 20, padding: 14, color: 'var(--ink-2)' }}>
        <b style={{ color: 'var(--ink)', fontWeight: 600 }}>Pour bien vous préparer</b>
        <span>Rappel par e-mail la veille et par SMS 2 h avant.</span>
        <span>Le recruteur vous appelle 15 min avant pour un dernier point.</span>
      </div>
    </>
  );
}
