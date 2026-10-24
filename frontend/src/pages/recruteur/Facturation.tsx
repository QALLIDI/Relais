import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur, telecharger } from '../../api/client';
import { dateFr, libelleStatutFacture, mad, n } from '../../api/format';
import type { Entreprise, FacturationStats, Facture, Placement } from '../../api/types';
import { Chargement, Erreur, Kpi, Modal, Pill, toneFacture } from '../../components/ui';

export default function Facturation() {
  const qc = useQueryClient();
  const [nouvelle, setNouvelle] = useState(false);
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

  return (
    <>
      <header className="header">
        <div>
          <h1>Facturation</h1>
          <div className="muted">Montants en MAD HT</div>
        </div>
        <button className="btn" onClick={() => setNouvelle(true)}>Nouvelle facture</button>
      </header>
      <section className="grid-auto" aria-label="Synthèse">
        <Kpi label="Facturé ce mois" value={n(stats.data?.factureCeMois)} />
        <Kpi label="Encaissé ce mois" value={n(stats.data?.encaisseCeMois)} tone="ok" />
        <Kpi label="En attente" value={n(stats.data?.enAttente)} tone="warn" />
        <Kpi label="En retard" value={n(stats.data?.enRetard)} tone="bad" />
      </section>
      {action.error && <Erreur message={messageErreur(action.error)} />}

      <div className="row">
        <section className="card grow-main">
          <h2 style={{ marginBottom: 12 }}>Factures</h2>
          {factures.isLoading && <Chargement />}
          <div className="table-wrap">
            <table>
              <thead><tr><th>N°</th><th>Client</th><th>Objet</th><th className="num">HT</th><th>Échéance</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {factures.data?.map((f) => (
                  <tr key={f.id}>
                    <td className="mono small">{f.numero ?? 'Brouillon'}</td>
                    <td><b>{f.entrepriseNom}</b></td>
                    <td className="muted">{f.objet}</td>
                    <td className="num">{n(f.montantHt)}</td>
                    <td>{dateFr(f.echeance)}</td>
                    <td><Pill tone={toneFacture(f.statut)}>{libelleStatutFacture[f.statut]}</Pill></td>
                    <td>
                      <div className="actions" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        {f.statut === 'BROUILLON' && <button className="btn small primary" onClick={() => action.mutate({ id: f.id, verbe: 'emettre' })}>Émettre</button>}
                        {(f.statut === 'EMISE' || f.statut === 'EN_RETARD') && <button className="btn small" onClick={() => action.mutate({ id: f.id, verbe: 'payer' })}>Payée</button>}
                        <button className="btn small" onClick={() => telecharger(`/api/factures/${f.id}/pdf`, 'facture.pdf')}>PDF</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {brouillon && placementBrouillon && (
          <aside className="card accent stack grow-side" aria-label="Placement à facturer">
            <div className="small" style={{ fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Placement à facturer</div>
            <div>
              <h2>{placementBrouillon.candidatNom} · {placementBrouillon.missionIntitule}</h2>
              <div className="muted">{placementBrouillon.entrepriseNom} · embauche le {dateFr(placementBrouillon.dateEmbauche)}</div>
            </div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 16px', fontSize: 14 }}>
              <dt className="muted">Salaire annuel brut</dt><dd className="mono" style={{ margin: 0 }}>{n(placementBrouillon.salaireAnnuel)}</dd>
              <dt className="muted">Honoraires</dt><dd className="mono" style={{ margin: 0 }}>{placementBrouillon.tauxHonoraires} %</dd>
              <dt className="muted">Montant HT</dt><dd className="mono" style={{ margin: 0 }}>{n(brouillon.montantHt)}</dd>
              <dt className="muted">TVA</dt><dd className="mono" style={{ margin: 0 }}>{n(brouillon.montantTva)}</dd>
              <dt style={{ fontWeight: 600 }}>Total TTC</dt><dd className="mono" style={{ margin: 0, fontWeight: 600 }}>{n(brouillon.montantTtc)}</dd>
            </dl>
            <div className="muted small">Garantie de remplacement jusqu'au {dateFr(placementBrouillon.finGarantie)}.</div>
            <button className="btn primary" onClick={() => action.mutate({ id: brouillon.id, verbe: 'emettre' })}>Émettre la facture</button>
          </aside>
        )}
      </div>

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
