import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur, telecharger } from '../../api/client';
import { dateCourte, dateFr, initiales, n } from '../../api/format';
import type { Candidat, Candidature, Etape, Mission, Note } from '../../api/types';
import { versFenetre } from '../../components/Fenetre';
import { useFilAriane } from '../../components/Layouts';
import { Chargement, Erreur, Icone, Indicateur, Score } from '../../components/ui';

const ORDRE: Etape[] = ['SOURCE', 'QUALIFIE', 'ENTRETIEN_RECRUTEUR', 'PRESENTE', 'ENTRETIEN_CLIENT', 'OFFRE', 'PLACE'];
const SHORTLISTABLES: Etape[] = ['QUALIFIE', 'ENTRETIEN_RECRUTEUR'];

export default function FicheCandidat() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [missionChoisie, setMissionChoisie] = useState('');
  const [onglet, setOnglet] = useState<'Parcours' | 'Candidatures' | 'Notes'>('Parcours');
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

  useFilAriane(candidat.data ? [{ label: 'Vivier', to: '/recruteur/vivier' }, { label: candidat.data.nomComplet }] : null);
  const envoyer = useMutation({
    mutationFn: (x: Candidature) => api.post('/api/shortlists', { missionId: x.missionId, candidatureIds: [x.id] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatures', id] }),
  });

  if (candidat.isLoading) return <Chargement />;
  if (candidat.error || !candidat.data) return <Erreur message={messageErreur(candidat.error)} />;
  const c = candidat.data;
  const dejaDans = new Set(candidatures.data?.map((x) => x.missionId));
  const actives = (candidatures.data ?? []).filter((x) => x.etape !== 'REFUSE' && x.etape !== 'RETIRE');
  const meilleure = [...actives].sort((a, b) => b.score - a.score)[0];
  const erreur = ajouterNote.error ?? ajouterMission.error ?? deposerCv.error ?? envoyer.error;
  const rang = meilleure ? ORDRE.indexOf(meilleure.etape) : -1;
  const mission = missions.data?.find((m) => m.id === meilleure?.missionId);
  const dansBudget = mission?.salaireMax && c.pretentionSalaire ? c.pretentionSalaire <= mission.salaireMax * 12 || c.pretentionSalaire <= mission.salaireMax : undefined;
  const etapes = [
    { titre: 'Préqualification', fait: rang >= ORDRE.indexOf('QUALIFIE'), detail: 'Appel de qualification' },
    { titre: 'Entretien recruteur', fait: rang >= ORDRE.indexOf('ENTRETIEN_RECRUTEUR'), detail: meilleure?.noteGlobale ? `Évaluation ${meilleure.noteGlobale}/5` : 'À planifier' },
    { titre: 'Présenté au client', fait: rang >= ORDRE.indexOf('PRESENTE'), detail: meilleure?.presenteLe ? `Le ${dateCourte(meilleure.presenteLe)}` : 'Pas encore' },
  ];

  return (
    <>
      <section className="tete-page">
        <div className="tete-personne">
          <span className="avatar lavande-av" aria-hidden="true">{initiales(c.nomComplet)}</span>
          <div>
            <h1>{c.nomComplet}</h1>
            <p className="sous">{[c.titre, `${c.anneesExperience} ans d'expérience`, c.ville, c.disponibiliteLibelle ? `disponibilité ${c.disponibiliteLibelle.toLowerCase()}` : null].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <div className="actions">
          <Link className="btn primary" to={versFenetre('planifier', meilleure ? { candidature: meilleure.id, nom: c.nomComplet, mission: meilleure.missionIntitule } : { nom: c.nomComplet })}>
            <Icone nom="agenda" taille={16} />Planifier
          </Link>
          {meilleure && SHORTLISTABLES.includes(meilleure.etape) && (
            <button className="btn primary" disabled={envoyer.isPending} onClick={() => envoyer.mutate(meilleure)}>Envoyer en shortlist</button>
          )}
        </div>
      </section>
      {erreur && <Erreur message={messageErreur(erreur)} />}

      <div className="tableau-bord">
        <div className="colonne-gauche">
          <section className="indicateurs" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <Indicateur label="Qualification" valeur={meilleure?.noteGlobale ? `${String(meilleure.noteGlobale).replace('.', ',')} / 5` : '—'} note={meilleure?.noteGlobale ? 'Note de l’entretien recruteur' : 'Pas encore évalué'} ton="lavande" />
            <Indicateur label="Correspondance" valeur={meilleure ? `${meilleure.score} %` : '—'} note={meilleure ? `avec ${meilleure.missionIntitule}` : 'Dans aucun pipeline'} />
            <Indicateur label="Prétentions" valeur={c.pretentionSalaire != null ? n(c.pretentionSalaire) : '—'} unite={c.pretentionSalaire != null ? 'MAD' : undefined}
              note={dansBudget === undefined ? 'brut' : dansBudget ? 'dans le budget client' : 'au-dessus du budget client'} ton="vert" />
          </section>

          {meilleure && (
            <section aria-labelledby="etapes">
              <h2 id="etapes" className="titre-section">Étapes · {meilleure.missionIntitule}</h2>
              <div className="etapes-fiche">
                {etapes.map((e, i) => (
                  <div key={e.titre} className={`etape-fiche ${e.fait ? 'faite' : ''} ${i === 0 && e.fait ? 'lavande' : ''}`}>
                    <span className="rond" aria-hidden="true">{e.fait ? '✓' : i + 1}</span>
                    <span><b>{e.titre}</b><span>{e.fait ? (i === 0 ? 'Faite' : e.detail) : e.detail}</span></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bloc">
            <div className="bloc-tete">
              <div className="filtres" role="tablist" aria-label="Détails du candidat">
                {(['Parcours', 'Candidatures', 'Notes'] as const).map((o) => (
                  <button key={o} type="button" role="tab" aria-selected={onglet === o} aria-pressed={onglet === o} onClick={() => setOnglet(o)}>
                    {o}{o === 'Notes' && notes.data?.length ? <span className="nb">{notes.data.length}</span> : null}
                  </button>
                ))}
              </div>
            </div>

            {onglet === 'Parcours' && (
              c.experiences.length === 0 ? <div className="bloc-corps"><p className="muted">Aucune expérience renseignée.</p></div> : (
                <div className="table-wrap">
                  <table style={{ minWidth: 560 }}>
                    <thead><tr><th>Période</th><th>Poste</th><th>Employeur</th><th>Missions</th></tr></thead>
                    <tbody>
                      {c.experiences.map((x, i) => (
                        <tr key={i}><td className="muted" style={{ whiteSpace: 'nowrap' }}>{x.periode}</td><td style={{ fontWeight: 500 }}>{x.poste}</td><td>{x.employeur}</td><td className="muted">{x.description}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {onglet === 'Candidatures' && (
              <div className="bloc-corps">
                {candidatures.data?.length === 0 && <p className="muted" style={{ marginTop: 0 }}>Dans aucun pipeline.</p>}
                {candidatures.data?.map((x) => (
                  <Link key={x.id} to={`/recruteur/missions/${x.missionId}`} className="echeance">
                    <span className="mono-av grand" aria-hidden="true">{initiales(x.entrepriseNom)}</span>
                    <span className="txt"><b>{x.missionIntitule}</b><span>{x.entrepriseNom}</span></span>
                    <Score value={x.score} />
                    <span className="etat-carte">{x.etapeLibelle}</span>
                  </Link>
                ))}
                <div className="actions" style={{ marginTop: 12 }}>
                  <select className="input" aria-label="Mission" value={missionChoisie} onChange={(e) => setMissionChoisie(e.target.value)} style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <option value="">Ajouter à une mission…</option>
                    {missions.data?.filter((m) => m.statut === 'OUVERTE' && !dejaDans.has(m.id)).map((m) => (
                      <option key={m.id} value={m.id}>{m.intitule} · {m.entrepriseNom}</option>
                    ))}
                  </select>
                  <button className="btn primary" disabled={!missionChoisie || ajouterMission.isPending} onClick={() => ajouterMission.mutate()}>Ajouter</button>
                </div>
              </div>
            )}

            {onglet === 'Notes' && (
              <div className="bloc-corps stack">
                {notes.data?.length === 0 && <p className="muted" style={{ margin: 0 }}>Aucune note pour l'instant. Les notes ne sont jamais visibles du client.</p>}
                {notes.data?.map((x) => (
                  <div key={x.id} className="note-ligne">
                    <span className="muted small">{dateCourte(x.createdAt)}{x.auteur ? ` · ${x.auteur}` : ''}</span>
                    <p>{x.texte}</p>
                  </div>
                ))}
                <form className="saisie-note" onSubmit={(e) => { e.preventDefault(); if (note.trim()) ajouterNote.mutate(); }}>
                  <label htmlFor="note" className="sr-only">Ajouter une note privée</label>
                  <input id="note" placeholder="Ajouter une note privée…" value={note} onChange={(e) => setNote(e.target.value)} />
                  <button type="submit" className="btn small primary" disabled={!note.trim() || ajouterNote.isPending}>Enregistrer</button>
                </form>
              </div>
            )}
          </section>
        </div>

        <div className="colonne-droite">
          <section className="bloc">
            <div className="bloc-tete"><h2>Contact</h2></div>
            <div className="bloc-corps infos">
              {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
              {c.telephone && <a href={`tel:${c.telephone.replace(/\s/g, '')}`}>{c.telephone}</a>}
              <span className="muted">{[c.mobilite ? `Mobilité : ${c.mobilite}` : null, c.langues ? `Langues : ${c.langues}` : null].filter(Boolean).join(' · ') || 'Aucune précision'}</span>
            </div>
          </section>
          <section className="bloc">
            <div className="bloc-tete"><h2>Compétences</h2></div>
            <div className="bloc-corps tags">{c.competences.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          </section>
          <section className="bloc">
            <div className="bloc-tete"><h2>Documents</h2></div>
            <div className="bloc-corps stack" style={{ gap: 8 }}>
              {c.cvDisponible ? (
                <button type="button" className="document" onClick={() => telecharger(`/api/candidats/${id}/cv`, c.cvNomFichier ?? 'cv')}>
                  <span className="mono-av"><Icone nom="facture" taille={14} /></span><span className="txt">CV · {c.cvNomFichier ?? 'cv'}</span><span className="muted small">Télécharger</span>
                </button>
              ) : <p className="muted small" style={{ margin: 0 }}>Aucun CV déposé.</p>}
              <label className="document">
                <span className="mono-av"><Icone nom="plus" taille={14} /></span><span className="txt">{c.cvDisponible ? 'Remplacer le CV' : 'Déposer le CV'}</span><span className="muted small">PDF, Word</span>
                <input type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && deposerCv.mutate(e.target.files[0])} />
              </label>
            </div>
          </section>
          <section className="bloc">
            <div className="bloc-tete"><h2>Consentements</h2></div>
            <div className="bloc-corps infos">
              <span className="ligne-entre"><span>Profil présenté aux entreprises</span><span className={`oui-non ${c.consentementLe ? 'oui' : ''}`}>{c.consentementLe ? 'Oui' : 'Non'}</span></span>
              <span className="ligne-entre"><span>Rester dans le vivier</span><span className={`oui-non ${c.consentementLe ? 'oui' : ''}`}>{c.consentementLe ? 'Oui' : 'Non'}</span></span>
              <span className="muted small">{c.consentementLe ? `Donné le ${dateFr(c.consentementLe)}${c.source ? ` · source : ${c.source}` : ''}` : 'Consentement manquant : ne pas présenter ce profil.'}</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
