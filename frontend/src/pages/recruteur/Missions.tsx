import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { initiales, joursRestants, libelleJours, libelleStatutMission } from '../../api/format';
import { lundi } from '../../api/reunions';
import type { Mission, MissionResume, StatutMission } from '../../api/types';
import { versFenetre } from '../../components/Fenetre';
import { Chargement, Erreur, Icone, Pill, TetePage, toneMission, Vide } from '../../components/ui';

type Phase = 'Sourcing' | 'Qualification' | 'Shortlist' | 'Entretiens';
const PHASES: Phase[] = ['Sourcing', 'Qualification', 'Shortlist', 'Entretiens'];
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const jourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const moisAnnee = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

/** Phase d'une mission ouverte, déduite des compteurs du pipeline. */
function phase(r?: MissionResume): Phase {
  if (!r || r.sources + r.enCours === 0) return 'Sourcing';
  if (r.presentes === 0) return r.enCours >= 3 ? 'Qualification' : 'Sourcing';
  return r.aEvaluer > 0 ? 'Entretiens' : 'Shortlist';
}
const prochaineEtape: Record<Phase, (r?: MissionResume) => string> = {
  Sourcing: () => 'Annonce diffusée',
  Qualification: () => 'Qualifications en cours',
  Shortlist: (r) => (r && r.presentes > 0 ? 'Avis client attendu' : 'Shortlist à envoyer'),
  Entretiens: () => 'Entretiens client',
};
const compte: Record<Phase, (r?: MissionResume) => string> = {
  Sourcing: (r) => `${r?.sources ?? 0} candidatures`,
  Qualification: (r) => `${r?.enCours ?? 0} candidats`,
  Shortlist: (r) => `${r?.presentes ?? 0} en shortlist`,
  Entretiens: (r) => `${r?.aEvaluer ?? 0} à évaluer`,
};
const tonPhase: Partial<Record<Phase, string>> = { Shortlist: 'menthe', Entretiens: 'lavande' };

export default function Missions() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState<Phase | 'Toutes'>('Toutes');
  const [recherche, setRecherche] = useState('');
  const [chercher, setChercher] = useState(false);
  const [client, setClient] = useState('');
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const statut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: StatutMission }) => api.patch(`/api/missions/${id}/statut`, { statut: s }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['missions'] }),
  });
  const parMission = new Map(resumes.data?.map((r) => [r.missionId, r]));
  const q = recherche.trim().toLowerCase();

  const ouvertes = (missions.data ?? [])
    .filter((m) => m.statut === 'OUVERTE')
    .filter((m) => !q || `${m.intitule} ${m.entrepriseNom}`.toLowerCase().includes(q))
    .filter((m) => !client || m.entrepriseId === client);
  const clients = [...new Map((missions.data ?? []).filter((m) => m.statut === 'OUVERTE').map((m) => [m.entrepriseId, m.entrepriseNom])).entries()];
  const visibles = ouvertes.filter((m) => filtre === 'Toutes' || phase(parMission.get(m.id)) === filtre);
  const autres = (missions.data ?? []).filter((m) => m.statut !== 'OUVERTE');

  // Regroupement par semaine d'échéance (les missions sans échéance à la fin).
  const semaines = new Map<string, Mission[]>();
  for (const m of [...visibles].sort((a, b) => (a.dateLimite ?? '9').localeCompare(b.dateLimite ?? '9'))) {
    const cle = m.dateLimite ? lundi(new Date(m.dateLimite)).toISOString() : 'aucune';
    semaines.set(cle, [...(semaines.get(cle) ?? []), m]);
  }
  const echeances = ouvertes.filter((m) => m.dateLimite).sort((a, b) => a.dateLimite!.localeCompare(b.dateLimite!));

  return (
    <>
      <TetePage titre="Missions" sous="Suivez chaque mission, de l'ouverture du besoin jusqu'à l'embauche.">
        {chercher || recherche ? (
          <label className="recherche-courte">
            <Icone nom="loupe" taille={16} />
            <span className="sr-only">Rechercher une mission</span>
            <input type="search" autoFocus placeholder="Mission ou client" value={recherche} onChange={(e) => setRecherche(e.target.value)} onBlur={() => setChercher(false)} />
          </label>
        ) : (
          <button type="button" className="ico" aria-label="Rechercher une mission" onClick={() => setChercher(true)}><Icone nom="loupe" /></button>
        )}
        <Link className="btn primary" to={versFenetre('mission')}><Icone nom="plus" taille={16} />Nouvelle mission</Link>
      </TetePage>
      {statut.error && <Erreur message={messageErreur(statut.error)} />}

      <div className="tableau-bord">
        <div className="colonne-gauche">
          <section className="bloc" aria-labelledby="par-semaine">
            <div className="bloc-tete">
              <h2 id="par-semaine">Échéances par semaine</h2>
              <label className="filtre-pilule">
                <Icone nom="filtre" taille={14} />
                <span className="sr-only">Filtrer par client</span>
                <select value={client} onChange={(e) => setClient(e.target.value)}>
                  <option value="">Tous les clients</option>
                  {clients.map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
                </select>
                <span className="nb">{visibles.length}</span>
              </label>
            </div>
            <div className="bloc-corps" style={{ paddingBottom: 12 }}>
              <div className="filtres" role="group" aria-label="Filtrer par phase">
                {(['Toutes', ...PHASES] as const).map((f) => (
                  <button key={f} type="button" aria-pressed={filtre === f} onClick={() => setFiltre(f)}>{f}</button>
                ))}
              </div>
            </div>
            {missions.isLoading && <div className="bloc-corps"><Chargement /></div>}
            {missions.data && visibles.length === 0 && <div className="bloc-corps"><Vide>Aucune mission ouverte dans cette phase.</Vide></div>}
            {[...semaines.entries()].map(([cle, liste]) => {
              const debut = cle === 'aucune' ? null : new Date(cle);
              const fin = debut ? new Date(debut.getTime() + 6 * 86400000) : null;
              return (
                <div key={cle} className="semaine-ligne">
                  <div className="semaine-libelle">
                    {debut ? <><b>Sem. {numeroSemaine(debut)}</b><span>{debut.getMonth() === fin!.getMonth() ? `${debut.getDate()} – ${jourMois.format(fin!)}` : `${jourMois.format(debut)} – ${jourMois.format(fin!)}`}</span></> : <b>Sans échéance</b>}
                  </div>
                  <div className="semaine-cartes">
                    {liste.map((m) => {
                      const r = parMission.get(m.id);
                      const ph = phase(r);
                      return (
                        <Link key={m.id} to={`/recruteur/missions/${m.id}`} className={`carte-mission ${tonPhase[ph] ?? ''}`}>
                          <span className="carte-tete">
                            <span className="mono-av" aria-hidden="true">{initiales(m.entrepriseNom)}</span>
                            <span className="txt"><b>{m.intitule}</b><span>{m.entrepriseNom}{m.confidentiel ? ' · confidentiel' : ''}</span></span>
                          </span>
                          <span className="etape-suivante"><span>{prochaineEtape[ph](r)}</span><b>{m.dateLimite ? jourCourt.format(new Date(m.dateLimite)) : '—'}</b></span>
                          <span className="tags"><span className="tag">{ph}</span><span className="tag">{compte[ph](r)}</span></span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {autres.length > 0 && (
            <section className="bloc" aria-labelledby="autres">
              <div className="bloc-tete"><h2 id="autres">À valider, en pause et terminées</h2></div>
              <div className="table-wrap">
                <table style={{ minWidth: 560 }}>
                  <thead><tr><th>Mission</th><th>Client</th><th>Statut</th><th /></tr></thead>
                  <tbody>
                    {autres.map((m) => (
                      <tr key={m.id}>
                        <td><Link to={`/recruteur/missions/${m.id}`} className="nom-lien">{m.intitule}</Link></td>
                        <td className="muted">{m.entrepriseNom}</td>
                        <td><Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill>{m.motifAnnulation && <div className="muted small" style={{ marginTop: 4 }}>{m.motifAnnulation}</div>}</td>
                        <td className="num">
                          {m.statut === 'EN_VALIDATION' && <button className="btn small primary" onClick={() => statut.mutate({ id: m.id, s: 'OUVERTE' })}>Valider et ouvrir</button>}
                          {m.statut === 'BROUILLON' && <Link className="btn small" to={`/recruteur/missions/${m.id}`}>Compléter</Link>}
                          {m.statut === 'EN_PAUSE' && <button className="btn small" onClick={() => statut.mutate({ id: m.id, s: 'OUVERTE' })}>Rouvrir</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="colonne-droite">
          <Calendrier dates={echeances.map((m) => m.dateLimite!)} />
          <section className="bloc" aria-labelledby="proches">
            <div className="bloc-tete"><h2 id="proches">Échéances proches</h2></div>
            <div className="bloc-corps">
              {missions.data && echeances.length === 0 && <Vide>Aucune échéance.</Vide>}
              {echeances.slice(0, 4).map((m) => {
                const r = parMission.get(m.id);
                const ph = phase(r);
                return (
                  <Link key={m.id} to={`/recruteur/missions/${m.id}`} className={`rdv ${tonPhase[ph] ?? ''}`}>
                    <span className="mono-av" aria-hidden="true">{initiales(m.entrepriseNom)}</span>
                    <span className="txt"><b>{m.intitule}</b><span>{prochaineEtape[ph](r)} le {jourCourt.format(new Date(m.dateLimite!))}</span></span>
                    <span className="etat">{libelleJours(joursRestants(m.dateLimite!))}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function numeroSemaine(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const an = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - an.getTime()) / 86400000 + 1) / 7);
}

/** Calendrier du mois : aujourd'hui en bleu, un point sous chaque jour d'échéance. */
export function Calendrier({ dates }: { dates: string[] }) {
  const auj = new Date();
  const [mois, setMois] = useState(new Date(auj.getFullYear(), auj.getMonth(), 1));
  const premier = (mois.getDay() + 6) % 7;
  const nbJours = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
  const jours = new Set(dates.map((d) => new Date(d)).filter((d) => d.getMonth() === mois.getMonth() && d.getFullYear() === mois.getFullYear()).map((d) => d.getDate()));
  const cases = [...Array(premier).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];
  const decaler = (n: number) => setMois(new Date(mois.getFullYear(), mois.getMonth() + n, 1));
  return (
    <section className="bloc calendrier" aria-label={`Calendrier de ${moisAnnee.format(mois)}`}>
      <div className="cal-tete">
        <button type="button" className="ico petit" onClick={() => decaler(-1)} aria-label="Mois précédent"><Icone nom="gauche" taille={16} /></button>
        <b>{moisAnnee.format(mois).replace(/^./, (c) => c.toUpperCase())}</b>
        <button type="button" className="ico petit" onClick={() => decaler(1)} aria-label="Mois suivant"><Icone nom="droite" taille={16} /></button>
      </div>
      <div className="cal-grille">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((j) => <span key={j} className="cal-jour">{j}</span>)}
        {cases.map((j, i) => {
          if (!j) return <span key={i} />;
          const estAuj = j === auj.getDate() && mois.getMonth() === auj.getMonth() && mois.getFullYear() === auj.getFullYear();
          const weekend = i % 7 >= 5;
          return (
            <span key={i} className={`cal-case ${estAuj ? 'auj' : ''} ${jours.has(j) ? 'echeance' : ''} ${weekend ? 'we' : ''}`}>
              {j}{jours.has(j) && <span className="sr-only"> (échéance)</span>}
            </span>
          );
        })}
      </div>
      <p className="muted small" style={{ margin: '4px 16px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="point-ton" style={{ background: 'var(--accent)' }} />{jours.size} échéance(s) ce mois
      </p>
    </section>
  );
}
