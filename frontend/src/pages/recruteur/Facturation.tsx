import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur, telecharger } from '../../api/client';
import { dateCourte, dateFr, initiales, libelleStatutFacture, mad, n } from '../../api/format';
import type { Entreprise, FacturationStats, Facture, Placement } from '../../api/types';
import { Chargement, Erreur, Icone, Kpi, Modal, Pill, toneFacture, Vide } from '../../components/ui';
import { ListePropositions, PanneauProposition } from '../../components/Propositions';

const FILTRES: (Facture['statut'] | 'TOUTES')[] = ['TOUTES', 'BROUILLON', 'EMISE', 'EN_RETARD', 'PAYEE'];
const ICONES: Record<Facture['statut'], string> = { BROUILLON: 't-ink', EMISE: 't-peach', PAYEE: 't-green', EN_RETARD: 't-pink' };

export default function Facturation() {
  const qc = useQueryClient();
  const [nouvelle, setNouvelle] = useState(false);
  const [proposition, setProposition] = useState(false);
  const [message, setMessage] = useState('');
  const [filtre, setFiltre] = useState<Facture['statut'] | 'TOUTES'>('TOUTES');
  const stats = useQuery({ queryKey: ['facturation', 'stats'], queryFn: async () => (await api.get<FacturationStats>('/api/facturation/stats')).data });
  const factures = useQuery({ queryKey: ['factures'], queryFn: async () => (await api.get<Facture[]>('/api/factures')).data });
  const placements = useQuery({ queryKey: ['placements'], queryFn: async () => (await api.get<Placement[]>('/api/placements')).data });
  const rafraichir = () => { void qc.invalidateQueries({ queryKey: ['factures'] }); void qc.invalidateQueries({ queryKey: ['facturation'] }); };
  const action = useMutation({
    mutationFn: ({ id, verbe }: { id: string; verbe: 'emettre' | 'payer' }) => api.post(`/api/factures/${id}/${verbe}`),
    onSuccess: rafraichir,
  });
  const brouillon = factures.data?.find((f) => f.statut === 'BROUILLON' && f.placementId);
  const placementBrouillon = placements.data?.find((p) => p.id === brouillon?.placementId);
  const liste = factures.data?.filter((f) => filtre === 'TOUTES' || f.statut === filtre) ?? [];
  const enRetard = factures.data?.filter((f) => f.statut === 'EN_RETARD').length ?? 0;
  const tauxEncaisse = stats.data?.factureCeMois ? Math.round((stats.data.encaisseCeMois / stats.data.factureCeMois) * 100) : null;
  const aujourdhui = Date.now();
  const garanties = placements.data?.filter((p) => new Date(p.finGarantie).getTime() > aujourdhui) ?? [];

  return (
    <>
      <section className="header">
        <div className="stack" style={{ gap: 10 }}>
          <div>
            <h1>Facturation</h1>
            <div className="sub">Montants en MAD HT</div>
          </div>
          <button type="button" className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => setProposition(true)}>Nouvelle proposition commerciale <Icone nom="droite" taille={14} /></button>
        </div>
        <div className="kpis">
          <Kpi label="Facturé ce mois" value={n(stats.data?.factureCeMois)} />
          <Kpi label="Encaissé" value={n(stats.data?.encaisseCeMois)} note={tauxEncaisse != null ? `${tauxEncaisse} %` : undefined} tone="ok" />
          <Kpi label="En attente" value={n(stats.data?.enAttente)} />
          <Kpi label="En retard" value={n(stats.data?.enRetard)} note={enRetard ? `${enRetard} facture(s)` : undefined} tone={enRetard ? 'bad' : undefined} />
        </div>
      </section>
      {action.error && <Erreur message={messageErreur(action.error)} />}
      {message && <div className="alert info" role="status">{message}</div>}
      {proposition && <PanneauProposition onFermer={() => setProposition(false)} onFait={(p) => { setProposition(false); setMessage(`Proposition envoyée à ${p.entrepriseNom}.`); }} />}

      <div className="row">
        <section className="card grow-main">
          <div className="card-head">
            <h2>Factures</h2>
            <div className="actions">
              <div className="tabs" role="group" aria-label="Filtrer par statut">
                {FILTRES.map((f) => (
                  <button key={f} className={`tab ${filtre === f ? 'on' : ''}`} aria-pressed={filtre === f} onClick={() => setFiltre(f)} style={{ padding: '7px 14px', fontSize: 13 }}>
                    {f === 'TOUTES' ? 'Toutes' : libelleStatutFacture[f]}
                  </button>
                ))}
              </div>
              <button className="btn small primary" onClick={() => setNouvelle(true)}>Nouvelle facture</button>
            </div>
          </div>
          {factures.isLoading && <Chargement />}
          {liste.length === 0 && !factures.isLoading && <Vide>Aucune facture.</Vide>}
          {liste.map((f) => (
            <div key={f.id} className="tile">
              <span className={`avatar sq ${ICONES[f.statut]}`} style={{ width: 44, height: 44, flexBasis: 44, borderRadius: 14, fontSize: 12 }} aria-hidden="true">{initiales(f.entrepriseNom)}</span>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{f.entrepriseNom}</div>
                <div className="muted small">{f.numero ?? 'Brouillon'} · {f.objet}</div>
              </div>
              <span className="muted small" style={{ width: 110 }}>{f.echeance ? `Échéance ${dateCourte(f.echeance)}` : '—'}</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 500, minWidth: 92, textAlign: 'right' }}>{n(f.montantHt)}</span>
              <span style={{ width: 86, textAlign: 'center' }}><Pill tone={toneFacture(f.statut)}>{libelleStatutFacture[f.statut]}</Pill></span>
              <div className="actions" style={{ gap: 4, flexWrap: 'nowrap', minWidth: 180, justifyContent: 'flex-end' }}>
                {f.statut === 'BROUILLON' && <button className="btn small accent" onClick={() => action.mutate({ id: f.id, verbe: 'emettre' })}>Émettre</button>}
                {(f.statut === 'EMISE' || f.statut === 'EN_RETARD') && <button className="btn small" style={{ background: 'var(--surface)' }} onClick={() => action.mutate({ id: f.id, verbe: 'payer' })}>Marquer payée</button>}
                {f.statut !== 'BROUILLON' && <button className="btn small" style={{ background: 'var(--surface)' }} onClick={() => telecharger(`/api/factures/${f.id}/pdf`, 'facture.pdf')}>PDF</button>}
              </div>
            </div>
          ))}
        </section>

        <aside className="stack grow-side" style={{ gap: 16 }} aria-label="Placements">
          {brouillon && placementBrouillon && (
            <section className="card accent stack" style={{ gap: 14 }}>
              <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: 22, fontWeight: 400, lineHeight: 1.15 }}>Placement<br />à facturer</h2>
                <span className="pill veil">Brouillon</span>
              </div>
              <div style={{ fontSize: 14 }}>
                {placementBrouillon.candidatNom} · {placementBrouillon.missionIntitule}<br />
                {placementBrouillon.entrepriseNom} · embauche le {dateFr(placementBrouillon.dateEmbauche)}
              </div>
              <dl className="box dl" style={{ gridTemplateColumns: '1fr auto' }}>
                <dt>Salaire annuel</dt><dd className="mono">{n(placementBrouillon.salaireAnnuel)}</dd>
                <dt>Honoraires {placementBrouillon.tauxHonoraires} %</dt><dd className="mono">{n(brouillon.montantHt)}</dd>
                <dt>TVA</dt><dd className="mono">{n(brouillon.montantTva)}</dd>
                <dt style={{ color: 'inherit', fontWeight: 600, borderTop: '1px solid var(--line)', paddingTop: 8 }}>Total TTC</dt>
                <dd className="mono" style={{ fontWeight: 600, borderTop: '1px solid var(--line)', paddingTop: 8 }}>{n(brouillon.montantTtc)}</dd>
              </dl>
              <button className="btn primary" onClick={() => action.mutate({ id: brouillon.id, verbe: 'emettre' })}>Émettre la facture</button>
            </section>
          )}
          <section className="card stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 17 }}>Garanties en cours</h2>
            {garanties.length === 0 && <Vide>Aucune garantie de remplacement en cours.</Vide>}
            {garanties.map((p) => {
              const debut = new Date(p.dateEmbauche).getTime();
              const fin = new Date(p.finGarantie).getTime();
              const pct = Math.min(100, Math.max(0, Math.round(((aujourdhui - debut) / Math.max(1, fin - debut)) * 100)));
              return (
                <div key={p.id} className="stack" style={{ gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                    <span>{p.candidatNom} · {p.entrepriseNom}</span><span className="muted">jusqu'au {dateCourte(p.finGarantie)}</span>
                  </div>
                  <div className="progress" role="img" aria-label={`Garantie écoulée à ${pct} %`} style={{ display: 'block', height: 8, borderRadius: 999, background: 'var(--line)' }}>
                    <div style={{ width: `${pct}%`, height: 8, background: 'var(--accent)' }} />
                  </div>
                </div>
              );
            })}
          </section>
        </aside>
      </div>

      <ListePropositions />

      <section className="card">
        <h2 style={{ marginBottom: 12 }}>Placements</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Candidat</th><th>Client</th><th>Poste</th><th className="num">Salaire</th><th>Embauche</th><th>Fin de garantie</th></tr></thead>
            <tbody>
              {placements.data?.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.candidatNom}</b></td><td>{p.entrepriseNom}</td><td>{p.missionIntitule}</td>
                  <td className="num">{mad(p.salaireAnnuel)}</td><td>{dateFr(p.dateEmbauche)}</td><td>{dateFr(p.finGarantie)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {nouvelle && <NouvelleFacture onClose={() => setNouvelle(false)} onFait={() => { setNouvelle(false); rafraichir(); }} />}
    </>
  );
}

function NouvelleFacture({ onClose, onFait }: { onClose: () => void; onFait: () => void }) {
  const entreprises = useQuery({ queryKey: ['entreprises'], queryFn: async () => (await api.get<Entreprise[]>('/api/entreprises')).data });
  const [entrepriseId, setEntrepriseId] = useState('');
  const [objet, setObjet] = useState('Acompte · ');
  const [montant, setMontant] = useState('');
  const creer = useMutation({
    mutationFn: () => {
      const e = entreprises.data?.find((x) => x.id === entrepriseId);
      return api.post('/api/factures', { entrepriseId, entrepriseNom: e?.raisonSociale, contactEmail: e?.contacts[0]?.email, objet, montantHt: Number(montant) });
    },
    onSuccess: onFait,
  });
  return (
    <Modal titre="Nouvelle facture (acompte, abonnement…)" onClose={onClose}>
      <label className="field">Client
        <select value={entrepriseId} onChange={(e) => setEntrepriseId(e.target.value)}>
          <option value="">Choisir…</option>
          {entreprises.data?.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
        </select>
      </label>
      <label className="field">Objet<input value={objet} onChange={(e) => setObjet(e.target.value)} /></label>
      <label className="field">Montant HT (MAD)<input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} /></label>
      {creer.error && <Erreur message={messageErreur(creer.error)} />}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!entrepriseId || !montant || creer.isPending} onClick={() => creer.mutate()}>Créer le brouillon</button>
      </div>
    </Modal>
  );
}
