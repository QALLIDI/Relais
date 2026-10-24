import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { api, messageErreur } from '../../api/client';
import type { Entreprise } from '../../api/types';
import { Chargement, Erreur, Modal } from '../../components/ui';

const MODELES: Record<string, string> = {
  POURCENTAGE: '% du salaire annuel',
  FORFAIT: 'Forfait par placement',
  ACOMPTE_ET_SOLDE: 'Acompte + solde',
  ABONNEMENT: 'Abonnement mensuel',
};

export default function Entreprises() {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const entreprises = useQuery({ queryKey: ['entreprises'], queryFn: async () => (await api.get<Entreprise[]>('/api/entreprises')).data });

  return (
    <>
      <header className="header">
        <h1>Entreprises clientes</h1>
        <button className="btn primary" onClick={() => setOuvert(true)}>Nouvelle entreprise</button>
      </header>
      <section className="card">
        {entreprises.isLoading && <Chargement />}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Entreprise</th><th>Secteur</th><th>Ville</th><th>Contact principal</th><th>Tarification</th><th className="num">Missions ouvertes</th></tr></thead>
            <tbody>
              {entreprises.data?.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.raisonSociale}</b><div className="muted small">ICE {e.ice ?? '—'}</div></td>
                  <td>{e.secteur}</td>
                  <td>{e.ville}</td>
                  <td>{e.contacts[0] ? <>{e.contacts[0].nom}<div className="muted small">{e.contacts[0].email}</div></> : '—'}</td>
                  <td>{MODELES[e.modeleTarif ?? ''] ?? '—'}{e.tauxHonoraires ? ` · ${e.tauxHonoraires} %` : ''}</td>
                  <td className="num">{e.missionsOuvertes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>
          Pour donner l'accès à l'espace entreprise : créez le compte dans Keycloak (rôle ENTREPRISE) et renseignez l'attribut <code>entrepriseId</code> avec l'identifiant de l'entreprise.
        </p>
      </section>
      {ouvert && <NouvelleEntreprise onClose={() => setOuvert(false)} onFait={() => { setOuvert(false); void qc.invalidateQueries({ queryKey: ['entreprises'] }); }} />}
    </>
  );
}

function NouvelleEntreprise({ onClose, onFait }: { onClose: () => void; onFait: () => void }) {
  const [f, setF] = useState({ raisonSociale: '', ice: '', secteur: '', ville: '', taille: '', modeleTarif: 'POURCENTAGE', tauxHonoraires: '15', acompte: '', contactNom: '', contactFonction: '', contactEmail: '' });
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const creer = useMutation({
    mutationFn: () => api.post('/api/entreprises', {
      raisonSociale: f.raisonSociale, ice: f.ice || undefined, secteur: f.secteur || undefined, ville: f.ville || undefined, taille: f.taille || undefined,
      modeleTarif: f.modeleTarif, tauxHonoraires: f.tauxHonoraires ? Number(f.tauxHonoraires) : undefined, acompte: f.acompte ? Number(f.acompte) : undefined,
      contacts: f.contactEmail ? [{ nom: f.contactNom, fonction: f.contactFonction, email: f.contactEmail }] : [],
    }),
    onSuccess: onFait,
  });
  const soumettre = (e: FormEvent) => { e.preventDefault(); creer.mutate(); };
  return (
    <Modal titre="Nouvelle entreprise" onClose={onClose}>
      <form className="stack" onSubmit={soumettre}>
        <label className="field">Raison sociale<input required value={f.raisonSociale} onChange={maj('raisonSociale')} /></label>
        <div className="form-grid">
          <label className="field">ICE<input value={f.ice} onChange={maj('ice')} /></label>
          <label className="field">Secteur<input value={f.secteur} onChange={maj('secteur')} /></label>
          <label className="field">Ville<input value={f.ville} onChange={maj('ville')} /></label>
          <label className="field">Taille<input value={f.taille} onChange={maj('taille')} placeholder="50-200" /></label>
          <label className="field">Tarification
            <select value={f.modeleTarif} onChange={maj('modeleTarif')}>{Object.entries(MODELES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label className="field">Taux (% du salaire)<input type="number" step="0.5" value={f.tauxHonoraires} onChange={maj('tauxHonoraires')} /></label>
        </div>
        <h2 style={{ fontSize: 15 }}>Contact principal</h2>
        <div className="form-grid">
          <label className="field">Nom<input value={f.contactNom} onChange={maj('contactNom')} /></label>
          <label className="field">Fonction<input value={f.contactFonction} onChange={maj('contactFonction')} /></label>
          <label className="field">E-mail<input type="email" value={f.contactEmail} onChange={maj('contactEmail')} /></label>
        </div>
        {creer.error && <Erreur message={messageErreur(creer.error)} />}
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button type="submit" className="btn primary" disabled={creer.isPending}>Créer</button>
        </div>
      </form>
    </Modal>
  );
}
