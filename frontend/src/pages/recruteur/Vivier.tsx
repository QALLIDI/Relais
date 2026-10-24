import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { initiales, mad } from '../../api/format';
import type { CandidatResume, VivierStats } from '../../api/types';
import { Chargement, Tags } from '../../components/ui';

export default function Vivier() {
  const [filtres, setFiltres] = useState({ q: '', ville: '', niveau: '', disponibilite: '', competence: '', secteur: '' });
  const [appliques, setAppliques] = useState(filtres);
  const params = Object.fromEntries(Object.entries(appliques).filter(([, v]) => v));
  const resultats = useQuery({
    queryKey: ['candidats', params],
    queryFn: async () => (await api.get<CandidatResume[]>('/api/candidats', { params })).data,
  });
  const stats = useQuery({ queryKey: ['candidats', 'stats'], queryFn: async () => (await api.get<VivierStats>('/api/candidats/stats')).data });
  const maj = (k: keyof typeof filtres) => (e: { target: { value: string } }) => setFiltres({ ...filtres, [k]: e.target.value });

  return (
    <>
      <header className="header">
        <div>
          <h1>Vivier de candidats</h1>
          <div className="muted">{stats.data ? `${stats.data.total} profils · ${stats.data.ajoutesCeMois} ajoutés ce mois` : ''}</div>
        </div>
        <Link className="btn primary" to="/recruteur/vivier/nouveau">Ajouter un candidat</Link>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); setAppliques(filtres); }}>
        <input className="input" style={{ width: '100%', fontSize: 15, padding: '14px 16px' }} type="search" aria-label="Rechercher dans le vivier"
          placeholder="Rechercher : nom, titre, compétence…" value={filtres.q} onChange={maj('q')} />
      </form>

      <div className="row">
        <aside className="card stack grow-side" aria-label="Filtres">
          <h2 style={{ fontSize: 15 }}>Filtres</h2>
          <label className="field">Ville<input value={filtres.ville} onChange={maj('ville')} /></label>
          <label className="field">Secteur<input value={filtres.secteur} onChange={maj('secteur')} /></label>
          <label className="field">Compétence exacte<input value={filtres.competence} onChange={maj('competence')} /></label>
          <label className="field">Niveau
            <select value={filtres.niveau} onChange={maj('niveau')}>
              <option value="">Tous</option><option value="JUNIOR">Junior</option><option value="CONFIRME">Confirmé</option><option value="SENIOR">Senior</option>
            </select>
          </label>
          <label className="field">Disponibilité
            <select value={filtres.disponibilite} onChange={maj('disponibilite')}>
              <option value="">Toutes</option><option value="IMMEDIATE">Immédiate</option><option value="UN_MOIS">Sous 1 mois</option><option value="TROIS_MOIS">Sous 3 mois</option>
            </select>
          </label>
          <div className="actions">
            <button className="btn primary" onClick={() => setAppliques(filtres)}>Appliquer</button>
            <button className="btn" onClick={() => { const vide = { q: '', ville: '', niveau: '', disponibilite: '', competence: '', secteur: '' }; setFiltres(vide); setAppliques(vide); }}>Effacer</button>
          </div>
        </aside>

        <section className="card grow-main" aria-label="Résultats">
          <div className="muted" style={{ marginBottom: 8 }}>{resultats.data?.length ?? 0} résultat(s)</div>
          {resultats.isLoading && <Chargement />}
          {resultats.data?.map((c) => (
            <article key={c.id} className="list-item" style={{ flexWrap: 'wrap' }}>
              <div className="row" style={{ gap: 12, alignItems: 'center', flex: '1 1 320px' }}>
                <div className="avatar" aria-hidden="true">{initiales(c.nomComplet)}</div>
                <div className="stack" style={{ gap: 4 }}>
                  <span><Link to={`/recruteur/vivier/${c.id}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.nomComplet}</Link> <span className="muted small">{c.titre} · {c.anneesExperience} ans</span></span>
                  <Tags items={c.competences} />
                </div>
              </div>
              <div className="small" style={{ minWidth: 160 }}>
                <div>{c.ville ?? '—'}</div>
                <div style={{ color: c.disponibilite === 'TROIS_MOIS' ? 'var(--warn)' : 'var(--ok)' }}>{c.disponibiliteLibelle}</div>
              </div>
              <div className="small mono" style={{ minWidth: 120, textAlign: 'right' }}>{mad(c.pretentionSalaire)}</div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
