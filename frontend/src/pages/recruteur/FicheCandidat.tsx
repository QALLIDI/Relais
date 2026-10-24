import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur, telecharger } from '../../api/client';
import { dateFr, dateHeureFr, initiales, mad } from '../../api/format';
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
  const erreur = ajouterNote.error ?? ajouterMission.error ?? deposerCv.error;

  return (
    <>
      <div className="muted small"><Link to="/recruteur/vivier">Vivier</Link> / {c.nomComplet}</div>
      <header className="card row" style={{ alignItems: 'center' }}>
        <div className="avatar" style={{ width: 64, height: 64, flexBasis: 64, fontSize: 22 }} aria-hidden="true">{initiales(c.nomComplet)}</div>
        <div className="stack grow-main" style={{ gap: 6 }}>
          <h1 style={{ fontSize: 26 }}>{c.nomComplet}</h1>
          <div className="muted">{c.titre} · {c.anneesExperience} ans d'expérience · {c.ville}</div>
          <div className="actions" style={{ gap: 6 }}>
            <Pill tone={c.disponibilite === 'TROIS_MOIS' ? 'warn' : 'ok'}>{c.disponibiliteLibelle}</Pill>
            <Pill>{c.niveauLibelle}</Pill>
            <Pill>{c.consentementLe ? `Consentement du ${dateFr(c.consentementLe)}` : 'Consentement manquant'}</Pill>
            {c.source && <Pill>Source : {c.source}</Pill>}
          </div>
        </div>
        <div className="actions">
          {c.cvDisponible && <button className="btn" onClick={() => telecharger(`/api/candidats/${id}/cv`, c.cvNomFichier ?? 'cv')}>Télécharger le CV</button>}
          <label className="btn">
            {c.cvDisponible ? 'Remplacer le CV' : 'Déposer le CV'}
            <input type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && deposerCv.mutate(e.target.files[0])} />
          </label>
        </div>
      </header>
      {erreur && <Erreur message={messageErreur(erreur)} />}

      <div className="row">
        <div className="stack grow-main" style={{ gap: 20 }}>
          <section className="card stack">
            <h2>Compétences</h2>
            <div className="tags">{c.competences.map((t) => <span key={t} className="tag" style={{ fontSize: 13, padding: '4px 10px' }}>{t}</span>)}</div>
            {c.langues && <div className="muted">Langues : {c.langues}</div>}
          </section>
          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Expériences</h2>
            {c.experiences.length === 0 && <p className="muted">Aucune expérience renseignée.</p>}
            {c.experiences.map((x, i) => (
              <div key={i} className="list-item" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                <div className="muted small" style={{ flex: '0 0 130px' }}>{x.periode}</div>
                <div><div style={{ fontWeight: 600 }}>{x.poste} · {x.employeur}</div><div className="muted">{x.description}</div></div>
              </div>
            ))}
          </section>
        </div>

        <div className="stack grow-side" style={{ gap: 20 }}>
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Informations</h2>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 14 }}>
              <dt className="muted">Prétentions</dt><dd style={{ margin: 0 }}>{mad(c.pretentionSalaire)} brut/an</dd>
              <dt className="muted">Secteur</dt><dd style={{ margin: 0 }}>{c.secteur ?? '—'}</dd>
              <dt className="muted">Mobilité</dt><dd style={{ margin: 0 }}>{c.mobilite ?? '—'}</dd>
              <dt className="muted">E-mail</dt><dd style={{ margin: 0 }}>{c.email ?? '—'}</dd>
              <dt className="muted">Téléphone</dt><dd style={{ margin: 0 }}>{c.telephone ?? '—'}</dd>
            </dl>
          </section>
          <section className="card stack">
            <h2>Candidatures</h2>
            {candidatures.data?.length === 0 && <p className="muted">Dans aucun pipeline.</p>}
            {candidatures.data?.map((x) => (
              <Link key={x.id} to={`/recruteur/missions/${x.missionId}`} className="list-item" style={{ textDecoration: 'none', color: 'var(--ink)' }}>
                <span><b>{x.missionIntitule}</b><br /><span className="muted small">{x.entrepriseNom}</span></span>
                <span className="actions" style={{ gap: 6 }}><Score value={x.score} /><Pill tone="info">{x.etapeLibelle}</Pill></span>
              </Link>
            ))}
            <div className="actions">
              <select className="input" aria-label="Mission" value={missionChoisie} onChange={(e) => setMissionChoisie(e.target.value)} style={{ flex: 1 }}>
                <option value="">Ajouter à une mission…</option>
                {missions.data?.filter((m) => m.statut === 'OUVERTE' && !dejaDans.has(m.id)).map((m) => (
                  <option key={m.id} value={m.id}>{m.intitule} · {m.entrepriseNom}</option>
                ))}
              </select>
              <button className="btn primary" disabled={!missionChoisie || ajouterMission.isPending} onClick={() => ajouterMission.mutate()}>Ajouter</button>
            </div>
          </section>
          <section className="card stack">
            <h2>Notes privées</h2>
            {notes.data?.map((n) => (
              <div key={n.id} style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, fontSize: 14 }}>
                <div className="muted small" style={{ marginBottom: 4 }}>{dateHeureFr(n.createdAt)} · {n.auteur}</div>
                {n.texte}
              </div>
            ))}
            <label className="field">Ajouter une note<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <button className="btn" disabled={!note.trim() || ajouterNote.isPending} onClick={() => ajouterNote.mutate()}>Enregistrer la note</button>
          </section>
        </div>
      </div>
    </>
  );
}
