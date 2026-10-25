import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import { initiales, libelleNiveau, mad } from '../../api/format';
import type { CandidatResume, VivierStats } from '../../api/types';
import { Chargement, Icone, Pill, Tags, TEINTES, Vide } from '../../components/ui';

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
            <article key={c.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="personne">
                <span className={`avatar ${c.disponibilite === 'IMMEDIATE' ? 'en-ligne' : ''} ${TEINTES[i % 5]}`} style={{ width: 48, height: 48, flexBasis: 48, fontSize: 15 }} aria-hidden="true">{initiales(c.nomComplet)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link to={`/recruteur/vivier/${c.id}`} className="nom" style={{ fontSize: 16, textDecoration: 'none' }}>{c.nomComplet}</Link>
                  <div className="sous">{c.titre} · {c.anneesExperience} ans</div>
                </div>
                {c.niveau && <span className="pill dark">{libelleNiveau[c.niveau]}</span>}
              </div>
              <Tags items={c.competences.slice(0, 4)} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 'auto' }}>
                <Pill tone={c.disponibilite === 'IMMEDIATE' ? 'ok' : c.disponibilite === 'TROIS_MOIS' ? 'neutral' : 'warn'}>{c.disponibiliteLibelle}</Pill>
                <span className="small muted">{c.ville ?? '—'} · {mad(c.pretentionSalaire)}</span>
                <Link to={`/recruteur/vivier/${c.id}`} className="mini" aria-label={`Ouvrir la fiche de ${c.nomComplet}`}><Icone nom="fleche" taille={14} /></Link>
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
