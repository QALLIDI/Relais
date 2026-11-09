import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { initiales } from '../../api/format';
import type { Candidature, Groupe } from '../../api/types';
import { Chargement, TEINTES } from '../../components/ui';

const DIMENSIONS = [
  { cle: 'mission', libelle: 'Mission' },
  { cle: 'niveau', libelle: 'Niveau' },
  { cle: 'secteur', libelle: 'Secteur' },
  { cle: 'techno', libelle: 'Technologie' },
  { cle: 'ville', libelle: 'Ville' },
  { cle: 'disponibilite', libelle: 'Disponibilité' },
] as const;

/** Palette réduite : cartes de groupe neutres, barre de répartition dans les tons du bleu d'action. */
const PALETTE = [
  { carte: 'var(--surface-2)', barre: 'var(--accent-strong)' },
  { carte: 'var(--surface-2)', barre: '#3b7dc8' },
  { carte: 'var(--surface-2)', barre: 'var(--accent)' },
  { carte: 'var(--surface-2)', barre: '#5f9be0' },
  { carte: 'var(--surface-2)', barre: '#2a63a6' },
  { carte: 'var(--surface-2)', barre: '#6b6c71' },
];

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
    .map((g, rang) => ({ ...g, rang, personnes: filtreBas ? g.personnes.filter((p) => `${p.nom} ${p.sous}`.toLowerCase().includes(filtreBas)) : g.personnes }))
    .filter((g) => g.personnes.length > 0);
  const libelle = DIMENSIONS.find((d) => d.cle === dim)?.libelle.toLowerCase();
  const chargement = dim === 'mission' ? candidatures.isLoading : groupes.isLoading;
  const total = vue.reduce((s, g) => s + g.nombre, 0);

  return (
    <>
      <section className="header">
        <div>
          <h1>Profils regroupés</h1>
          <div className="sub">{total} profil(s) · regroupés par {libelle}</div>
        </div>
        <div className="tabs" role="group" aria-label="Regrouper par">
          {DIMENSIONS.map((d) => (
            <button key={d.cle} className={`tab ${dim === d.cle ? 'on' : ''}`} aria-pressed={dim === d.cle} onClick={() => setDim(d.cle)}>{d.libelle}</button>
          ))}
        </div>
      </section>

      <section className="card row" style={{ alignItems: 'center', gap: 24, padding: '20px 22px' }} aria-label="Répartition">
        <div style={{ flex: '0 0 auto' }}>
          <div className="muted small">Répartition</div>
          <div style={{ fontSize: 32, fontWeight: 500 }}>{vue.length} groupes</div>
        </div>
        <div className="repartition" role="img" aria-label={`Répartition par ${libelle} : ${vue.map((g) => `${g.cle} ${g.nombre}`).join(', ')}`} style={{ flex: '1 1 400px' }}>
          {vue.map((g, i) => (
            <div key={g.cle} title={`${g.cle} : ${g.nombre} profils`} style={{ flex: g.nombre, background: PALETTE[i % PALETTE.length].barre, color: '#fff' }}>{g.cle.split(' · ')[0]}</div>
          ))}
        </div>
        <label htmlFor="filtre" className="sr-only">Filtrer les profils</label>
        <input id="filtre" className="input" type="search" placeholder="Filtrer : nom, compétence…" value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ flex: '1 1 220px' }} />
      </section>

      {chargement && <Chargement />}
      {dim === 'mission' && vue.length === 0 && !chargement && <p className="muted">Aucun candidat en cours de process.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: 16, alignItems: 'start' }}>
        {visibles.map((g) => {
          const p = PALETTE[g.rang % PALETTE.length];
          return (
            <section key={g.cle} className="card stack" style={{ background: p.carte, padding: 20, gap: 14 }}>
              <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 20 }}>{g.cle}</h2>
                  <div className="small" style={{ color: 'var(--ink-2)' }}>{g.personnes.length} profil(s)</div>
                </div>
                <div style={{ display: 'flex' }} aria-hidden="true">
                  {g.personnes.slice(0, 3).map((x) => (
                    <span key={x.id} style={{ width: 34, height: 34, marginLeft: -8, borderRadius: '50%', border: '2px solid var(--surface)', background: p.barre, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{initiales(x.nom)}</span>
                  ))}
                </div>
              </div>
              <div style={{ background: 'var(--veil)', borderRadius: 20, padding: '6px 12px' }}>
                {g.personnes.map((x, i) => (
                  <Link key={`${g.cle}-${x.id}`} to={`/recruteur/vivier/${x.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', textDecoration: 'none', borderTop: i ? '1px solid var(--line)' : 0 }}>
                    <span className={`avatar sq ${TEINTES[2]}`} style={{ width: 32, height: 32, flexBasis: 32, fontSize: 11 }} aria-hidden="true">{initiales(x.nom)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', fontSize: 14 }}>{x.nom}</b><span className="muted small">{x.sous}</span></span>
                    <span className="small" style={{ fontWeight: 600, color: x.dispo === 'Sous 3 mois' ? 'var(--warn)' : 'var(--ok)', whiteSpace: 'nowrap' }}>{x.dispo}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
