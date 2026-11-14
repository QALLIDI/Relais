import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { api, messageErreur } from '../../api/client';
import type { Entreprise } from '../../api/types';
import { Link } from 'react-router';
import { initiales } from '../../api/format';
import { Chargement, Erreur, Icone, Modal, TetePage, Vide } from '../../components/ui';
import { DemandesRattachement } from './DemandesRattachement';

const MODELES: Record<string, string> = {
  POURCENTAGE: '% du salaire annuel',
  FORFAIT: 'Forfait par placement',
  ACOMPTE_ET_SOLDE: 'Acompte + solde',
  ABONNEMENT: 'Abonnement mensuel',
};

/** Conditions tarifaires en clair : « 18 % du salaire annuel », « Forfait par placement »… */
function tarif(e: Entreprise) {
  if (e.modeleTarif === 'POURCENTAGE' && e.tauxHonoraires) return `${e.tauxHonoraires} % du salaire annuel`;
  const modele = MODELES[e.modeleTarif ?? ''];
  if (!modele) return e.tauxHonoraires ? `${e.tauxHonoraires} % du salaire annuel` : null;
  return e.tauxHonoraires && e.modeleTarif !== 'FORFAIT' && e.modeleTarif !== 'ABONNEMENT' ? `${modele} · ${e.tauxHonoraires} %` : modele;
}

export default function Entreprises() {
  const qc = useQueryClient();
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState('');
  const entreprises = useQuery({ queryKey: ['entreprises'], queryFn: async () => (await api.get<Entreprise[]>('/api/entreprises')).data });
  const bas = q.trim().toLowerCase();
  const liste = (entreprises.data ?? []).filter((e) => !bas || [e.raisonSociale, e.secteur, e.ville, e.contacts[0]?.nom].some((v) => v?.toLowerCase().includes(bas)));
  const total = entreprises.data?.length ?? 0;

  return (
    <>
      <TetePage titre="Entreprises clientes" sous={entreprises.data ? `${total} entreprise${total > 1 ? 's' : ''} · ${(entreprises.data ?? []).reduce((s, e) => s + e.missionsOuvertes, 0)} mission(s) ouverte(s)` : undefined}>
        <button type="button" className="btn primary" onClick={() => setOuvert(true)}><Icone nom="plus" taille={16} />Nouvelle entreprise</button>
      </TetePage>
      <DemandesRattachement />
      <section className="bloc" aria-labelledby="ent-liste">
        <div className="bloc-tete">
          <h2 id="ent-liste">{bas ? `${liste.length} résultat${liste.length > 1 ? 's' : ''}` : 'Toutes les entreprises'}</h2>
          {total > 4 && (
            <label className="recherche-courte">
              <Icone nom="loupe" taille={16} /><span className="sr-only">Rechercher une entreprise</span>
              <input type="search" placeholder="Nom, secteur, ville…" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          )}
        </div>
        {entreprises.isLoading && <div className="bloc-corps"><Chargement /></div>}
        {entreprises.data && liste.length === 0 && (
          <div className="bloc-corps"><Vide>{total === 0 ? 'Aucune entreprise. Ajoutez votre premier client ou rattachez une demande d’accès.' : 'Aucune entreprise ne correspond.'}</Vide></div>
        )}
        {liste.length > 0 && (
          <div className="table-wrap">
            <table className="ent-table">
              <thead><tr><th>Entreprise</th><th>Contact principal</th><th>Conditions</th><th className="num">Missions ouvertes</th></tr></thead>
              <tbody>
                {liste.map((e) => {
                  const c = e.contacts[0];
                  const t = tarif(e);
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="personne" style={{ gap: 10 }}>
                          <span className="mono-av" aria-hidden="true">{initiales(e.raisonSociale)}</span>
                          <span style={{ minWidth: 0 }}>
                            <b className="ent-nom">{e.raisonSociale}</b>
                            <span className="muted small">{[e.secteur, e.ville, e.ice ? `ICE ${e.ice}` : null].filter(Boolean).join(' · ') || 'Informations à compléter'}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        {c ? (
                          <span className="ent-contact">
                            {c.nom}
                            {c.email && <a href={`mailto:${c.email}`} className="muted small">{c.email}</a>}
                          </span>
                        ) : <span className="muted small">Aucun contact</span>}
                      </td>
                      <td>{t ?? <span className="muted small">À définir</span>}</td>
                      <td className="num">{e.missionsOuvertes > 0 ? <Link to="/recruteur/missions" className="ent-missions">{e.missionsOuvertes}</Link> : <span className="muted">0</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small" style={{ margin: 0, padding: '12px 16px 16px' }}>
          Les comptes inscrits en ligne arrivent dans « Demandes d'accès ». Les collègues d'un client sont invités depuis son espace (page Équipe).
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
