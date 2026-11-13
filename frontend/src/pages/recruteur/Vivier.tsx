import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import { initiales, libelleNiveau, mad } from '../../api/format';
import type { CandidatResume, VivierStats } from '../../api/types';
import { Chargement, Icone, Segments, TetePage, Vide } from '../../components/ui';

type Dispo = '' | 'IMMEDIATE' | 'UN_MOIS' | 'TROIS_MOIS';
const DISPOS: { v: Dispo; l: string }[] = [
  { v: '', l: 'Toutes' },
  { v: 'IMMEDIATE', l: 'Immédiate' },
  { v: 'UN_MOIS', l: 'Sous 1 mois' },
  { v: 'TROIS_MOIS', l: 'Sous 3 mois' },
];
const VIDE = { q: '', ville: '', niveau: '', disponibilite: '' as Dispo, competence: '', secteur: '' };
type Filtres = typeof VIDE;

const tonDispo = (d?: string) => (d === 'IMMEDIATE' || d === 'UN_MOIS' ? 'ok' : 'attente');
const experience = (ans?: number | null) => (ans && ans > 0 ? `${ans} an${ans > 1 ? 's' : ''}` : null);

export default function Vivier() {
  const naviguer = useNavigate();
  const [params] = useSearchParams();
  const [filtres, setFiltres] = useState<Filtres>({ ...VIDE, q: params.get('q') ?? '' });
  const [appliques, setAppliques] = useState<Filtres>(filtres);
  const requete = Object.fromEntries(Object.entries(appliques).filter(([, v]) => v));
  const resultats = useQuery({
    queryKey: ['candidats', requete],
    queryFn: async () => (await api.get<CandidatResume[]>('/api/candidats', { params: requete })).data,
  });
  const stats = useQuery({ queryKey: ['candidats', 'stats'], queryFn: async () => (await api.get<VivierStats>('/api/candidats/stats')).data });

  const maj = (k: keyof Filtres) => (e: { target: { value: string } }) => setFiltres({ ...filtres, [k]: e.target.value });
  const appliquer = (f: Filtres) => { setFiltres(f); setAppliques(f); };
  const envoyer = (e: FormEvent) => { e.preventDefault(); setAppliques(filtres); };
  // Filtres avancés actifs (hors recherche libre et disponibilité, qui ont leur propre contrôle).
  const actifs = (['ville', 'secteur', 'competence', 'niveau'] as const).filter((k) => appliques[k]).length;
  const modifie = JSON.stringify(filtres) !== JSON.stringify(appliques);
  const liste = resultats.data ?? [];

  return (
    <>
      <TetePage titre="Vivier de candidats" sous={stats.data ? `${stats.data.total} profils · ${stats.data.ajoutesCeMois} ajoutés ce mois` : undefined}>
        <Segments label="Disponibilité" options={DISPOS} valeur={appliques.disponibilite} onChange={(d) => appliquer({ ...filtres, disponibilite: d })} />
        <Link className="btn primary" to="/recruteur/vivier/nouveau"><Icone nom="plus" taille={16} />Ajouter un candidat</Link>
      </TetePage>

      <form role="search" className="bloc vv-filtres" onSubmit={envoyer} aria-label="Rechercher dans le vivier">
        <label className="recherche-courte vv-q">
          <Icone nom="loupe" taille={16} />
          <span className="sr-only">Nom, titre ou compétence</span>
          <input type="search" placeholder="Nom, titre, compétence…" value={filtres.q} onChange={maj('q')} />
        </label>
        <label className="vv-champ"><span>Ville</span><input value={filtres.ville} onChange={maj('ville')} placeholder="Toutes" /></label>
        <label className="vv-champ"><span>Secteur</span><input value={filtres.secteur} onChange={maj('secteur')} placeholder="Tous" /></label>
        <label className="vv-champ"><span>Compétence</span><input value={filtres.competence} onChange={maj('competence')} placeholder="ex. Java" /></label>
        <label className="vv-champ"><span>Niveau</span>
          <select value={filtres.niveau} onChange={(e) => appliquer({ ...filtres, niveau: e.target.value })}>
            <option value="">Tous</option><option value="JUNIOR">Junior</option><option value="CONFIRME">Confirmé</option><option value="SENIOR">Senior</option>
          </select>
        </label>
        <div className="vv-boutons">
          <button type="submit" className={`btn ${modifie ? 'primary' : ''}`}>Rechercher</button>
          {(actifs > 0 || appliques.q || appliques.disponibilite) && (
            <button type="button" className="btn" onClick={() => appliquer(VIDE)}>Effacer</button>
          )}
        </div>
      </form>

      <section className="bloc" aria-labelledby="resultats">
        <div className="bloc-tete">
          <h2 id="resultats">{resultats.isLoading ? 'Recherche…' : `${liste.length} profil${liste.length > 1 ? 's' : ''}`}</h2>
          {appliques.q && <span className="lien-discret">recherche « {appliques.q} »{actifs ? ` · ${actifs} filtre${actifs > 1 ? 's' : ''}` : ''}</span>}
        </div>
        {resultats.isLoading ? <div className="bloc-corps"><Chargement /></div>
          : liste.length === 0 ? <div className="bloc-corps"><Vide>Aucun profil ne correspond à ces critères.</Vide></div>
          : (
            <div className="table-wrap">
              <table className="vv-table">
                <thead>
                  <tr><th>Candidat</th><th>Niveau</th><th className="vv-col-comp">Compétences</th><th>Ville</th><th className="num vv-col-sal">Prétention</th><th>Disponibilité</th><th aria-label="Ouvrir" /></tr>
                </thead>
                <tbody>
                  {liste.map((c) => {
                    const sous = [c.titre, experience(c.anneesExperience)].filter(Boolean).join(' · ') || 'Profil à compléter';
                    const reste = c.competences.length - 3;
                    return (
                      <tr key={c.id} onClick={() => naviguer(`/recruteur/vivier/${c.id}`)}>
                        <td>
                          <div className="personne" style={{ gap: 10 }}>
                            <span className={`mono-av ${c.disponibilite === 'IMMEDIATE' ? 'vv-dispo' : ''}`} aria-hidden="true">{initiales(c.nomComplet)}</span>
                            <span style={{ minWidth: 0 }}>
                              <Link to={`/recruteur/vivier/${c.id}`} className="nom vv-nom" onClick={(e) => e.stopPropagation()}>{c.nomComplet}</Link>
                              <span className="sous vv-sous">{sous}</span>
                            </span>
                          </div>
                        </td>
                        <td>{c.niveau ? <span className="pill neutral">{libelleNiveau[c.niveau]}</span> : <span className="muted">—</span>}</td>
                        <td className="vv-col-comp">
                          <div className="tags">
                            {c.competences.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}
                            {reste > 0 && <span className="tag contour" title={c.competences.slice(3).join(', ')}>+{reste}</span>}
                          </div>
                        </td>
                        <td className="muted">{c.ville ?? '—'}</td>
                        <td className="num muted vv-col-sal">{mad(c.pretentionSalaire)}</td>
                        <td><span className={`grp-dispo ${tonDispo(c.disponibilite)}`}>{c.disponibiliteLibelle}</span></td>
                        <td className="num"><Icone nom="droite" taille={16} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </>
  );
}
