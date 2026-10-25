import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur, telecharger } from '../../api/client';
import { dateCourte, dateFr, initiales, kmad } from '../../api/format';
import type { Candidat, Candidature, Mission, Note } from '../../api/types';
import { Chargement, Erreur, Pill, Score } from '../../components/ui';

export default function FicheCandidat() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [missionChoisie, setMissionChoisie] = useState('');
  const candidat = useQuery({ queryKey: ['candidat', id], queryFn: async () => (await api.get<Candidat>(`/api/candidats/${id}`)).data });
  const notes = useQuery({ queryKey: ['notes', id], queryFn: async () => (await api.get<Note[]>(`/api/candidats/${id}/notes`)).data });
  const candidatures = useQuery({ queryKey: ['candidatures', id], queryFn: async () => (await api.get<Candidature[]>('/api/candidatures', { params: { candidatId: id } })).data });
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });

  const ajouterNote = useMutation({
    mutationFn: () => api.post(`/api/candidats/${id}/notes`, { texte: note }),
    onSuccess: () => { setNote(''); void qc.invalidateQueries({ queryKey: ['notes', id] }); },
  });
  const ajouterMission = useMutation({
    mutationFn: () => api.post('/api/candidatures', { missionId: missionChoisie, candidatId: id }),
    onSuccess: () => { setMissionChoisie(''); void qc.invalidateQueries({ queryKey: ['candidatures', id] }); },
  });
  const deposerCv = useMutation({
    mutationFn: (fichier: File) => {
      const data = new FormData();
      data.append('fichier', fichier);
      return api.post(`/api/candidats/${id}/cv`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidat', id] }),
  });

  if (candidat.isLoading) return <Chargement />;
  if (candidat.error || !candidat.data) return <Erreur message={messageErreur(candidat.error)} />;
  const c = candidat.data;
  const dejaDans = new Set(candidatures.data?.map((x) => x.missionId));
  const meilleure = [...(candidatures.data ?? [])].sort((a, b) => b.score - a.score)[0];
  const erreur = ajouterNote.error ?? ajouterMission.error ?? deposerCv.error;

  return (
    <>
      <div className="grid-3">
        <section className="card hero span-2 row" style={{ alignItems: 'center', gap: 24, padding: 26 }}>
          <span style={{ width: 120, height: 120, flex: '0 0 120px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #A99BFF, #5B4CDB)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 600, boxShadow: '0 18px 40px rgba(91,76,219,0.3)' }} aria-hidden="true">
            {initiales(c.nomComplet)}
          </span>
          <div className="stack" style={{ flex: '1 1 280px', gap: 8 }}>
            <div className="crumbs"><Link to="/recruteur/vivier">Vivier</Link><span>/</span><span>Fiche candidat</span></div>
            <h1>{c.nomComplet}</h1>
            <div style={{ fontSize: 16, color: 'var(--ink-2)' }}>{[c.titre, `${c.anneesExperience} ans`, c.ville].filter(Boolean).join(' · ')}</div>
            <div className="chips">
              <span className="chip" style={{ color: c.disponibilite === 'TROIS_MOIS' ? 'var(--warn)' : 'var(--ok)' }}>● {c.disponibiliteLibelle}</span>
              {c.niveauLibelle && <span className="chip">{c.niveauLibelle}</span>}
              {c.source && <span className="chip">Source : {c.source}</span>}
              <span className="chip">{c.consentementLe ? `Consentement du ${dateFr(c.consentementLe)}` : 'Consentement manquant'}</span>
            </div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {c.cvDisponible && <button className="btn primary" onClick={() => telecharger(`/api/candidats/${id}/cv`, c.cvNomFichier ?? 'cv')}>Télécharger le CV</button>}
            <label className={`btn ${c.cvDisponible ? '' : 'primary'}`} style={{ background: c.cvDisponible ? 'var(--surface)' : undefined }}>
              {c.cvDisponible ? 'Remplacer le CV' : 'Déposer le CV'}
              <input type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && deposerCv.mutate(e.target.files[0])} />
            </label>
          </div>
        </section>

        <section className="card accent" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
          <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.2 }}>Meilleure<br />correspondance</h2>
            {meilleure && <span className="pill veil">{meilleure.entrepriseNom}</span>}
          </div>
          {meilleure ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <span className="big" style={{ fontSize: 72 }}>{meilleure.score}</span>
                <span style={{ fontSize: 14, paddingBottom: 10 }}>% avec<br />{meilleure.missionIntitule}</span>
              </div>
              <Link to={`/recruteur/missions/${meilleure.missionId}`} className="box" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, textDecoration: 'none', color: 'var(--ink)' }}>
                <span>Étape actuelle</span><b>{meilleure.etapeLibelle}</b>
              </Link>
            </>
          ) : (
            <p style={{ margin: 0 }}>Dans aucun pipeline pour l'instant. Ajoutez ce profil à une mission ouverte.</p>
          )}
        </section>
      </div>
      {erreur && <Erreur message={messageErreur(erreur)} />}

      <div className="grid-3">
        <div className="stack" style={{ gap: 16 }}>
          <section className="card stack" style={{ gap: 14 }}>
            <h2>Compétences</h2>
            <div className="tags">{c.competences.map((t) => <span key={t} className="tag" style={{ fontSize: 13, padding: '5px 12px' }}>{t}</span>)}</div>
            {c.langues && <div className="muted small">Langues : {c.langues}</div>}
          </section>
          <section className="card stack">
            <h2>Candidatures</h2>
            {candidatures.data?.length === 0 && <p className="muted" style={{ margin: 0 }}>Dans aucun pipeline.</p>}
            {candidatures.data?.map((x) => (
              <Link key={x.id} to={`/recruteur/missions/${x.missionId}`} className="tile" style={{ textDecoration: 'none' }}>
                <span style={{ flex: '1 1 140px', minWidth: 0 }}><b>{x.missionIntitule}</b><br /><span className="muted small">{x.entrepriseNom}</span></span>
                <span className="actions" style={{ gap: 6 }}><Score value={x.score} /><Pill tone="info">{x.etapeLibelle}</Pill></span>
              </Link>
            ))}
            <div className="actions">
              <select className="input" aria-label="Mission" value={missionChoisie} onChange={(e) => setMissionChoisie(e.target.value)} style={{ flex: '1 1 160px', minWidth: 0 }}>
                <option value="">Ajouter à une mission…</option>
                {missions.data?.filter((m) => m.statut === 'OUVERTE' && !dejaDans.has(m.id)).map((m) => (
                  <option key={m.id} value={m.id}>{m.intitule} · {m.entrepriseNom}</option>
                ))}
              </select>
              <button className="btn primary" disabled={!missionChoisie || ajouterMission.isPending} onClick={() => ajouterMission.mutate()}>Ajouter</button>
            </div>
          </section>
        </div>

        <section className="card">
          <h2 style={{ marginBottom: 14 }}>Parcours</h2>
          {c.experiences.length === 0 && <p className="muted">Aucune expérience renseignée.</p>}
          {c.experiences.map((x, i) => (
            <div key={i} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} aria-hidden="true">
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: i === 0 ? 'var(--accent)' : 'var(--ink)' }} />
                {i < c.experiences.length - 1 && <span style={{ flex: 1, width: 2, background: 'var(--line)', minHeight: 40 }} />}
              </div>
              <div style={{ paddingBottom: 16 }}>
                <div className="muted small">{x.periode}</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{[x.poste, x.employeur].filter(Boolean).join(' · ')}</div>
                {x.description && <div className="small" style={{ color: 'var(--ink-2)' }}>{x.description}</div>}
              </div>
            </div>
          ))}
        </section>

        <div className="stack" style={{ gap: 16 }}>
          <section className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><div className="muted small">Prétentions</div><div style={{ fontSize: 24, fontWeight: 500 }}>{c.pretentionSalaire != null ? `${kmad(c.pretentionSalaire)} k` : '—'}</div><div className="muted small">MAD brut/an</div></div>
            <div><div className="muted small">Secteur</div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.secteur ?? '—'}</div></div>
            <div><div className="muted small">Mobilité</div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.mobilite ?? '—'}</div></div>
            <div style={{ minWidth: 0 }}><div className="muted small">Contact</div><div style={{ fontSize: 14, fontWeight: 500, overflowWrap: 'anywhere' }}>{c.email ?? '—'}</div><div className="muted small">{c.telephone}</div></div>
          </section>
          <section className="card night stack" style={{ gap: 10, padding: 20 }}>
            <div className="card-head" style={{ margin: 0 }}>
              <h2 style={{ fontSize: 17, fontWeight: 400 }}>Notes privées</h2>
              {notes.data?.[0] && <span className="pill veil">{dateCourte(notes.data[0].createdAt)}</span>}
            </div>
            {notes.data?.length === 0 && <div className="small" style={{ opacity: 0.75 }}>Aucune note pour l'instant.</div>}
            {notes.data?.map((n) => (
              <div key={n.id} className="small" style={{ lineHeight: 1.5 }}>
                <div style={{ opacity: 0.65, marginBottom: 2 }}>{dateCourte(n.createdAt)}{n.auteur ? ` · ${n.auteur}` : ''}</div>
                {n.texte}
              </div>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); if (note.trim()) ajouterNote.mutate(); }}
              style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: '6px 6px 6px 14px' }}>
              <label htmlFor="note" className="sr-only">Ajouter une note</label>
              <input id="note" placeholder="Ajouter une note…" value={note} onChange={(e) => setNote(e.target.value)}
                style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', color: '#fff', font: 'inherit', fontSize: 13 }} />
              <button type="submit" aria-label="Enregistrer la note" disabled={!note.trim() || ajouterNote.isPending}
                style={{ width: 32, height: 32, borderRadius: '50%', border: 0, background: 'var(--accent-strong)', color: '#fff', cursor: 'pointer' }}>↑</button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
