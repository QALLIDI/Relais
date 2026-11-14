import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, messageErreur, telecharger } from '../../api/client';
import { initiales } from '../../api/format';
import { avisAttendu, fmtHeure, fmtJour, libelleStatutReunion, memeJour, plage, repere, toneStatutReunion, useReunions } from '../../api/reunions';
import type { PlageDisponibilite, Reunion } from '../../api/types';
import { Chargement, Erreur, Modal, Pill, TetePage, Vide } from '../../components/ui';
import { versFenetre } from '../../components/Fenetre';

const JOURS = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
const jourSeul = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const moisCourt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

/** Entretiens côté entreprise (maquette EmberClientReunions). */
export default function Reunions() {
  const qc = useQueryClient();
  const reunions = useReunions();
  const [report, setReport] = useState<Reunion | null>(null);
  const liste = reunions.data ?? [];
  const maintenant = new Date();
  const aVenir = liste.filter((r) => r.statut === 'CONFIRMEE' && r.debut && new Date(r.debut) >= maintenant);
  const enAttente = liste.filter((r) => r.statut === 'PROPOSEE');
  const aPlanifier = liste.filter((r) => r.statut === 'A_PLANIFIER' || r.statut === 'REPORTEE');
  const avis = liste.filter(avisAttendu);
  const prochain = aVenir[0];
  const planning = [...aVenir.slice(1), ...enAttente, ...aPlanifier].sort((a, b) => (repere(a) ?? a.createdAt).localeCompare(repere(b) ?? b.createdAt));
  const demain = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1);

  return (
    <div className="page">
      <TetePage titre="Entretiens" sous={
        avis.length ? `${avis.length} avis à donner après entretien · ${aVenir.length} à venir`
          : aVenir.length ? `${aVenir.length} entretien${aVenir.length > 1 ? 's' : ''} à venir${enAttente.length ? ` · ${enAttente.length} en attente du candidat` : ''}`
            : enAttente.length ? `${enAttente.length} en attente de confirmation du candidat` : 'Vos entretiens avec les candidats présentés.'
      } />
      {reunions.isLoading && <Chargement />}
      {reunions.error && <Erreur message={messageErreur(reunions.error)} />}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <section className="stack" style={{ gap: 16 }}>
          {prochain && prochain.debut && prochain.fin ? (
            <div className="card night stack" style={{ gap: 14, background: 'var(--inverse)', color: 'var(--inverse-ink)' }}>
              <div className="card-head" style={{ margin: 0 }}>
                <span className="pill" style={{ background: 'var(--accent-strong)', color: '#fff', fontWeight: 400 }}>
                  Prochain entretien{memeJour(new Date(prochain.debut), maintenant) ? " · aujourd'hui" : memeJour(new Date(prochain.debut), demain) ? ' · demain' : ''}
                </span>
                <span className="small" style={{ opacity: 0.7 }}>Confirmé par le candidat</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 70, textAlign: 'center', background: 'rgba(127,127,127,0.18)', borderRadius: 18, padding: '10px 0' }}>
                  <div className="small" style={{ opacity: 0.7, textTransform: 'capitalize' }}>{jourSeul.format(new Date(prochain.debut))}</div>
                  <div style={{ fontSize: 30 }}>{new Date(prochain.debut).getDate()}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{moisCourt.format(new Date(prochain.debut))}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 24 }}>{prochain.candidatNom}</div>
                  <div className="small" style={{ opacity: 0.75 }}>{prochain.missionIntitule} · {prochain.natureLibelle} · {prochain.dureeMinutes} min</div>
                  <div className="small" style={{ opacity: 0.75, marginTop: 4 }}>{fmtHeure(prochain.debut)} – {fmtHeure(prochain.fin)} · {prochain.type === 'PRESENTIEL' ? prochain.lieu ?? 'Sur site' : prochain.typeLibelle}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {prochain.lienVisio && <a className="btn light small" href={prochain.lienVisio} target="_blank" rel="noreferrer">Rejoindre la visio</a>}
                <button type="button" className="btn small" style={{ background: 'rgba(127,127,127,0.2)', color: 'inherit' }} onClick={() => telecharger(`/api/reunions/${prochain.id}/invitation.ics`, 'invitation.ics')}>Ajouter au calendrier</button>
                <button type="button" className="btn small" style={{ background: 'rgba(127,127,127,0.2)', color: 'inherit' }} onClick={() => setReport(prochain)}>Demander un report</button>
              </div>
            </div>
          ) : !reunions.isLoading && liste.length === 0 && (
            <section className="card stack" style={{ gap: 10 }}>
              <Vide>Aucun entretien pour le moment. Ils apparaissent ici dès que vous proposez un entretien depuis une shortlist.</Vide>
            </section>
          )}

          <div className="card stack" style={{ gap: 10 }}>
            <h2>Planning</h2>
            {planning.length === 0 && <Vide>Rien d'autre de prévu.</Vide>}
            {planning.map((r) => <LignePlanning key={r.id} r={r} />)}
            <Disponibilites />
          </div>
        </section>

        <section className="card stack" style={{ gap: 14 }}>
          <h2>Votre avis après l'entretien</h2>
          {avis.length === 0 && <Vide>Aucun avis en attente. La grille s'ouvre ici après chaque entretien.</Vide>}
          {avis.map((r, i) => (
            <div key={r.id} className="tile" style={{ background: i === 0 ? 'var(--violet-bg)' : undefined }}>
              <span className="avatar" style={{ width: 52, height: 52, flexBasis: 52, background: 'var(--violet)', color: '#fff' }} aria-hidden="true">{initiales(r.candidatNom ?? '')}</span>
              <span style={{ flex: '1 1 160px', minWidth: 0 }}><b style={{ fontWeight: 600, fontSize: 17 }}>{r.candidatNom}</b>
                <span className="small" style={{ display: 'block', color: 'var(--ink-2)' }}>{r.missionIntitule} · {r.debut ? fmtJour(r.debut) : ''} · {r.dureeMinutes} min</span></span>
              <Link className="btn accent small" to={versFenetre('evaluation', { reunion: r.id })}>Évaluer</Link>
            </div>
          ))}
          {aVenir.length > 0 && (
            <>
              <div className="muted small" style={{ marginTop: 8 }}>Entretiens confirmés : la grille sera disponible après l'entretien. Vous pouvez aussi la remplir dès maintenant.</div>
              {aVenir.map((r) => (
                <div key={r.id} className="list-item">
                  <span>{r.candidatNom} <span className="muted small">· {r.debut && r.fin ? plage(r.debut, r.fin) : ''}</span></span>
                  <Link className="btn small" to={versFenetre('evaluation', { reunion: r.id })}>Évaluer</Link>
                </div>
              ))}
            </>
          )}
          {liste.filter((r) => r.evaluation).slice(0, 5).map((r) => (
            <div key={r.id} className="list-item">
              <span>{r.candidatNom} <span className="muted small">· évalué {r.evaluation?.moyenne.toFixed(1).replace('.', ',')} / 5</span></span>
              <Pill tone={r.evaluation?.decision === 'NE_PAS_RETENIR' ? 'bad' : 'ok'}>{r.evaluation?.decision === 'RETENIR' ? 'Retenu' : r.evaluation?.decision === 'SECOND_ENTRETIEN' ? 'Second entretien' : 'Non retenu'}</Pill>
            </div>
          ))}
        </section>
      </div>

      {report && <DialogueReport r={report} onClose={() => setReport(null)} onFait={() => { setReport(null); void qc.invalidateQueries({ queryKey: ['reunions'] }); }} />}
    </div>
  );
}

function LignePlanning({ r }: { r: Reunion }) {
  const attente = r.statut === 'PROPOSEE';
  const quand = r.debut && r.fin ? `${plage(r.debut, r.fin)} · ${r.typeLibelle}` : attente ? `${r.creneaux.length} créneau(x) proposé(s) · ${r.typeLibelle.toLowerCase()} · en attente de sa réponse` : 'à planifier par votre recruteur';
  return (
    <div className="tile" style={{ background: attente ? 'var(--warn-bg)' : 'var(--sunken)' }}>
      <span className="avatar" style={{ background: 'var(--surface)', color: attente ? 'var(--warn)' : 'var(--ink)' }} aria-hidden="true">{initiales(r.candidatNom ?? '')}</span>
      <span style={{ flex: '1 1 160px', minWidth: 0 }}><b style={{ fontWeight: 600 }}>{r.candidatNom}</b><span className="muted small" style={{ display: 'block' }}>{quand}</span></span>
      {(r.statut === 'A_PLANIFIER' || r.statut === 'REPORTEE')
        ? <Link className="btn small" to={versFenetre('planifier', { reunion: r.id })}>Proposer des créneaux</Link>
        : <span className="small" style={{ fontWeight: 600, color: toneStatutReunion(r.statut) === 'ok' ? 'var(--ok)' : 'var(--warn)' }}>{libelleStatutReunion[r.statut]}</span>}
    </div>
  );
}

function Disponibilites() {
  const qc = useQueryClient();
  const dispos = useQuery({ queryKey: ['disponibilites', 'moi'], queryFn: async () => (await api.get<PlageDisponibilite[]>('/api/reunions/disponibilites')).data });
  const [ajout, setAjout] = useState(false);
  const [jour, setJour] = useState(1);
  const [debut, setDebut] = useState('10:00');
  const [fin, setFin] = useState('12:00');
  const enregistrer = useMutation({
    mutationFn: async (plages: PlageDisponibilite[]) => (await api.put<PlageDisponibilite[]>('/api/reunions/disponibilites', plages.map(({ jour: j, heureDebut, heureFin }) => ({ jour: j, heureDebut, heureFin })))).data,
    onSuccess: (d) => { qc.setQueryData(['disponibilites', 'moi'], d); setAjout(false); },
  });
  const plages = dispos.data ?? [];
  return (
    <div className="stack" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>Mes disponibilités pour les entretiens</div>
      <div className="muted small">Votre recruteur propose des créneaux aux candidats uniquement sur ces plages.</div>
      {enregistrer.error && <Erreur message={messageErreur(enregistrer.error)} />}
      <div className="chips">
        {plages.map((p) => (
          <span key={p.id} className="chip dark">{JOURS[p.jour - 1]} {p.heureDebut.slice(0, 5)}–{p.heureFin.slice(0, 5)}
            <button type="button" aria-label="Retirer la plage" onClick={() => enregistrer.mutate(plages.filter((x) => x !== p))} style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }}>×</button>
          </span>
        ))}
        <button type="button" className="chip" style={{ borderStyle: 'dashed', cursor: 'pointer', font: 'inherit', fontSize: 12 }} onClick={() => setAjout(true)}>+ Ajouter une plage</button>
      </div>
      {ajout && (
        <Modal titre="Nouvelle plage de disponibilité" onClose={() => setAjout(false)}>
          <label className="field">Jour<select value={jour} onChange={(e) => setJour(Number(e.target.value))}>{JOURS.map((j, i) => <option key={j} value={i + 1}>{j}</option>)}</select></label>
          <div className="form-grid">
            <label className="field">De<input type="time" value={debut} onChange={(e) => setDebut(e.target.value)} /></label>
            <label className="field">À<input type="time" value={fin} onChange={(e) => setFin(e.target.value)} /></label>
          </div>
          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={() => setAjout(false)}>Annuler</button>
            <button type="button" className="btn primary" disabled={enregistrer.isPending || fin <= debut} onClick={() => enregistrer.mutate([...plages, { jour, heureDebut: debut, heureFin: fin }])}>Ajouter</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DialogueReport({ r, onClose, onFait }: { r: Reunion; onClose: () => void; onFait: () => void }) {
  const [motif, setMotif] = useState('');
  const reporter = useMutation({ mutationFn: () => api.post(`/api/reunions/${r.id}/report`, { motif }), onSuccess: onFait });
  return (
    <Modal titre={`Reporter l'entretien avec ${r.candidatNom}`} onClose={onClose}>
      <label className="field">Motif (envoyé au candidat et à votre recruteur)<textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} /></label>
      {reporter.error && <Erreur message={messageErreur(reporter.error)} />}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onClose}>Retour</button>
        <button type="button" className="btn primary" disabled={!motif.trim() || reporter.isPending} onClick={() => reporter.mutate()}>Demander le report</button>
      </div>
    </Modal>
  );
}
