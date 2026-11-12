import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur } from '../api/client';
import { dateCourte, n } from '../api/format';
import type { Entreprise } from '../api/types';
import { Annuler, Fenetre } from './Fenetre';
import { Erreur, Pill, Vide } from './ui';

export type Formule = 'SUCCES' | 'FORFAIT' | 'ABONNEMENT';
export interface Proposition {
  id: string;
  entrepriseId: string;
  entrepriseNom: string;
  contactEmail?: string;
  poste?: string;
  formule: Formule;
  taux?: number;
  montant?: number;
  acomptePct: number;
  garantieMois: number;
  statut: 'ENVOYEE' | 'ACCEPTEE' | 'REFUSEE';
  motifRefus?: string;
  envoyeeLe: string;
  reponduLe?: string;
}

export const libelleFormule = (p: Pick<Proposition, 'formule' | 'taux' | 'montant'>) =>
  p.formule === 'SUCCES' ? `Au succès · ${p.taux ?? '?'} % du salaire annuel` : p.formule === 'FORFAIT' ? `Forfait · ${n(p.montant)} MAD par poste` : `Abonnement · ${n(p.montant)} MAD / mois`;
const STATUTS = { ENVOYEE: ['warn', 'En attente du client'], ACCEPTEE: ['ok', 'Acceptée'], REFUSEE: ['bad', 'Refusée'] } as const;

export function usePropositions() {
  return useQuery({ queryKey: ['propositions'], queryFn: async () => (await api.get<Proposition[]>('/api/facturation/propositions')).data });
}

/** Liste des propositions : côté recruteur (suivi) ou côté client (avec les boutons pour répondre). */
export function ListePropositions({ client = false }: { client?: boolean }) {
  const qc = useQueryClient();
  const propositions = usePropositions();
  const [aRefuser, setARefuser] = useState<Proposition | null>(null);
  const accepter = useMutation({
    mutationFn: (p: Proposition) => api.post(`/api/facturation/propositions/${p.id}/acceptation`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propositions'] }),
  });
  const liste = propositions.data ?? [];
  if (client && liste.length === 0) return null;
  return (
    <section className="bloc" aria-labelledby="propositions">
      <div className="bloc-tete"><h2 id="propositions">{client ? 'Propositions commerciales' : 'Propositions envoyées'}</h2></div>
      <div className="bloc-corps">
        {propositions.data && liste.length === 0 && <Vide>Aucune proposition envoyée.</Vide>}
        {accepter.error && <Erreur message={messageErreur(accepter.error)} />}
        {liste.map((p) => (
          <div key={p.id} className={`proposition-ligne ${client && p.statut === 'ENVOYEE' ? 'a-valider' : ''}`}>
            <div className="ligne-entre" style={{ alignItems: 'flex-start' }}>
              <span className="txt">
                <b>{client ? (p.poste ? `Poste : ${p.poste}` : 'Contrat de recrutement') : p.entrepriseNom}{!client && p.poste ? <span className="muted"> · {p.poste}</span> : null}</b>
                <span>{libelleFormule(p)}{p.acomptePct ? ` · acompte ${p.acomptePct} %` : ''}{p.garantieMois ? ` · garantie ${p.garantieMois} mois` : ''}</span>
                <span>Envoyée le {dateCourte(p.envoyeeLe)}{p.reponduLe ? ` · réponse le ${dateCourte(p.reponduLe)}` : ''}{p.motifRefus ? ` · motif : ${p.motifRefus}` : ''}</span>
              </span>
              <Pill tone={STATUTS[p.statut][0]}>{client && p.statut === 'ENVOYEE' ? 'À valider' : STATUTS[p.statut][1]}</Pill>
            </div>
            {client && p.statut === 'ENVOYEE' && (
              <>
                {p.formule === 'SUCCES' && p.acomptePct > 0 && (
                  <div className="encadre">Exemple : salaire annuel de 240 000 MAD → honoraires de {n(240000 * (p.taux ?? 0) / 100)} MAD,
                    dont {n(240000 * (p.taux ?? 0) / 100 * p.acomptePct / 100)} MAD d'acompte à l'ouverture et le solde au placement.</div>
                )}
                <div className="actions" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn" onClick={() => setARefuser(p)}>Refuser</button>
                  <button type="button" className="btn primary" disabled={accepter.isPending} onClick={() => accepter.mutate(p)}>Accepter la proposition</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {aRefuser && <ModaleRefus p={aRefuser} onFermer={() => setARefuser(null)} />}
    </section>
  );
}

function ModaleRefus({ p, onFermer }: { p: Proposition; onFermer: () => void }) {
  const qc = useQueryClient();
  const [motif, setMotif] = useState('');
  const refuser = useMutation({
    mutationFn: () => api.post(`/api/facturation/propositions/${p.id}/refus`, { motif }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['propositions'] }); onFermer(); },
  });
  return (
    <Fenetre titre="Refuser la proposition ?" sousTitre={libelleFormule(p)} largeur={460} onFermer={onFermer} modifie={!!motif}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn danger" disabled={refuser.isPending} onClick={() => refuser.mutate()}>Refuser</button></>}>
      <label className="field">Pourquoi ? (facultatif, transmis à votre recruteur)<textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : nous préférons un forfait par poste." /></label>
      {refuser.error && <Erreur message={messageErreur(refuser.error)} />}
    </Fenetre>
  );
}

const FORMULES: { v: Formule; titre: string; aide: string }[] = [
  { v: 'SUCCES', titre: 'Au succès', aide: '% du salaire annuel brut' },
  { v: 'FORFAIT', titre: 'Forfait par poste', aide: 'montant fixe par recrutement' },
  { v: 'ABONNEMENT', titre: 'Abonnement', aide: 'montant mensuel' },
];

/** Panneau « Nouvelle proposition commerciale » (maquette « Panneau · proposition commerciale »). */
export function PanneauProposition({ onFermer, onFait }: { onFermer: () => void; onFait: (p: Proposition) => void }) {
  const qc = useQueryClient();
  const entreprises = useQuery({ queryKey: ['entreprises'], queryFn: async () => (await api.get<Entreprise[]>('/api/entreprises')).data });
  const [f, setF] = useState({ entrepriseId: '', poste: '', formule: 'SUCCES' as Formule, taux: '15', montant: '', acompte: 30, garantie: true });
  const ent = entreprises.data?.find((e) => e.id === f.entrepriseId);
  const contact = ent?.contacts[0]?.email;
  const envoyer = useMutation({
    mutationFn: async () => (await api.post<Proposition>('/api/facturation/propositions', {
      entrepriseId: f.entrepriseId, entrepriseNom: ent?.raisonSociale, contactEmail: contact, poste: f.poste.trim() || undefined,
      formule: f.formule, taux: f.formule === 'SUCCES' ? Number(f.taux) : undefined, montant: f.formule !== 'SUCCES' ? Number(f.montant) : undefined,
      acomptePct: f.formule === 'SUCCES' ? f.acompte : 0, garantieMois: f.garantie ? 3 : 0,
    })).data,
    onSuccess: (p) => { void qc.invalidateQueries({ queryKey: ['propositions'] }); onFait(p); },
  });
  const valeurOk = f.formule === 'SUCCES' ? Number(f.taux) > 0 && Number(f.taux) <= 50 : Number(f.montant) > 0;
  const honoraires = 240000 * Number(f.taux || 0) / 100;
  return (
    <Fenetre type="drawer" largeur={560} titre="Nouvelle proposition commerciale" sousTitre="Le client la reçoit par e-mail et l'accepte depuis son espace ; sa formule devient alors son contrat."
      onFermer={onFermer} modifie={!!(f.entrepriseId || f.poste)}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!f.entrepriseId || !valeurOk || envoyer.isPending} onClick={() => envoyer.mutate()}>Envoyer au client</button></>}>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">Client
          <select value={f.entrepriseId} onChange={(e) => setF({ ...f, entrepriseId: e.target.value })}>
            <option value="">Choisir…</option>
            {entreprises.data?.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
          </select>
        </label>
        <label className="field">Poste (facultatif)<input value={f.poste} onChange={(e) => setF({ ...f, poste: e.target.value })} placeholder="Ex. : responsable logistique" /></label>
      </div>
      {ent && !contact && <div className="encadre alerte">Ce client n'a pas de contact avec e-mail : il verra la proposition dans son espace, sans e-mail.</div>}
      <div className="field">Formule
        <div className="stack" style={{ gap: 6 }} role="radiogroup" aria-label="Formule">
          {FORMULES.map((x) => (
            <button key={x.v} type="button" role="radio" aria-checked={f.formule === x.v} className="option-creneau" onClick={() => setF({ ...f, formule: x.v })}>
              <b>{x.titre}</b><span>{x.aide}</span>
            </button>
          ))}
        </div>
      </div>
      {f.formule === 'SUCCES' ? (
        <>
          <label className="field">Taux d'honoraires (%)<input type="number" min={1} max={50} step={0.5} value={f.taux} onChange={(e) => setF({ ...f, taux: e.target.value })} /></label>
          <div className="field">Acompte à l'ouverture
            <div className="choix" role="radiogroup" aria-label="Acompte">
              {[0, 20, 30, 50].map((a) => <button key={a} type="button" role="radio" aria-checked={f.acompte === a} onClick={() => setF({ ...f, acompte: a })}>{a ? `${a} %` : 'Aucun'}</button>)}
            </div>
          </div>
          {Number(f.taux) > 0 && (
            <div className="encadre">Exemple : salaire 240 000 MAD → honoraires {n(honoraires)} MAD{f.acompte ? ` ; acompte ${n(honoraires * f.acompte / 100)} MAD à l'ouverture, solde ${n(honoraires * (100 - f.acompte) / 100)} MAD au placement` : ', payés au placement'}.</div>
          )}
        </>
      ) : (
        <label className="field">{f.formule === 'FORFAIT' ? 'Montant par poste (MAD HT)' : 'Montant mensuel (MAD HT)'}<input type="number" min={0} step={500} value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} /></label>
      )}
      <label className="check"><input type="checkbox" checked={f.garantie} onChange={(e) => setF({ ...f, garantie: e.target.checked })} />Inclure la garantie de remplacement (3 mois)</label>
      <div className="etapes-fiche" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {[['1. Envoyée', 'par e-mail au client'], ['2. Acceptée', 'depuis son espace'], ['3. Contrat à jour', 'formule appliquée']].map(([t, a]) => (
          <div key={t} className="etape-fiche"><span><b>{t}</b><span>{a}</span></span></div>
        ))}
      </div>
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
    </Fenetre>
  );
}
