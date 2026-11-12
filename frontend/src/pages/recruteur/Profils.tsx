import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { initiales } from '../../api/format';
import type { Candidature, Groupe } from '../../api/types';
import { Chargement, Icone, Segments, TetePage, Vide } from '../../components/ui';

type Dimension = 'mission' | 'niveau' | 'secteur' | 'techno' | 'ville' | 'disponibilite';
const DIMENSIONS: { v: Dimension; l: string }[] = [
  { v: 'mission', l: 'Mission' },
  { v: 'niveau', l: 'Niveau' },
  { v: 'secteur', l: 'Secteur' },
  { v: 'techno', l: 'Technologie' },
  { v: 'ville', l: 'Ville' },
  { v: 'disponibilite', l: 'Disponibilité' },
];

/** Teintes de la répartition, du bleu d'action au plus clair ; la légende porte les libellés, jamais la barre. */
const TEINTES_GROUPE = ['#2f6fb8', '#4a8fdb', '#7fb0e8', '#1f4f87', '#a9cdf5', '#8b97a8'];
const teinteGroupe = (rang: number) => TEINTES_GROUPE[rang % TEINTES_GROUPE.length];

type Personne = { id: string; nom: string; sous: string; dispo?: string };
type GroupeVue = { cle: string; nombre: number; personnes: Personne[] };

/** Sous-titre d'un profil : seules les informations renseignées, sans « 0 ans » ni séparateurs orphelins. */
function sousTitre(...parts: (string | null | undefined | false)[]) {
  const t = parts.filter((p): p is string => !!p && p.trim() !== '').join(' · ');
  return t || 'Profil à compléter';
}
const experience = (ans?: number | null) => (ans && ans > 0 ? `${ans} an${ans > 1 ? 's' : ''}` : null);

function tonDispo(dispo?: string) {
  if (!dispo) return '';
  return /imm[ée]diate|1 mois/i.test(dispo) ? 'ok' : 'attente';
}

export default function Profils() {
  const [dim, setDim] = useState<Dimension>('mission');
  const [filtre, setFiltre] = useState('');

  const groupes = useQuery({
    queryKey: ['groupes', dim],
    queryFn: async () => (await api.get<Groupe[]>('/api/candidats/groupes', { params: { par: dim } })).data,
    enabled: dim !== 'mission',
  });
  const candidatures = useQuery({
    queryKey: ['candidatures', 'en-cours'],
    queryFn: async () => (await api.get<Candidature[]>('/api/candidatures')).data,
    enabled: dim === 'mission',
  });

  // Par mission, les données viennent du pipeline ; sinon du vivier.
  const vue: GroupeVue[] = useMemo(() => {
    if (dim === 'mission') {
      const map = new Map<string, Personne[]>();
      candidatures.data?.forEach((c) => {
        const cle = `${c.missionIntitule} · ${c.entrepriseNom}`;
        map.set(cle, [...(map.get(cle) ?? []), { id: c.candidatId, nom: c.candidatNom, sous: sousTitre(c.candidatTitre, c.etapeLibelle), dispo: c.candidatDisponibilite }]);
      });
      return [...map.entries()].map(([cle, personnes]) => ({ cle, nombre: personnes.length, personnes })).sort((a, b) => b.nombre - a.nombre);
    }
    return (groupes.data ?? []).map((g) => ({
      cle: g.libelle,
      nombre: g.nombre,
      personnes: g.candidats.map((c) => ({ id: c.id, nom: c.nomComplet, sous: sousTitre(c.titre, experience(c.anneesExperience), c.ville), dispo: c.disponibiliteLibelle })),
    }));
  }, [dim, groupes.data, candidatures.data]);

  const filtreBas = filtre.trim().toLowerCase();
  const visibles = vue
    .map((g, rang) => ({ ...g, rang, personnes: filtreBas ? g.personnes.filter((p) => `${p.nom} ${p.sous}`.toLowerCase().includes(filtreBas)) : g.personnes }))
    .filter((g) => g.personnes.length > 0);
  const libelle = DIMENSIONS.find((d) => d.v === dim)?.l.toLowerCase();
  const chargement = dim === 'mission' ? candidatures.isLoading : groupes.isLoading;
  const total = vue.reduce((s, g) => s + g.nombre, 0);

  return (
    <>
      <TetePage titre="Profils regroupés" sous={`${total} profil${total > 1 ? 's' : ''} · regroupés par ${libelle}`}>
        <Segments label="Regrouper par" options={DIMENSIONS} valeur={dim} onChange={setDim} />
      </TetePage>

      {vue.length > 0 && (
        <section className="bloc grp-repartition" aria-labelledby="repartition">
          <div className="grp-repartition-tete">
            <div>
              <h2 id="repartition" className="grp-surtitre">Répartition</h2>
              <b className="grp-nombre">{vue.length} groupe{vue.length > 1 ? 's' : ''}</b>
            </div>
            <label className="recherche-courte grp-filtre">
              <Icone nom="loupe" taille={16} />
              <span className="sr-only">Filtrer les profils</span>
              <input type="search" placeholder="Filtrer : nom, compétence…" value={filtre} onChange={(e) => setFiltre(e.target.value)} />
            </label>
          </div>
          <div className="grp-barre" aria-hidden="true">
            {vue.map((g, i) => <span key={g.cle} style={{ flexGrow: g.nombre, background: teinteGroupe(i) }} />)}
          </div>
          <ul className="grp-legende">
            {vue.map((g, i) => (
              <li key={g.cle}>
                <a href={`#groupe-${i}`}>
                  <i style={{ background: teinteGroupe(i) }} aria-hidden="true" />
                  <span className="nom">{g.cle}</span>
                  <span className="nb">{g.nombre}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {chargement && <Chargement />}
      {!chargement && vue.length === 0 && <Vide>{dim === 'mission' ? 'Aucun candidat en cours de process.' : 'Aucun profil à regrouper.'}</Vide>}
      {!chargement && vue.length > 0 && visibles.length === 0 && <Vide>Aucun profil ne correspond à « {filtre} ».</Vide>}

      <div className="grp-colonnes">
        {visibles.map((g) => (
          <section key={g.cle} id={`groupe-${g.rang}`} className="bloc grp-carte" aria-labelledby={`groupe-${g.rang}-titre`}>
            <div className="grp-carte-tete">
              <i style={{ background: teinteGroupe(g.rang) }} aria-hidden="true" />
              <h2 id={`groupe-${g.rang}-titre`}>{g.cle}</h2>
              <span className="pill neutral">{g.personnes.length}</span>
            </div>
            <ul className="grp-liste">
              {g.personnes.map((x) => (
                <li key={`${g.cle}-${x.id}`}>
                  <Link to={`/recruteur/vivier/${x.id}`}>
                    <span className="mono-av" aria-hidden="true">{initiales(x.nom)}</span>
                    <span className="txt">
                      <span className="ligne"><b>{x.nom}</b>{x.dispo && <span className={`grp-dispo ${tonDispo(x.dispo)}`}>{x.dispo}</span>}</span>
                      <span className="sous">{x.sous}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
