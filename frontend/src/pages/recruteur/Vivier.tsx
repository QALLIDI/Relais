import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import { initiales, libelleNiveau, mad } from '../../api/format';
import type { CandidatResume, VivierStats } from '../../api/types';
import { Chargement, Icone, Tags, TEINTES, Vide } from '../../components/ui';

const DISPOS = [
  { cle: '', libelle: 'Toutes' },
  { cle: 'IMMEDIATE', libelle: 'Immédiate' },
  { cle: 'UN_MOIS', libelle: 'Sous 1 mois' },
  { cle: 'TROIS_MOIS', libelle: 'Sous 3 mois' },
];
const VIDE = { q: '', ville: '', niveau: '', disponibilite: '', competence: '', secteur: '' };

export default function Vivier() {
  const [params] = useSearchParams();
  const [filtres, setFiltres] = useState({ ...VIDE, q: params.get('q') ?? '' });
  const [appliques, setAppliques] = useState(filtres);
  const requete = Object.fromEntries(Object.entries(appliques).filter(([, v]) => v));
  const resultats = useQuery({
    queryKey: ['candidats', requete],
    queryFn: async () => (await api.get<CandidatResume[]>('/api/candidats', { params: requete })).data,
  });
  const stats = useQuery({ queryKey: ['candidats', 'stats'], queryFn: async () => (await api.get<VivierStats>('/api/candidats/stats')).data });
  const maj = (k: keyof typeof filtres) => (e: { target: { value: string } }) => setFiltres({ ...filtres, [k]: e.target.value });
  const choisirDispo = (d: string) => { const f = { ...filtres, disponibilite: d }; setFiltres(f); setAppliques(f); };

  return (
    <>
      <section className="header">
        <div>
          <h1>Vivier de candidats</h1>
          <div className="sub">
            {stats.data ? `${stats.data.total} profils · ${stats.data.ajoutesCeMois} ajoutés ce mois` : ''}
            {appliques.q ? ` · recherche « ${appliques.q} »` : ''}
          </div>
        </div>
        <div className="actions">
          <div className="tabs" role="group" aria-label="Disponibilité">
            {DISPOS.map((d) => (
              <button key={d.cle} className={`tab ${appliques.disponibilite === d.cle ? 'on' : ''}`} aria-pressed={appliques.disponibilite === d.cle} onClick={() => choisirDispo(d.cle)}>{d.libelle}</button>
            ))}
          </div>
          <Link className="btn primary" to="/recruteur/vivier/nouveau">Ajouter un candidat</Link>
        </div>
      </section>

      <form role="search" onSubmit={(e) => { e.preventDefault(); setAppliques(filtres); }} style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="q" className="sr-only">Rechercher dans le vivier</label>
        <input id="q" className="input" style={{ flex: 1, background: 'var(--surface)' }} type="search"
          placeholder="Rechercher : nom, titre, compétence…" value={filtres.q} onChange={maj('q')} />
        <button type="submit" className="ico" aria-label="Rechercher"><Icone nom="loupe" /></button>
      </form>

      <div className="row">
        <div className="grow-main" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
          {resultats.isLoading && <Chargement />}
          {resultats.data?.length === 0 && <Vide>Aucun profil ne correspond à ces critères.</Vide>}
          {resultats.data?.map((c, i) => (
            <article key={c.id} className="card" style={{ padding: 10, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={TEINTES[i % 5]} style={{ position: 'relative', height: 128, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.niveau && <span className="pill dark" style={{ position: 'absolute', top: 10, left: 10, fontWeight: 400, fontSize: 11 }}>{libelleNiveau[c.niveau]}</span>}
                <span style={{ position: 'absolute', top: 10, right: 10, background: 'var(--surface)', color: 'var(--ink)', fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 9px' }}>{mad(c.pretentionSalaire)}</span>
                <span style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--surface)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, boxShadow: 'var(--shadow)' }} aria-hidden="true">{initiales(c.nomComplet)}</span>
              </div>
              <div style={{ padding: '0 6px' }}>
                <Link to={`/recruteur/vivier/${c.id}`} style={{ fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>{c.nomComplet}</Link>
                <div className="muted small">{c.titre} · {c.anneesExperience} ans</div>
              </div>
              <div style={{ padding: '0 6px' }}><Tags items={c.competences.slice(0, 4)} /></div>
              <div style={{ padding: '0 6px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="small" style={{ color: c.disponibilite === 'TROIS_MOIS' ? 'var(--warn)' : 'var(--ok)' }}>{c.ville ?? '—'} · {c.disponibiliteLibelle}</span>
                <Link to={`/recruteur/vivier/${c.id}`} className="ico" style={{ width: 36, height: 36, flexBasis: 36 }} aria-label={`Ouvrir la fiche de ${c.nomComplet}`}><Icone nom="fleche" taille={14} /></Link>
              </div>
            </article>
          ))}
        </div>

        <aside className="card stack grow-side" aria-label="Filtres">
          <div className="card-head" style={{ margin: 0 }}>
            <h2>Filtres</h2>
            <span className="muted small">{resultats.data?.length ?? 0} résultat(s)</span>
          </div>
          <label className="field">Ville<input value={filtres.ville} onChange={maj('ville')} /></label>
          <label className="field">Secteur<input value={filtres.secteur} onChange={maj('secteur')} /></label>
          <label className="field">Compétence exacte<input value={filtres.competence} onChange={maj('competence')} /></label>
          <label className="field">Niveau
            <select value={filtres.niveau} onChange={maj('niveau')}>
              <option value="">Tous</option><option value="JUNIOR">Junior</option><option value="CONFIRME">Confirmé</option><option value="SENIOR">Senior</option>
            </select>
          </label>
          <div className="actions">
            <button className="btn primary" onClick={() => setAppliques(filtres)}>Appliquer</button>
            <button className="btn" onClick={() => { setFiltres(VIDE); setAppliques(VIDE); }}>Effacer</button>
          </div>
        </aside>
      </div>
    </>
  );
}
