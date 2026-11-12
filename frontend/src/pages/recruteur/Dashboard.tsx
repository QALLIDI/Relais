import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api } from '../../api/client';
import { initiales, ilYa, joursRestants, libelleJours, n, parSemaine } from '../../api/format';
import { fmtHeure, fmtJour, memeJour, useReunions } from '../../api/reunions';
import type { Candidature, FacturationStats, Facture, Mission, MissionResume, SelectionStats } from '../../api/types';
import { versFenetre } from '../../components/Fenetre';
import { Chargement, Icone, Indicateur, Segments, TetePage, Vide } from '../../components/ui';
import { useDemandesRattachement } from './DemandesRattachement';

type Periode = 'jour' | 'semaine' | 'mois';
const PERIODES: { v: Periode; l: string }[] = [{ v: 'jour', l: "Aujourd'hui" }, { v: 'semaine', l: 'Cette semaine' }, { v: 'mois', l: 'Ce mois' }];
const DUREES: Record<Periode, number> = { jour: 1, semaine: 7, mois: 31 };
const mois = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

type Activite = { id: string; quand: string; texte: string; mission: string; par: string; initiales: string };

export default function Dashboard() {
  const auth = useAuth();
  const prenom = (auth.user?.profile.name ?? '').split(' ')[0];
  const [periode, setPeriode] = useState<Periode>('semaine');

  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const selection = useQuery({ queryKey: ['selection', 'stats'], queryFn: async () => (await api.get<SelectionStats>('/api/selection/stats')).data });
  const candidatures = useQuery({ queryKey: ['candidatures', 'en-cours'], queryFn: async () => (await api.get<Candidature[]>('/api/candidatures')).data });
  const factu = useQuery({ queryKey: ['facturation', 'stats'], queryFn: async () => (await api.get<FacturationStats>('/api/facturation/stats')).data });
  const factures = useQuery({ queryKey: ['factures'], queryFn: async () => (await api.get<Facture[]>('/api/factures')).data });
  const reunions = useReunions();
  const demandes = useDemandesRattachement();

  const maintenant = new Date();
  const depuis = new Date(maintenant.getTime() - DUREES[periode] * 86400000);
  const dansPeriode = (v?: string) => !!v && new Date(v) >= (periode === 'jour' ? new Date(maintenant.toDateString()) : depuis);

  const cands = candidatures.data ?? [];
  const actives = (missions.data ?? []).filter((m) => m.statut === 'OUVERTE');
  const nouvellesMissions = (missions.data ?? []).filter((m) => dansPeriode(m.createdAt)).length;
  const enCours = resumes.data?.reduce((s, r) => s + r.enCours, 0) ?? 0;
  const aQualifier = cands.filter((c) => c.etape === 'SOURCE').length;
  const aPresenter = cands.filter((c) => c.etape === 'QUALIFIE' || c.etape === 'ENTRETIEN_RECRUTEUR').length;
  const aEvaluer = resumes.data?.reduce((s, r) => s + r.aEvaluer, 0) ?? 0;
  const presentes = cands.filter((c) => dansPeriode(c.presenteLe)).length;
  const enAttente = (factures.data ?? []).filter((f) => f.statut === 'EMISE' || f.statut === 'EN_RETARD').length;

  // Fil d'activité : mouvements du pipeline, retours clients et factures, du plus récent au plus ancien.
  const activites: Activite[] = [
    ...cands.map((c) => ({
      id: 'c' + c.id, quand: c.updatedAt, mission: c.missionIntitule,
      texte: c.avisClient ? `Avis du client sur ${c.candidatNom}` : `${c.candidatNom} : ${c.etapeLibelle.toLowerCase()}`,
      par: c.avisClient ? c.entrepriseNom : 'Vous', initiales: initiales(c.candidatNom),
    })),
    ...(factures.data ?? []).filter((f) => f.statut !== 'BROUILLON').map((f) => ({
      id: 'f' + f.id, quand: f.datePaiement ?? f.dateEmission ?? '', mission: f.objet,
      texte: `Facture ${f.numero ?? ''} ${f.statut === 'PAYEE' ? 'payée' : f.statut === 'EN_RETARD' ? 'en retard' : 'envoyée'}`,
      par: f.entrepriseNom, initiales: 'F',
    })),
  ].filter((a) => dansPeriode(a.quand)).sort((a, b) => b.quand.localeCompare(a.quand)).slice(0, 8);

  const aVenir = (reunions.data ?? [])
    .filter((r) => (r.statut === 'CONFIRMEE' || r.statut === 'PROPOSEE') && r.debut && new Date(r.fin ?? r.debut) >= maintenant)
    .sort((a, b) => (a.debut ?? '').localeCompare(b.debut ?? ''))
    .slice(0, 4);
  const echeances = actives.filter((m) => m.dateLimite).sort((a, b) => a.dateLimite!.localeCompare(b.dateLimite!)).slice(0, 4);

  return (
    <>
      <TetePage titre={`Bonjour ${prenom}`} sous="Voici l'avancement de vos missions.">
        <Segments label="Période" options={PERIODES} valeur={periode} onChange={setPeriode} />
        <Link to={versFenetre('mission')} className="btn primary"><Icone nom="plus" taille={16} />Nouvelle mission</Link>
      </TetePage>

      <section className="indicateurs" aria-label="Indicateurs">
        <Indicateur label="Missions actives" valeur={actives.length} note={nouvellesMissions ? `+${nouvellesMissions} sur la période` : `${(missions.data ?? []).filter((m) => m.statut === 'EN_VALIDATION').length} à valider`}
          tendance={parSemaine((missions.data ?? []).map((m) => m.createdAt))} ton="lavande" />
        <Indicateur label="Candidats en cours" valeur={enCours} note={`${aQualifier} à qualifier`} tendance={parSemaine(cands.map((c) => c.updatedAt))} />
        <Indicateur label="Shortlists envoyées" valeur={presentes}
          note={selection.data?.delaiMoyenShortlistJours != null ? `délai moyen ${Math.round(selection.data.delaiMoyenShortlistJours)} jours` : 'profils présentés'}
          tendance={parSemaine(cands.map((c) => c.presenteLe))} ton="vert" />
        <Indicateur label="Facturé" coin="HT" valeur={n(factu.data?.factureCeMois ?? 0)} unite="MAD" note={`${enAttente} facture(s) en attente`}
          tendance={(factu.data?.encaisseParMois ?? []).map((m) => Number(m.montant))} ton="ambre" />
      </section>

      <div className="tableau-bord">
        <div className="colonne-gauche">
          <section aria-labelledby="a-traiter">
            <h2 id="a-traiter" className="titre-section">À traiter aujourd'hui</h2>
            <div className="a-traiter">
              <Link to="/recruteur/pipeline"><span className="nb">{aQualifier}</span><span className="txt"><b>Préqualifications</b><span className="s">Candidats à appeler</span></span><Icone nom="droite" taille={16} /></Link>
              <Link to="/recruteur/pipeline"><span className="nb">{aPresenter}</span><span className="txt"><b>Profils à présenter</b><span className="s">Qualifiés, prêts pour la shortlist</span></span><Icone nom="droite" taille={16} /></Link>
              <Link to="/recruteur/agenda"><span className="nb">{aEvaluer}</span><span className="txt"><b>Entretiens à évaluer</b><span className="s">Retour client attendu</span></span><Icone nom="droite" taille={16} /></Link>
              {(demandes.data?.length ?? 0) > 0 && (
                <Link to="/recruteur/entreprises"><span className="nb">{demandes.data!.length}</span><span className="txt"><b>Demandes d'accès</b><span className="s">Comptes entreprise à rattacher</span></span><Icone nom="droite" taille={16} /></Link>
              )}
            </div>
          </section>

          <section className="bloc" aria-labelledby="activites">
            <div className="bloc-tete">
              <h2 id="activites">Dernières activités</h2>
              <Link to="/recruteur/notifications" className="lien-discret">Tout voir</Link>
            </div>
            {candidatures.isLoading ? <div className="bloc-corps"><Chargement /></div>
              : activites.length === 0 ? <div className="bloc-corps"><Vide>Rien de nouveau sur cette période.</Vide></div>
              : (
                <div className="table-wrap">
                  <table style={{ minWidth: 640 }}>
                    <thead><tr><th>Activité</th><th>Mission</th><th>Par</th><th className="num">Quand</th></tr></thead>
                    <tbody>
                      {activites.map((a) => (
                        <tr key={a.id}>
                          <td><div className="personne" style={{ gap: 10 }}><span className="mono-av" aria-hidden="true">{a.initiales}</span>{a.texte}</div></td>
                          <td className="muted">{a.mission}</td>
                          <td className="muted">{a.par}</td>
                          <td className="num muted">{ilYa(a.quand, maintenant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>
        </div>

        <div className="colonne-droite">
          <section className="bloc" aria-labelledby="reunions">
            <div className="bloc-tete">
              <h2 id="reunions">Prochaines réunions</h2>
              <Link to="/recruteur/agenda" className="lien-discret">Agenda</Link>
            </div>
            <div className="bloc-corps">
              {reunions.isLoading && <Chargement />}
              {reunions.data && aVenir.length === 0 && <Vide>Aucune réunion à venir.</Vide>}
              {aVenir.map((r) => (
                <Link key={r.id} to={`/recruteur/agenda?reunion=${r.id}`}
                  className={`rdv ${r.nature === 'ENTRETIEN_CLIENT' ? 'lavande' : ''}`}>
                  <span className="h">{fmtHeure(r.debut!)}</span>
                  <span className="txt">
                    <b>{r.candidatNom ?? r.entrepriseNom}</b>
                    <span>{r.nature === 'ENTRETIEN_CLIENT' ? `Entretien avec ${r.entrepriseNom}` : `${r.natureLibelle} · ${r.dureeMinutes} min`}{memeJour(new Date(r.debut!), maintenant) ? '' : ` · ${fmtJour(r.debut!)}`}</span>
                  </span>
                  <span className="etat">{r.statut === 'CONFIRMEE' ? 'Confirmé' : 'En attente'}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="bloc" aria-labelledby="echeances">
            <div className="bloc-tete"><h2 id="echeances">Échéances proches</h2></div>
            <div className="bloc-corps">
              {missions.data && echeances.length === 0 && <Vide>Aucune échéance.</Vide>}
              {echeances.map((m, i) => {
                const d = new Date(m.dateLimite!);
                const j = joursRestants(m.dateLimite!, maintenant);
                return (
                  <Link key={m.id} to={`/recruteur/missions/${m.id}`} className="echeance">
                    <span className={`date-bloc ${['lavande', '', 'menthe'][i % 3]}`}><b>{d.getDate()}</b><span>{mois.format(d)}</span></span>
                    <span className="txt"><b>{m.intitule}</b><span>{m.entrepriseNom}</span></span>
                    <span className="reste" style={j < 0 ? { color: 'var(--bad)' } : undefined}>{libelleJours(j)}</span>
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
