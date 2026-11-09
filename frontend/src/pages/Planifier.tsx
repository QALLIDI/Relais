import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api, messageErreur } from '../api/client';
import { initiales } from '../api/format';
import { fmtHeure, fmtJour, libelleType, useReunion, useReunions } from '../api/reunions';
import type { Candidature, NatureReunion, PlageDisponibilite, Reunion, TypeReunion } from '../api/types';
import { Annuler, Fenetre } from '../components/Fenetre';
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
 * Panneau « Planifier une réunion » : depuis une candidature (?candidature=) ou pour une réunion
 * à planifier ou reportée (?reunion=). Sert au recruteur et au client ; s'ouvre par-dessus la page courante.
 */
export default function PanneauPlanifier({ espace, onFermer }: { espace: 'recruteur' | 'entreprise'; onFermer: () => void }) {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const reunionId = params.get('reunion') ?? '';
  const existante = useReunion(reunionId);
  const reunions = useReunions();
  const client = espace === 'entreprise';

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
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['reunions'] }); onFermer(); },
  });

  const jours = prochainsJours();
  const basculer = (k: string) => setChoisis((s) => (s.includes(k) ? s.filter((x) => x !== k) : s.length < 3 ? [...s, k] : s));
  const nomCandidat = existante.data?.candidatNom ?? candidature?.candidatNom ?? params.get('nom') ?? undefined;
  const sousTitre = existante.data ? `${existante.data.missionIntitule ?? ''} · ${existante.data.entrepriseNom ?? ''}` : candidature ? `${candidature.missionIntitule} · ${candidature.entrepriseNom}` : params.get('mission') ?? '';
  const pret = choisis.length > 0 && (!!reunionId || !!candidatureId) && (type !== 'PRESENTIEL' || !!lieu.trim());

  return (
    <Fenetre type="drawer" largeur={600} onFermer={onFermer} modifie={choisis.length > 0}
      titre={reunionId ? 'Proposer de nouveaux créneaux' : 'Planifier une réunion'}
      sousTitre="Jusqu’à 3 créneaux. Invitation .ics, lien visio et rappels partent automatiquement."
      pied={<>
        <Annuler onClick={onFermer} />
        <button type="button" className="btn primary" disabled={!pret || envoyer.isPending} onClick={() => envoyer.mutate()}>
          {choisis.length > 1 ? `Envoyer les ${choisis.length} propositions` : 'Envoyer la proposition'}
        </button>
      </>}>
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}

      {nomCandidat ? (
        <div className="tile" style={{ background: 'var(--sunken)', border: 0 }}>
          <span className="avatar t-violet" aria-hidden="true">{initiales(nomCandidat)}</span>
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 600 }}>{nomCandidat}</b><span className="muted small" style={{ display: 'block' }}>{sousTitre}</span></span>
          {existante.data?.statut === 'A_PLANIFIER' && <span className="pill ok-soft">Client : à rencontrer</span>}
          {existante.data?.statut === 'REPORTEE' && <span className="pill warn">Reportée</span>}
        </div>
      ) : !client && !reunionId ? (
        <label className="field">Candidature
          <select value={candidatureId} onChange={(e) => setCandidatureId(e.target.value)}>
            <option value="">Choisir une candidature…</option>
            {enCours.data?.map((c) => <option key={c.id} value={c.id}>{c.candidatNom} · {c.missionIntitule} ({c.etapeLibelle})</option>)}
          </select>
        </label>
      ) : <Chargement />}

      {!client && !reunionId && (
        <div className="field">Type de réunion
          <div className="choix" role="group" aria-label="Type de réunion">
            {NATURES.map(([v, l]) => <button key={v} type="button" aria-pressed={nature === v} onClick={() => setNature(v)}>{l}</button>)}
          </div>
        </div>
      )}
      <div className="form-grid" style={{ gap: 12 }}>
        <div className="field">Format
          <div className="choix" role="group" aria-label="Format">
            {(['VISIO', 'PRESENTIEL', 'TELEPHONE'] as TypeReunion[]).map((t) => <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>{libelleType[t]}</button>)}
          </div>
        </div>
        <div className="field">Durée
          <div className="choix" role="group" aria-label="Durée">
            {DUREES.map((d) => <button key={d} type="button" aria-pressed={duree === d} onClick={() => setDuree(d)}>{libelleDuree(d)}</button>)}
          </div>
        </div>
      </div>
      <div className="encadre">{INFO_MODE[type]}</div>
      {type === 'PRESENTIEL' && <label className="field">Adresse<input value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Atlas Digital, Casa Anfa" /></label>}

      <div className="stack" style={{ gap: 8 }}>
        <div className="muted small">{plages.length ? 'Disponibilités du client croisées avec l’agenda du recruteur' : 'Créneaux libres dans l’agenda du recruteur'} · cliquez pour proposer</div>
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
      </div>

      {choisis.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="muted small">Créneaux proposés ({choisis.length} sur 3)</div>
          {[...choisis].sort().map((k) => (
            <div key={k} className="tile" style={{ padding: '8px 12px', justifyContent: 'space-between' }}>
              <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{fmtJour(k)} · {fmtHeure(k)}</span><span className="muted small">{libelleDuree(duree)} · {libelleType[type]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        <div className="muted small">Participants</div>
        {existante.data ? (
          <div className="chips">
            {existante.data.participants.map((p) => (
              <span key={`${p.role}-${p.email ?? p.nom}`} className="chip">{p.nom}<span className="muted small">{p.role === 'CANDIDAT' ? 'candidat' : p.role === 'CLIENT' ? 'client' : 'recruteur'}</span></span>
            ))}
          </div>
        ) : (
          <div className="muted small">Le candidat (qui choisit le créneau), {natureEffective === 'ENTRETIEN_CLIENT' ? 'le contact client de la mission ' : ''}et le recruteur sont invités.</div>
        )}
        <label className="check"><input type="checkbox" checked readOnly /> Rappels : e-mail la veille et SMS 2 h avant</label>
      </div>
    </Fenetre>
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
