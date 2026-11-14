import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, messageErreur, telecharger } from '../../api/client';
import { initiales } from '../../api/format';
import { avisAttendu, fmtHeure, libelleStatutReunion, lundi, memeJour, plage, toneStatutReunion, useReunions } from '../../api/reunions';
import type { NatureReunion, Reunion } from '../../api/types';
import { Chargement, Erreur, Icone, Modal, Pill } from '../../components/ui';
import { Fenetre, versFenetre } from '../../components/Fenetre';

const HEURE_DEBUT = 8;
const HEURES = Array.from({ length: 10 }, (_, i) => `${String(HEURE_DEBUT + i).padStart(2, '0')}:00`);
const PX_HEURE = 76;
const jourEntete = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const jourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
const moisAnnee = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

type Bloc = { reunion: Reunion; debut: Date; fin: Date; option?: string };
type Filtre = 'TOUT' | NatureReunion;
const FILTRES: { v: Filtre; l: string }[] = [
  { v: 'TOUT', l: 'Tout' }, { v: 'ENTRETIEN_CLIENT', l: 'Entretiens client' }, { v: 'PREQUALIFICATION', l: 'Qualifications' }, { v: 'ENTRETIEN_RECRUTEUR', l: 'Entretiens recruteur' },
];

/** Un bloc par réunion confirmée, un bloc par créneau encore proposé. */
function blocs(reunions: Reunion[]): Bloc[] {
  return reunions.flatMap((r): Bloc[] => {
    if (r.statut === 'PROPOSEE') {
      return r.creneaux.map((c, i) => ({ reunion: r, debut: new Date(c.debut), fin: new Date(c.fin), option: `Option ${i + 1}/${r.creneaux.length}` }));
    }
    return r.debut && r.fin && r.statut !== 'ANNULEE' && r.statut !== 'REPORTEE' ? [{ reunion: r, debut: new Date(r.debut), fin: new Date(r.fin) }] : [];
  });
}

/** Lavande = entretien client, menthe = entretien recruteur, neutre = qualification ; pointillé = créneau proposé. */
function classeBloc(b: Bloc) {
  if (b.option) return 'propose';
  if (b.reunion.statut === 'TERMINEE') return 'clos';
  return b.reunion.nature === 'ENTRETIEN_CLIENT' ? 'client' : b.reunion.nature === 'ENTRETIEN_RECRUTEUR' ? 'recruteur' : 'qualif';
}

export default function Agenda() {
  const qc = useQueryClient();
  const reunions = useReunions();
  const [params, setParams] = useSearchParams();
  const [semaine, setSemaine] = useState(() => lundi(new Date()));
  const [filtre, setFiltre] = useState<Filtre>('TOUT');
  const [dialogue, setDialogue] = useState<'report' | 'annulation' | 'compte-rendu' | null>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setMaintenant(new Date()), 60_000); return () => clearInterval(t); }, []);

  const selId = params.get('fenetre') ? null : params.get('reunion');
  const ouvrir = (id: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set('reunion', id); else n.delete('reunion'); return n; }, { replace: true });

  const jours = Array.from({ length: 7 }, (_, i) => new Date(semaine.getFullYear(), semaine.getMonth(), semaine.getDate() + i));
  const finSemaine = new Date(semaine.getFullYear(), semaine.getMonth(), semaine.getDate() + 7);
  const liste = reunions.data ?? [];
  const cetteSemaine = blocs(liste).filter((b) => b.debut >= semaine && b.debut < finSemaine && (filtre === 'TOUT' || b.reunion.nature === filtre));
  const enAttente = liste.filter((r) => r.statut === 'PROPOSEE').length;
  const aPlanifier = liste.filter((r) => r.statut === 'A_PLANIFIER' || r.statut === 'REPORTEE');
  const comptesRendus = liste.filter((r) => r.statut === 'TERMINEE' && !r.compteRendu).length;
  const sel = liste.find((r) => r.id === selId);

  const rafraichir = () => { setDialogue(null); void qc.invalidateQueries({ queryKey: ['reunions'] }); };
  const decaler = (n: number) => setSemaine(new Date(semaine.getFullYear(), semaine.getMonth(), semaine.getDate() + 7 * n));
  const titre = `${jourMois.format(jours[0]).replace(jours[0].getMonth() === jours[6].getMonth() ? / \S+$/ : /$/, '')} – ${moisAnnee.format(jours[6])}`;
  const hMaintenant = maintenant.getHours() + maintenant.getMinutes() / 60;

  return (
    <>
      <section className="tete-page agenda-tete">
        <h1>{titre}</h1>
        <div className="actions">
          <div className="nav-semaine">
            <button type="button" className="ico petit" aria-label="Semaine précédente" onClick={() => decaler(-1)}><Icone nom="gauche" taille={16} /></button>
            <button type="button" className="btn small" onClick={() => setSemaine(lundi(new Date()))} aria-pressed={memeJour(semaine, lundi(new Date()))}>Cette semaine</button>
            <button type="button" className="ico petit" aria-label="Semaine suivante" onClick={() => decaler(1)}><Icone nom="droite" taille={16} /></button>
          </div>
          <Link to={versFenetre('planifier')} className="btn primary"><Icone nom="plus" taille={16} />Nouvelle réunion</Link>
        </div>
      </section>
      {reunions.error && <Erreur message={messageErreur(reunions.error)} />}

      <section className="bloc agenda-grille" aria-label="Semaine">
        <div className="bloc-tete">
          <div className="filtres" role="group" aria-label="Type de réunion">
            {FILTRES.map((f) => (
              <button key={f.v} type="button" aria-pressed={filtre === f.v} onClick={() => setFiltre(f.v)}>
                {f.v !== 'TOUT' && <span className={`point-ton ton-${f.v}`} />}{f.l}
              </button>
            ))}
          </div>
          <div className="a-suivre">
            {enAttente > 0 && <span className="etat-carte attente">{enAttente} en attente de réponse</span>}
            {comptesRendus > 0 && <span className="etat-carte rouge">{comptesRendus} compte(s) rendu(s) à saisir</span>}
            {aPlanifier.map((r) => (
              <Link key={r.id} className="etat-carte" to={versFenetre('planifier', { reunion: r.id })}>À planifier : {r.candidatNom}</Link>
            ))}
          </div>
        </div>
        {reunions.isLoading ? <div className="bloc-corps" style={{ paddingTop: 16 }}><Chargement /></div> : (
          <div className="agenda-defile">
            <div className="agenda">
              <span className="coin" />
              {jours.map((j, i) => (
                <div key={j.toISOString()} className={`agenda-jour ${memeJour(j, maintenant) ? 'auj' : ''} ${i >= 5 ? 'we' : ''}`}>{jourEntete.format(j).replace(/^./, (c) => c.toUpperCase())}</div>
              ))}
              <div className="agenda-heures">{HEURES.map((h) => <div key={h} style={{ height: PX_HEURE }}>{h}</div>)}</div>
              {jours.map((j, i) => (
                <div key={j.toISOString()} className={`agenda-col ${i >= 5 ? 'we' : ''}`} style={{ height: HEURES.length * PX_HEURE, backgroundSize: `100% ${PX_HEURE}px` }}>
                  {memeJour(j, maintenant) && hMaintenant >= HEURE_DEBUT && hMaintenant <= HEURE_DEBUT + HEURES.length && (
                    <div className="maintenant" style={{ top: (hMaintenant - HEURE_DEBUT) * PX_HEURE }}><span>{fmtHeure(maintenant.toISOString())}</span></div>
                  )}
                  {cetteSemaine.filter((b) => memeJour(b.debut, j)).map((b, k) => {
                    const h = b.debut.getHours() + b.debut.getMinutes() / 60;
                    const duree = (b.fin.getTime() - b.debut.getTime()) / 3_600_000;
                    const nom = b.reunion.nature === 'ENTRETIEN_CLIENT' ? b.reunion.candidatNom ?? b.reunion.entrepriseNom : b.reunion.candidatNom;
                    return (
                      <button key={`${b.reunion.id}-${k}`} type="button" className={`evt-epure ${classeBloc(b)}`} aria-pressed={sel?.id === b.reunion.id}
                        onClick={() => ouvrir(b.reunion.id)} style={{ top: Math.max(0, (h - HEURE_DEBUT) * PX_HEURE + 3), height: Math.max(40, duree * PX_HEURE - 6) }}>
                        <b>{nom}</b>
                        <span>{b.option ?? (b.reunion.nature === 'ENTRETIEN_CLIENT' ? `Entretien · ${b.reunion.entrepriseNom}` : b.reunion.natureLibelle)}</span>
                        <span>{fmtHeure(b.debut.toISOString())} – {fmtHeure(b.fin.toISOString())}</span>
                        {b.reunion.statut === 'CONFIRMEE' && duree >= 1.2 && <span className="confirme">✓ Confirmé</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Téléphone : la semaine en liste, jour par jour (la grille horaire y est illisible). */}
        {!reunions.isLoading && (
          <ol className="agenda-liste" aria-label="Réunions de la semaine, jour par jour">
            {jours.map((j) => {
              const duJour = cetteSemaine.filter((b) => memeJour(b.debut, j)).sort((a, b) => a.debut.getTime() - b.debut.getTime());
              return (
                <li key={j.toISOString()} className={memeJour(j, maintenant) ? 'auj' : ''}>
                  <h3>{jourEntete.format(j).replace(/^./, (c) => c.toUpperCase())}{memeJour(j, maintenant) && <span> · aujourd'hui</span>}</h3>
                  {duJour.length === 0 ? <p className="vide">Rien de prévu</p> : duJour.map((b, k) => {
                    const nom = b.reunion.nature === 'ENTRETIEN_CLIENT' ? b.reunion.candidatNom ?? b.reunion.entrepriseNom : b.reunion.candidatNom;
                    return (
                      <button key={`${b.reunion.id}-${k}`} type="button" className={`agenda-ligne ${classeBloc(b)}`} onClick={() => ouvrir(b.reunion.id)}>
                        <span className="h">{fmtHeure(b.debut.toISOString())}<small>{fmtHeure(b.fin.toISOString())}</small></span>
                        <span className="t"><b>{nom}</b><span>{b.option ?? (b.reunion.nature === 'ENTRETIEN_CLIENT' ? `Entretien · ${b.reunion.entrepriseNom}` : b.reunion.natureLibelle)}</span></span>
                        <Icone nom="droite" taille={16} />
                      </button>
                    );
                  })}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {sel && !dialogue && (
        <Fenetre type="drawer" largeur={440} titre={`${sel.candidatNom ?? ''}${sel.nature === 'ENTRETIEN_CLIENT' && sel.entrepriseNom ? ` × ${sel.entrepriseNom}` : ''}`}
          sousTitre={`${sel.natureLibelle}${sel.missionIntitule ? ` · ${sel.missionIntitule}` : ''}`} onFermer={() => ouvrir(null)}>
          <Detail r={sel} onAction={setDialogue} />
        </Fenetre>
      )}
      {sel && dialogue === 'compte-rendu' && <DialogueCompteRendu r={sel} onClose={() => setDialogue(null)} onFait={rafraichir} />}
      {sel && (dialogue === 'report' || dialogue === 'annulation') && <DialogueMotif r={sel} action={dialogue} onClose={() => setDialogue(null)} onFait={rafraichir} />}
    </>
  );
}

function Detail({ r, onAction }: { r: Reunion; onAction: (a: 'report' | 'annulation' | 'compte-rendu') => void }) {
  const quand = r.debut && r.fin ? plage(r.debut, r.fin) : r.creneaux.length ? `${r.creneaux.length} créneau(x) proposé(s)` : 'À planifier';
  const ouverte = ['A_PLANIFIER', 'PROPOSEE', 'CONFIRMEE', 'REPORTEE'].includes(r.statut);
  return (
    <>
      <div><Pill tone={toneStatutReunion(r.statut)}>{libelleStatutReunion[r.statut]}</Pill></div>
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
        <div className="muted small" style={{ marginBottom: 6 }}>Participants</div>
        {r.participants.map((p) => (
          <div key={`${p.role}-${p.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <span className={`mono-av grand ${p.role === 'CLIENT' ? 'lavande' : ''}`} aria-hidden="true">{initiales(p.nom ?? '?')}</span>
            <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{p.nom}<span className="muted" style={{ display: 'block', fontSize: 11.5 }}>{p.role === 'CANDIDAT' ? 'Candidat' : p.role === 'CLIENT' ? 'Client' : 'Recruteur'}{p.facultatif ? ' · facultatif' : ''}</span></span>
            <span className={`oui-non ${p.reponse === 'ACCEPTE' ? 'oui' : ''}`}>{p.reponse === 'ACCEPTE' ? 'Accepté' : p.reponse === 'DECLINE' ? 'Décliné' : 'En attente'}</span>
          </div>
        ))}
      </div>
      {r.motif && r.statut !== 'CONFIRMEE' && <div className="muted small">Motif : {r.motif}</div>}
      {r.evaluation && (
        <div className="box small">Évaluation client : <b>{r.evaluation.moyenne.toFixed(1).replace('.', ',')} / 5</b> · {r.evaluation.decision === 'RETENIR' ? 'à retenir' : r.evaluation.decision === 'SECOND_ENTRETIEN' ? 'second entretien' : 'non retenu'}</div>
      )}
      {r.compteRendu && <div className="box small" style={{ whiteSpace: 'pre-wrap' }}><b>Compte rendu</b><br />{r.compteRendu}</div>}
      <div className="actions">
        {r.statut === 'CONFIRMEE' && r.lienVisio && <a className="btn primary small" href={r.lienVisio} target="_blank" rel="noreferrer">Rejoindre la visio</a>}
        {r.debut && r.statut !== 'ANNULEE' && <button type="button" className="btn small" onClick={() => telecharger(`/api/reunions/${r.id}/invitation.ics`, 'invitation.ics')}>Invitation .ics</button>}
        {(r.statut === 'A_PLANIFIER' || r.statut === 'REPORTEE') && <Link className="btn primary small" to={versFenetre('planifier', { reunion: r.id })}>Proposer des créneaux</Link>}
        {(r.statut === 'TERMINEE' || r.statut === 'CONFIRMEE') && <button type="button" className="btn small" onClick={() => onAction('compte-rendu')}>{r.compteRendu ? 'Modifier le compte rendu' : 'Saisir le compte rendu'}</button>}
        {avisAttendu(r) && <Link className="btn small primary" to={versFenetre('evaluation', { reunion: r.id })}>Saisir l'évaluation</Link>}
        {(r.statut === 'PROPOSEE' || r.statut === 'CONFIRMEE') && <button type="button" className="btn small" onClick={() => onAction('report')}>Reporter</button>}
        {ouverte && <button type="button" className="btn small danger" onClick={() => onAction('annulation')}>Annuler</button>}
      </div>
      <div className="encadre">Rappels automatiques : e-mail et invitation à la confirmation, rappel 24 h avant.</div>
    </>
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

