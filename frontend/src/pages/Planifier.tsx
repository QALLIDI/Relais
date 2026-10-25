import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, messageErreur } from '../api/client';
import { initiales } from '../api/format';
import { fmtHeure, fmtJour, libelleType, useReunion, useReunions } from '../api/reunions';
import type { Candidature, NatureReunion, PlageDisponibilite, Reunion, TypeReunion } from '../api/types';
import { Chargement, Erreur, Vide } from '../components/ui';

const HEURES = [9, 10, 11, 12, 14, 15, 16, 17];
const DUREES = [30, 45, 60, 90];
const libelleDuree = (m: number) => (m < 60 ? `${m} min` : m === 60 ? '1 h' : `${Math.floor(m / 60)} h ${m % 60 || ''}`.trim());
const NATURES: [NatureReunion, string][] = [['ENTRETIEN_CLIENT', 'Entretien client'], ['ENTRETIEN_RECRUTEUR', 'Entretien recruteur'], ['PREQUALIFICATION', 'Pré-qualification']];
const INFO_MODE: Record<TypeReunion, string> = {
  VISIO: 'Un lien de visio est généré à la confirmation et joint à l’invitation.',
  PRESENTIEL: 'Précisez l’adresse : elle figure dans l’invitation.',
  TELEPHONE: 'Le numéro est communiqué par le recruteur avec l’invitation.',
};

/** Les 5 prochains jours ouvrés, à partir de demain. */
function prochainsJours(): Date[] {
  const jours: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (jours.length < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) jours.push(new Date(d));
  }
  return jours;
}

const cle = (jour: Date, h: number) => {
  const d = new Date(jour);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

/** Le créneau [debut, debut + durée[ chevauche-t-il une réunion déjà prévue ou proposée ? */
function occupe(debut: Date, duree: number, reunions: Reunion[], sauf?: string) {
  const fin = debut.getTime() + duree * 60_000;
  return reunions.some((r) => r.id !== sauf && (
    (r.statut === 'CONFIRMEE' && r.debut && r.fin && new Date(r.debut).getTime() < fin && new Date(r.fin).getTime() > debut.getTime()) ||
    (r.statut === 'PROPOSEE' && r.creneaux.some((c) => new Date(c.debut).getTime() < fin && new Date(c.fin).getTime() > debut.getTime()))
  ));
}

/** Le créneau tient-il dans une plage de disponibilité du client (heure locale) ? */
function dansDispos(debut: Date, duree: number, dispos: PlageDisponibilite[]) {
  if (dispos.length === 0) return true;
  const jour = ((debut.getDay() + 6) % 7) + 1;
  const min = debut.getHours() * 60 + debut.getMinutes();
  const enMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return dispos.some((p) => p.jour === jour && enMinutes(p.heureDebut) <= min && min + duree <= enMinutes(p.heureFin));
}

/**
 * Planifier une réunion (maquette EmberPlanifier) : depuis une candidature (?candidature=) ou pour
 * une réunion à planifier ou reportée (?reunion=). Sert au recruteur et au client.
 */
export default function Planifier({ espace }: { espace: 'recruteur' | 'entreprise' }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const reunionId = params.get('reunion') ?? '';
  const existante = useReunion(reunionId);
  const reunions = useReunions();
  const client = espace === 'entreprise';
  const retour = client ? '/entreprise/entretiens' : '/recruteur/agenda';

  const enCours = useQuery({
    queryKey: ['candidatures', 'en-cours'],
    queryFn: async () => (await api.get<Candidature[]>('/api/candidatures')).data,
    enabled: !client && !reunionId,
  });
  const [candidatureId, setCandidatureId] = useState(params.get('candidature') ?? '');
  const candidature = enCours.data?.find((c) => c.id === candidatureId);

  const [nature, setNature] = useState<NatureReunion>('ENTRETIEN_CLIENT');
  const [type, setType] = useState<TypeReunion>('VISIO');
  const [duree, setDuree] = useState(60);
  const [lieu, setLieu] = useState('');
  const [choisis, setChoisis] = useState<string[]>([]);

  useEffect(() => {
    if (existante.data) {
      setNature(existante.data.nature);
      setType(existante.data.type);
      setDuree(existante.data.dureeMinutes);
      setLieu(existante.data.lieu ?? '');
    }
  }, [existante.data]);
  useEffect(() => {
    if (candidature && !client) setNature(['PRESENTE', 'ENTRETIEN_CLIENT', 'OFFRE'].includes(candidature.etape) ? 'ENTRETIEN_CLIENT' : 'ENTRETIEN_RECRUTEUR');
  }, [candidature, client]);

  const entrepriseId = existante.data?.entrepriseId ?? candidature?.entrepriseId;
  const natureEffective = client ? 'ENTRETIEN_CLIENT' : nature;
  const dispos = useQuery({
    queryKey: ['disponibilites', client ? 'moi' : entrepriseId],
    queryFn: async () => (await api.get<PlageDisponibilite[]>('/api/reunions/disponibilites', { params: client ? {} : { entrepriseId } })).data,
    enabled: client || (!!entrepriseId && natureEffective === 'ENTRETIEN_CLIENT'),
  });
  const plages = natureEffective === 'ENTRETIEN_CLIENT' ? dispos.data ?? [] : [];

  const envoyer = useMutation({
    mutationFn: async () => {
      const corps = { type, dureeMinutes: duree, lieu: lieu || undefined, creneaux: [...choisis].sort() };
      if (reunionId) return (await api.post(`/api/reunions/${reunionId}/proposition`, corps)).data;
      return (await api.post('/api/reunions', { ...corps, candidatureId, nature: natureEffective })).data;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['reunions'] }); navigate(retour); },
  });

  const jours = prochainsJours();
  const basculer = (k: string) => setChoisis((s) => (s.includes(k) ? s.filter((x) => x !== k) : s.length < 3 ? [...s, k] : s));
  const nomCandidat = existante.data?.candidatNom ?? candidature?.candidatNom;
  const sousTitre = existante.data ? `${existante.data.missionIntitule ?? ''} · ${existante.data.entrepriseNom ?? ''}` : candidature ? `${candidature.missionIntitule} · ${candidature.entrepriseNom}` : '';
  const pret = choisis.length > 0 && (!!reunionId || !!candidatureId) && (type !== 'PRESENTIEL' || !!lieu.trim());

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="crumbs"><Link to={retour}>{client ? 'Entretiens' : 'Agenda'}</Link><span>/</span><span>{reunionId ? 'Nouvelle proposition' : 'Nouvelle réunion'}</span></div>
          <h1>Planifier une réunion</h1>
        </div>
        <div className="actions">
          <Link to={retour} className="btn">Annuler</Link>
          <button type="button" className="btn accent" disabled={!pret || envoyer.isPending} onClick={() => envoyer.mutate()}>Envoyer {choisis.length} proposition(s)</button>
        </div>
      </section>
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}

      <div className="row">
        <div className="grow-main stack" style={{ gap: 16 }}>
          <section className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 18 }}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="small" style={{ color: 'var(--ink-2)' }}>Candidature</div>
              {nomCandidat ? (
                <div className="tile" style={{ background: 'var(--sunken)' }}>
                  <span className="avatar t-violet" aria-hidden="true">{initiales(nomCandidat)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 600 }}>{nomCandidat}</b><span className="muted small" style={{ display: 'block' }}>{sousTitre}</span></span>
                  {existante.data?.statut === 'A_PLANIFIER' && <span className="pill ok">Client : à rencontrer</span>}
                  {existante.data?.statut === 'REPORTEE' && <span className="pill warn">Reportée</span>}
                </div>
              ) : !client && !reunionId ? (
                <label className="field">Choisir une candidature
                  <select value={candidatureId} onChange={(e) => setCandidatureId(e.target.value)}>
                    <option value="">—</option>
                    {enCours.data?.map((c) => <option key={c.id} value={c.id}>{c.candidatNom} · {c.missionIntitule} ({c.etapeLibelle})</option>)}
                  </select>
                </label>
              ) : client && candidatureId ? <ProfilClient /> : <Chargement />}
              {!client && !reunionId && (
                <>
                  <div className="small" style={{ color: 'var(--ink-2)', marginTop: 4 }}>Type de réunion</div>
                  <div className="pills-choix" role="group" aria-label="Type de réunion">
                    {NATURES.map(([v, l]) => <button key={v} type="button" aria-pressed={nature === v} onClick={() => setNature(v)}>{l}</button>)}
                  </div>
                </>
              )}
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <div className="small" style={{ color: 'var(--ink-2)' }}>Mode</div>
              <div className="seg" role="group" aria-label="Mode">
                {(['VISIO', 'PRESENTIEL', 'TELEPHONE'] as TypeReunion[]).map((t) => <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>{libelleType[t]}</button>)}
              </div>
              <div className="box small muted" style={{ background: 'var(--surface-2)' }}>{INFO_MODE[type]}</div>
              {type === 'PRESENTIEL' && <label className="field">Adresse<input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Atlas Digital, Casa Anfa" /></label>}
              <div className="small" style={{ color: 'var(--ink-2)', marginTop: 4 }}>Durée</div>
              <div className="pills-choix" role="group" aria-label="Durée">
                {DUREES.map((d) => <button key={d} type="button" aria-pressed={duree === d} onClick={() => setDuree(d)}>{libelleDuree(d)}</button>)}
              </div>
            </div>
          </section>

          <section className="card stack" style={{ gap: 14 }}>
            <div className="card-head" style={{ margin: 0, flexWrap: 'wrap' }}>
              <div>
                <h2>Proposer jusqu'à 3 créneaux</h2>
                <div className="muted small">{plages.length ? 'Disponibilités du client croisées avec l’agenda du recruteur' : 'Créneaux libres dans l’agenda du recruteur'}</div>
              </div>
              <div className="chips small muted">
                <span className="legende"><span className="dot" style={{ background: 'var(--ok-bg)', border: '1px solid var(--ok)' }} />Libre</span>
                <span className="legende"><span className="dot" style={{ background: 'var(--stripes)' }} />Occupé</span>
                <span className="legende"><span className="dot" style={{ background: 'var(--accent)' }} />Proposé</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div className="grille-creneaux">
                <span />
                {jours.map((j) => <span key={j.toISOString()} className="muted small" style={{ textAlign: 'center', textTransform: 'capitalize' }}>{fmtJour(j.toISOString())}</span>)}
                {HEURES.map((h) => (
                  <Ligne key={h} h={h} jours={jours} duree={duree} plages={plages} reunions={reunions.data ?? []} sauf={reunionId} choisis={choisis} basculer={basculer} />
                ))}
              </div>
            </div>
            {plages.length === 0 && natureEffective === 'ENTRETIEN_CLIENT' && dispos.isSuccess && <Vide>Le client n'a pas indiqué de disponibilités : tous les créneaux libres sont proposables.</Vide>}
          </section>
        </div>

        <aside className="grow-side stack" style={{ gap: 16 }}>
          <section className="card accent stack" style={{ gap: 12 }}>
            <div className="small" style={{ opacity: 0.9 }}>Créneaux proposés</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}><span className="big">{choisis.length}</span><span className="small" style={{ paddingBottom: 8, opacity: 0.9 }}>sur 3<br />maximum</span></div>
            {[...choisis].sort().map((k) => (
              <div key={k} className="box" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 14 }}>
                <span style={{ textTransform: 'capitalize' }}>{fmtJour(k)} · {fmtHeure(k)}</span><span className="muted small">{libelleDuree(duree)} · {libelleType[type]}</span>
              </div>
            ))}
            <div className="small" style={{ opacity: 0.85 }}>Le candidat choisit un créneau ; les participants reçoivent l'invitation dès sa réponse. Les autres créneaux sont libérés.</div>
          </section>
          <section className="card stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 17 }}>Participants</h2>
            {existante.data ? existante.data.participants.map((p) => (
              <div key={`${p.role}-${p.email ?? p.nom}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`avatar ${p.role === 'CANDIDAT' ? 't-violet' : 't-peach'}`} style={{ width: 32, height: 32, flexBasis: 32, fontSize: 11 }} aria-hidden="true">{initiales(p.nom ?? '?')}</span>
                <span style={{ fontSize: 14 }}>{p.nom}<span className="muted" style={{ display: 'block', fontSize: 11 }}>{p.role === 'CANDIDAT' ? 'Candidat · choisit le créneau' : p.role === 'CLIENT' ? 'Client' : 'Recruteur'}</span></span>
              </div>
            )) : (
              <div className="muted small">Le candidat (qui choisit le créneau), {natureEffective === 'ENTRETIEN_CLIENT' ? 'le contact client de la mission ' : ''}et le recruteur sont invités.</div>
            )}
            <label className="check" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><input type="checkbox" checked readOnly /> Rappels e-mail 24 h et SMS 2 h avant</label>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Ligne({ h, jours, duree, plages, reunions, sauf, choisis, basculer }: {
  h: number; jours: Date[]; duree: number; plages: PlageDisponibilite[]; reunions: Reunion[]; sauf?: string; choisis: string[]; basculer: (k: string) => void;
}) {
  return (
    <>
      <span className="small" style={{ color: 'var(--faint)', display: 'flex', alignItems: 'center' }}>{h}:00</span>
      {jours.map((j) => {
        const k = cle(j, h);
        const debut = new Date(k);
        const pris = choisis.includes(k);
        const pasLibre = occupe(debut, duree, reunions, sauf);
        const hors = !dansDispos(debut, duree, plages);
        const bloque = pasLibre || hors;
        const etiquette = `${fmtJour(k)} ${h}:00 ${pasLibre ? 'occupé' : hors ? 'hors disponibilités du client' : pris ? 'proposé' : 'libre'}`;
        return (
          <button key={k} type="button" className={`slot ${pris ? 'pris' : pasLibre ? 'occupe' : hors ? 'hors' : ''}`} aria-pressed={pris} aria-label={etiquette}
            disabled={bloque && !pris} onClick={() => basculer(k)}>{pris ? '✓' : ''}</button>
        );
      })}
    </>
  );
}

/** Côté client : nom du candidat et intitulé de la mission, passés par la shortlist. */
function ProfilClient() {
  const [params] = useSearchParams();
  return (
    <div className="tile" style={{ background: 'var(--sunken)' }}>
      <span className="avatar t-violet" aria-hidden="true">{initiales(params.get('nom') ?? '?')}</span>
      <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 600 }}>{params.get('nom') ?? 'Candidat de votre shortlist'}</b><span className="muted small" style={{ display: 'block' }}>{params.get('mission') ?? ''}</span></span>
    </div>
  );
}
