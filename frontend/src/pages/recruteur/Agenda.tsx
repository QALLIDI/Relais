import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, messageErreur, telecharger } from '../../api/client';
import { initiales } from '../../api/format';
import { avisAttendu, fmtHeure, libelleStatutReunion, lundi, memeJour, plage, toneStatutReunion, useReunions } from '../../api/reunions';
import type { Reunion } from '../../api/types';
import { Chargement, Erreur, Kpi, Modal, Pill, Vide } from '../../components/ui';

const HEURE_DEBUT = 8;
const HEURES = Array.from({ length: 10 }, (_, i) => `${HEURE_DEBUT + i}:00`);
const PX_HEURE = 56;
const jourEntete = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const mois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

type Bloc = { reunion: Reunion; debut: Date; fin: Date; option?: string };

/** Un bloc par réunion confirmée, un bloc par créneau encore proposé. */
function blocs(reunions: Reunion[]): Bloc[] {
  return reunions.flatMap((r): Bloc[] => {
    if (r.statut === 'PROPOSEE') {
      return r.creneaux.map((c, i) => ({ reunion: r, debut: new Date(c.debut), fin: new Date(c.fin), option: `Option ${i + 1}/${r.creneaux.length}` }));
    }
    return r.debut && r.fin && r.statut !== 'ANNULEE' && r.statut !== 'REPORTEE' ? [{ reunion: r, debut: new Date(r.debut), fin: new Date(r.fin) }] : [];
  });
}

function classeBloc(b: Bloc) {
  if (b.option) return 'propose';
  if (b.reunion.statut === 'TERMINEE') return 'clos';
  return b.reunion.nature === 'ENTRETIEN_CLIENT' ? 'client' : 'recruteur';
}

export default function Agenda() {
  const qc = useQueryClient();
  const reunions = useReunions();
  const [semaine, setSemaine] = useState(() => lundi(new Date()));
  const [selId, setSelId] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<'report' | 'annulation' | 'compte-rendu' | null>(null);

  const jours = Array.from({ length: 5 }, (_, i) => new Date(semaine.getFullYear(), semaine.getMonth(), semaine.getDate() + i));
  const finSemaine = new Date(semaine.getFullYear(), semaine.getMonth(), semaine.getDate() + 7);
  const tous = blocs(reunions.data ?? []);
  const cetteSemaine = tous.filter((b) => b.debut >= semaine && b.debut < finSemaine);
  const liste = reunions.data ?? [];
  const enAttente = liste.filter((r) => r.statut === 'PROPOSEE').length;
  const aPlanifier = liste.filter((r) => r.statut === 'A_PLANIFIER' || r.statut === 'REPORTEE');
  const comptesRendus = liste.filter((r) => r.statut === 'TERMINEE' && !r.compteRendu).length;
  const prochaine = liste.find((r) => r.statut === 'CONFIRMEE' && r.debut && new Date(r.debut) >= new Date());
  const sel = liste.find((r) => r.id === selId) ?? prochaine ?? liste.find((r) => r.statut === 'PROPOSEE');

  const rafraichir = () => { setDialogue(null); void qc.invalidateQueries({ queryKey: ['reunions'] }); };
  const decaler = (n: number) => setSemaine(new Date(semaine.getFullYear(), semaine.getMonth(), semaine.getDate() + 7 * n));

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="sub" style={{ marginTop: 0 }}>Semaine du {mois.format(jours[0]).replace(/ \d{4}$/, '')} au {mois.format(jours[4])}</div>
          <h1>Agenda des réunions</h1>
        </div>
        <div className="kpis" style={{ alignItems: 'flex-end' }}>
          <Kpi label="Cette semaine" value={cetteSemaine.filter((b) => !b.option).length} />
          <Kpi label="En attente de réponse" value={enAttente} note={enAttente ? 'créneaux proposés' : undefined} tone={enAttente ? 'warn' : undefined} />
          <Kpi label="Comptes rendus à saisir" value={comptesRendus} note={comptesRendus ? 'en retard' : undefined} tone={comptesRendus ? 'bad' : undefined} />
          <Link to="/recruteur/agenda/planifier" className="btn accent">+ Planifier une réunion</Link>
        </div>
      </section>
      {reunions.error && <Erreur message={messageErreur(reunions.error)} />}

      <div className="row">
        <section className="card grow-main" aria-label="Semaine" style={{ padding: 18, overflowX: 'auto' }}>
          <div className="card-head" style={{ flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="ico" aria-label="Semaine précédente" style={{ width: 36, height: 36, flexBasis: 36 }} onClick={() => decaler(-1)}>‹</button>
              <button type="button" className="btn small" onClick={() => setSemaine(lundi(new Date()))}>Aujourd'hui</button>
              <button type="button" className="ico" aria-label="Semaine suivante" style={{ width: 36, height: 36, flexBasis: 36 }} onClick={() => decaler(1)}>›</button>
            </div>
            <div className="chips" aria-label="Légende">
              <span className="legende"><span className="dot" style={{ background: 'var(--accent)' }} />Entretien client</span>
              <span className="legende"><span className="dot" style={{ background: 'var(--ink)' }} />Entretien recruteur</span>
              <span className="legende"><span className="dot" style={{ border: '1.5px dashed var(--warn)' }} />Proposé</span>
            </div>
          </div>
          {reunions.isLoading ? <Chargement /> : (
            <div className="semaine">
              <span />
              {jours.map((j) => <div key={j.toISOString()} className={`jour ${memeJour(j, new Date()) ? 'auj' : ''}`} style={{ textTransform: 'capitalize' }}>{jourEntete.format(j)}</div>)}
              <div className="heures">{HEURES.map((h) => <div key={h}>{h}</div>)}</div>
              {jours.map((j) => (
                <div key={j.toISOString()} className="colonne-jour">
                  {cetteSemaine.filter((b) => memeJour(b.debut, j)).map((b, i) => {
                    const h = b.debut.getHours() + b.debut.getMinutes() / 60;
                    const duree = (b.fin.getTime() - b.debut.getTime()) / 3_600_000;
                    const top = Math.max(0, (h - HEURE_DEBUT) * PX_HEURE + 2);
                    return (
                      <button key={`${b.reunion.id}-${i}`} type="button" className={`evt ${classeBloc(b)}`} aria-pressed={sel?.id === b.reunion.id}
                        onClick={() => setSelId(b.reunion.id)} style={{ top, height: Math.max(30, duree * PX_HEURE - 4) }}>
                        <span style={{ fontSize: 11, opacity: 0.85 }}>{fmtHeure(b.debut.toISOString())}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{b.reunion.candidatNom}{b.reunion.nature === 'ENTRETIEN_CLIENT' && b.reunion.entrepriseNom ? ` × ${b.reunion.entrepriseNom}` : ''}</span>
                        <span style={{ fontSize: 11, opacity: 0.85 }}>{b.option ?? `${b.reunion.typeLibelle}${b.reunion.lieu && b.reunion.type === 'PRESENTIEL' ? ` · ${b.reunion.lieu}` : ''}`}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="grow-side stack" aria-label="Détail de la réunion" style={{ gap: 16 }}>
          {sel ? <Detail r={sel} onAction={setDialogue} /> : <section className="card"><Vide>Aucune réunion. Planifiez-en une depuis une candidature.</Vide></section>}
          {aPlanifier.length > 0 && (
            <section className="card stack" style={{ gap: 8 }}>
              <h2>À planifier</h2>
              {aPlanifier.map((r) => (
                <div key={r.id} className="tile">
                  <span style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <b style={{ fontWeight: 600 }}>{r.candidatNom}</b>
                    <span className="muted small" style={{ display: 'block' }}>{r.missionIntitule} · {r.statut === 'REPORTEE' ? `reportée${r.motif ? ` : ${r.motif}` : ''}` : 'client : à rencontrer'}</span>
                  </span>
                  <Link className="btn small primary" to={`/recruteur/agenda/planifier?reunion=${r.id}`}>Proposer des créneaux</Link>
                </div>
              ))}
            </section>
          )}
          <section className="card night stack" style={{ gap: 10 }}>
            <div style={{ fontSize: 16 }}>Rappels automatiques</div>
            {[['E-mail + invitation calendrier', 'à la confirmation'], ['E-mail de rappel', '24 h avant'], ['SMS au candidat', '2 h avant']].map(([a, b]) => (
              <div key={a} className="small" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, opacity: 0.85 }}><span>{a}</span><span>{b}</span></div>
            ))}
          </section>
        </aside>
      </div>

      {sel && dialogue === 'compte-rendu' && <DialogueCompteRendu r={sel} onClose={() => setDialogue(null)} onFait={rafraichir} />}
      {sel && (dialogue === 'report' || dialogue === 'annulation') && <DialogueMotif r={sel} action={dialogue} onClose={() => setDialogue(null)} onFait={rafraichir} />}
    </main>
  );
}

function Detail({ r, onAction }: { r: Reunion; onAction: (a: 'report' | 'annulation' | 'compte-rendu') => void }) {
  const quand = r.debut && r.fin ? plage(r.debut, r.fin) : r.creneaux.length ? `${r.creneaux.length} créneau(x) proposé(s)` : 'À planifier';
  const ouverte = ['A_PLANIFIER', 'PROPOSEE', 'CONFIRMEE', 'REPORTEE'].includes(r.statut);
  return (
    <section className="card stack" style={{ gap: 14 }}>
      <div className="card-head" style={{ margin: 0 }}>
        <Pill tone={toneStatutReunion(r.statut)}>{libelleStatutReunion[r.statut]}</Pill>
        <span className="muted small">{r.natureLibelle}</span>
      </div>
      <div>
        <h2 style={{ fontSize: 22 }}>{r.candidatNom}{r.nature === 'ENTRETIEN_CLIENT' && r.entrepriseNom ? ` × ${r.entrepriseNom}` : ''}</h2>
        <div className="muted">{r.missionIntitule}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="box"><div className="muted small">Quand</div><div style={{ fontWeight: 500, fontSize: 14 }}>{quand}</div></div>
        <div className="box"><div className="muted small">Où</div><div style={{ fontWeight: 500, fontSize: 14, overflowWrap: 'anywhere' }}>{r.type === 'VISIO' ? 'Visio' : r.lieu || r.typeLibelle}</div></div>
      </div>
      {r.statut === 'PROPOSEE' && (
        <div className="stack" style={{ gap: 4 }}>
          {r.creneaux.map((c, i) => <div key={c.id} className="small">Option {i + 1} : {plage(c.debut, c.fin)}</div>)}
        </div>
      )}
      <div>
        <div className="muted small" style={{ marginBottom: 8 }}>Participants</div>
        {r.participants.map((p) => (
          <div key={`${p.role}-${p.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <span className={`avatar ${p.role === 'CANDIDAT' ? 't-peach' : p.role === 'CLIENT' ? 't-violet' : 't-ink'}`} style={{ width: 32, height: 32, flexBasis: 32, fontSize: 11 }} aria-hidden="true">{initiales(p.nom ?? '?')}</span>
            <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{p.nom}<span className="muted" style={{ display: 'block', fontSize: 11 }}>{p.role === 'CANDIDAT' ? 'Candidat' : p.role === 'CLIENT' ? 'Client' : 'Recruteur'}{p.facultatif ? ' · facultatif' : ''}</span></span>
            <span style={{ fontSize: 11, fontWeight: 600, color: p.reponse === 'ACCEPTE' ? 'var(--ok)' : 'var(--warn)' }}>{p.reponse === 'ACCEPTE' ? 'Accepté' : p.reponse === 'DECLINE' ? 'Décliné' : 'En attente'}</span>
          </div>
        ))}
      </div>
      {r.motif && r.statut !== 'CONFIRMEE' && <div className="muted small">Motif : {r.motif}</div>}
      {r.evaluation && (
        <div className="box small">Évaluation client : <b>{r.evaluation.moyenne.toFixed(1).replace('.', ',')} / 5</b> · {r.evaluation.decision === 'RETENIR' ? 'à retenir' : r.evaluation.decision === 'SECOND_ENTRETIEN' ? 'second entretien' : 'non retenu'}</div>
      )}
      {r.compteRendu && <div className="box small" style={{ whiteSpace: 'pre-wrap' }}><b>Compte rendu</b><br />{r.compteRendu}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {r.statut === 'CONFIRMEE' && r.lienVisio && <a className="btn primary small" href={r.lienVisio} target="_blank" rel="noreferrer">Rejoindre la visio</a>}
        {r.debut && r.statut !== 'ANNULEE' && <button type="button" className="btn small" onClick={() => telecharger(`/api/reunions/${r.id}/invitation.ics`, 'invitation.ics')}>Invitation .ics</button>}
        {(r.statut === 'A_PLANIFIER' || r.statut === 'REPORTEE') && <Link className="btn primary small" to={`/recruteur/agenda/planifier?reunion=${r.id}`}>Proposer des créneaux</Link>}
        {(r.statut === 'TERMINEE' || r.statut === 'CONFIRMEE') && <button type="button" className="btn small" onClick={() => onAction('compte-rendu')}>{r.compteRendu ? 'Modifier le compte rendu' : 'Saisir le compte rendu'}</button>}
        {avisAttendu(r) && <Link className="btn small accent" to={`/recruteur/agenda/${r.id}/evaluation`}>Saisir l'évaluation</Link>}
        {(r.statut === 'PROPOSEE' || r.statut === 'CONFIRMEE') && <button type="button" className="btn small" onClick={() => onAction('report')}>Reporter</button>}
        {ouverte && <button type="button" className="btn small danger" onClick={() => onAction('annulation')}>Annuler</button>}
      </div>
    </section>
  );
}

function DialogueMotif({ r, action, onClose, onFait }: { r: Reunion; action: 'report' | 'annulation'; onClose: () => void; onFait: () => void }) {
  const [motif, setMotif] = useState('');
  const envoyer = useMutation({ mutationFn: () => api.post(`/api/reunions/${r.id}/${action}`, { motif }), onSuccess: onFait });
  return (
    <Modal titre={action === 'report' ? `Reporter l'entretien de ${r.candidatNom}` : `Annuler l'entretien de ${r.candidatNom}`} onClose={onClose}>
      <label className="field">Motif (envoyé à tous les participants)<textarea rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} /></label>
      {action === 'report' && <p className="muted small" style={{ margin: 0 }}>Le créneau est libéré ; proposez ensuite de nouveaux créneaux.</p>}
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onClose}>Retour</button>
        <button type="button" className={`btn ${action === 'annulation' ? 'danger' : 'primary'}`} disabled={!motif.trim() || envoyer.isPending} onClick={() => envoyer.mutate()}>
          {action === 'report' ? 'Reporter' : "Annuler l'entretien"}
        </button>
      </div>
    </Modal>
  );
}

function DialogueCompteRendu({ r, onClose, onFait }: { r: Reunion; onClose: () => void; onFait: () => void }) {
  const [texte, setTexte] = useState(r.compteRendu ?? '');
  const enregistrer = useMutation({ mutationFn: () => api.put(`/api/reunions/${r.id}/compte-rendu`, { compteRendu: texte }), onSuccess: onFait });
  return (
    <Modal titre={`Compte rendu · ${r.candidatNom}`} onClose={onClose}>
      <label className="field">Compte rendu du recruteur<textarea rows={6} value={texte} onChange={(e) => setTexte(e.target.value)} /></label>
      {enregistrer.error && <Erreur message={messageErreur(enregistrer.error)} />}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onClose}>Annuler</button>
        <button type="button" className="btn primary" disabled={!texte.trim() || enregistrer.isPending} onClick={() => enregistrer.mutate()}>Enregistrer</button>
      </div>
    </Modal>
  );
}

