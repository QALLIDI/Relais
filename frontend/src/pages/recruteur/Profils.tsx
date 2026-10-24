import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { initiales } from '../../api/format';
import type { Candidature, Groupe } from '../../api/types';
import { Barre, Chargement } from '../../components/ui';

const DIMENSIONS = [
  { cle: 'mission', libelle: 'Mission' },
  { cle: 'niveau', libelle: 'Niveau' },
  { cle: 'secteur', libelle: 'Secteur' },
  { cle: 'techno', libelle: 'Technologie' },
  { cle: 'ville', libelle: 'Ville' },
  { cle: 'disponibilite', libelle: 'Disponibilité' },
] as const;

type Personne = { id: string; nom: string; sous: string; dispo?: string };
type GroupeVue = { cle: string; nombre: number; personnes: Personne[] };

export default function Profils() {
  const [dim, setDim] = useState<(typeof DIMENSIONS)[number]['cle']>('mission');
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
        map.set(cle, [...(map.get(cle) ?? []), { id: c.candidatId, nom: c.candidatNom, sous: `${c.candidatTitre ?? ''} · ${c.etapeLibelle}`, dispo: c.candidatDisponibilite }]);
      });
      return [...map.entries()].map(([cle, personnes]) => ({ cle, nombre: personnes.length, personnes })).sort((a, b) => b.nombre - a.nombre);
    }
    return (groupes.data ?? []).map((g) => ({
      cle: g.libelle,
      nombre: g.nombre,
      personnes: g.candidats.map((c) => ({ id: c.id, nom: c.nomComplet, sous: `${c.titre ?? ''} · ${c.anneesExperience} ans · ${c.ville ?? ''}`, dispo: c.disponibiliteLibelle })),
    }));
  }, [dim, groupes.data, candidatures.data]);

  const filtreBas = filtre.trim().toLowerCase();
  const visibles = vue
    .map((g) => ({ ...g, personnes: filtreBas ? g.personnes.filter((p) => `${p.nom} ${p.sous}`.toLowerCase().includes(filtreBas)) : g.personnes }))
    .filter((g) => g.personnes.length > 0);
  const max = Math.max(1, ...vue.map((g) => g.nombre));
  const libelle = DIMENSIONS.find((d) => d.cle === dim)?.libelle.toLowerCase();
  const chargement = dim === 'mission' ? candidatures.isLoading : groupes.isLoading;

  return (
    <>
      <header className="header">
        <div>
          <h1>Profils regroupés</h1>
          <div className="muted">Regroupés par {libelle}</div>
        </div>
        <input className="input" type="search" aria-label="Filtrer les profils" placeholder="Filtrer : nom, compétence…" value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ minWidth: 260 }} />
      </header>

      <div className="tabs" role="group" aria-label="Regrouper par">
        <span className="small" style={{ fontWeight: 600, marginRight: 4 }}>Regrouper par</span>
        {DIMENSIONS.map((d) => (
          <button key={d.cle} className={`tab ${dim === d.cle ? 'on' : ''}`} aria-pressed={dim === d.cle} onClick={() => setDim(d.cle)}>{d.libelle}</button>
        ))}
      </div>

      {chargement && <Chargement />}
      <section className="card stack" aria-label="Répartition" style={{ gap: 8 }}>
        <div className="small" style={{ fontWeight: 600 }}>Répartition par {libelle}</div>
        {vue.map((g) => <Barre key={g.cle} label={g.cle} valeur={g.nombre} max={max} suffixe=" profils" />)}
        {dim === 'mission' && vue.length === 0 && !chargement && <p className="muted">Aucun candidat en cours de process.</p>}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
        {visibles.map((g) => (
          <section key={g.cle} className="card" style={{ paddingBottom: 8 }}>
            <div className="header" style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: 16 }}>{g.cle}</h2>
              <span className="muted small">{g.personnes.length} profil(s)</span>
            </div>
            {g.personnes.map((p) => (
              <Link key={`${g.cle}-${p.id}`} to={`/recruteur/vivier/${p.id}`} className="list-item" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
                <span className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'nowrap', minWidth: 0 }}>
                  <span className="avatar" style={{ width: 32, height: 32, flexBasis: 32, fontSize: 12 }} aria-hidden="true">{initiales(p.nom)}</span>
                  <span style={{ minWidth: 0 }}><b style={{ fontSize: 14 }}>{p.nom}</b><br /><span className="muted small">{p.sous}</span></span>
                </span>
                <span className="small" style={{ fontWeight: 600, color: p.dispo === 'Sous 3 mois' ? 'var(--warn)' : 'var(--ok)', whiteSpace: 'nowrap' }}>{p.dispo}</span>
              </Link>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
