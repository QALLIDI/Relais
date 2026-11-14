import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api } from '../../api/client';
import { dateFr, initiales, libelleStatutFacture, libelleStatutMission, n } from '../../api/format';
import { useMessagesNonLus } from '../../api/messagerie';
import { useReunions } from '../../api/reunions';
import type { Facture, Mission, MissionResume, ProfilPresente } from '../../api/types';

const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
import { versFenetre } from '../../components/Fenetre';
import { Chargement, Icone, Indicateur, Pill, Progression, TetePage, Vide, toneFacture, toneMission } from '../../components/ui';
import { useSession } from '../../auth/useSession';

/** Étapes vues par le client : besoin validé, recherche, shortlist, entretiens, embauche. */
function etapeClient(m: Mission, r?: MissionResume): number {
  if (m.statut === 'EN_VALIDATION' || m.statut === 'BROUILLON') return 0;
  if (m.statut === 'POURVUE' || (r?.places ?? 0) > 0) return 5;
  if ((r?.presentes ?? 0) > 0) return r && r.aEvaluer > 0 ? 3 : 4;
  return 2;
}

export default function EntrepriseAccueil() {
  const auth = useAuth();
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const resumes = useQuery({ queryKey: ['selection', 'missions'], queryFn: async () => (await api.get<MissionResume[]>('/api/selection/missions')).data });
  const reunions = useReunions();
  const entretiens = (reunions.data ?? []).filter((r) => (r.statut === 'CONFIRMEE' || r.statut === 'PROPOSEE') && (!r.fin || new Date(r.fin) >= new Date()));
  const { admin } = useSession();
  const factures = useQuery({ queryKey: ['factures'], queryFn: async () => (await api.get<Facture[]>('/api/factures')).data, enabled: admin });
  const aVoir = useQuery({ queryKey: ['shortlist', 'a-evaluer'], queryFn: async () => (await api.get<ProfilPresente[]>('/api/shortlists/a-evaluer')).data });

  const parMission = new Map(resumes.data?.map((r) => [r.missionId, r]));
  const nonLus = new Map((useMessagesNonLus().data ?? []).map((f) => [f.missionId, f.nonLus]));
  const actives = missions.data?.filter((m) => ['OUVERTE', 'EN_VALIDATION', 'EN_PAUSE'].includes(m.statut)) ?? [];
  const aEvaluer = resumes.data?.reduce((s, r) => s + r.aEvaluer, 0) ?? 0;
  const pourvus = resumes.data?.reduce((s, r) => s + r.places, 0) ?? 0;
  const prenom = auth.user?.profile.given_name ?? auth.user?.profile.name;

  return (
    <div className="page">
      <TetePage titre={prenom ? `Bonjour ${prenom.split(' ')[0]}` : 'Mes recrutements'} sous="Où en sont vos recrutements, et ce qui attend votre avis.">
        {admin && <Link className="btn primary" to="/entreprise/besoin"><Icone nom="plus" taille={16} />Nouveau besoin</Link>}
      </TetePage>

      {aEvaluer > 0 && (
        <Link to={`/entreprise/shortlist/${aVoir.data?.[0]?.missionId ?? ''}`} className="ent-a-faire">
          <span className="nb">{aEvaluer}</span>
          <span className="txt"><b>{aEvaluer} profil{aEvaluer > 1 ? 's' : ''} attend{aEvaluer > 1 ? 'ent' : ''} votre avis</b><span>Un avis sous 48 h garde le rythme : les bons profils partent vite.</span></span>
          <span className="btn small primary">Donner mon avis <Icone nom="droite" taille={14} /></span>
        </Link>
      )}

      <section className="indicateurs" aria-label="Indicateurs">
        <Indicateur label="Postes ouverts" valeur={missions.data?.filter((m) => m.statut === 'OUVERTE').length ?? '—'} note={`${actives.length} recrutement(s) en cours`} ton="lavande" />
        <Indicateur label="Profils à évaluer" valeur={aEvaluer} note={aEvaluer ? 'votre avis est attendu' : 'rien en attente'} ton="ambre" />
        <Indicateur label="Entretiens à venir" valeur={entretiens.length} note="confirmés ou proposés" />
        <Indicateur label="Postes pourvus" valeur={pourvus} note="depuis le début" ton="vert" />
      </section>

      {missions.isLoading && <Chargement />}
      {actives.length === 0 && !missions.isLoading && (
        <section className="card stack">
          <Vide>Aucune mission en cours. Exprimez un besoin pour lancer un recrutement.</Vide>
          {admin
            ? <Link className="btn accent" to="/entreprise/besoin" style={{ alignSelf: 'flex-start' }}>Exprimer un besoin</Link>
            : <p className="muted small" style={{ margin: 0 }}>Un administrateur de votre entreprise peut exprimer un nouveau besoin.</p>}
        </section>
      )}
      <div className="grid-2">
        {actives.map((m) => {
          const r = parMission.get(m.id);
          const etape = etapeClient(m, r);
          if (r && r.aEvaluer > 0) {
            const visages = aVoir.data?.filter((c) => c.missionId === m.id).slice(0, 3) ?? [];
            return (
              <Link key={m.id} to={`/entreprise/shortlist/${m.id}`} className="card accent" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24, textDecoration: 'none', minHeight: 230 }}>
                <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                  <div>
                    <span className="pill veil">Shortlist reçue</span>
                    <div style={{ fontSize: 26, marginTop: 10, lineHeight: 1.15 }}>{m.intitule}</div>
                  </div>
                  <span className="btn light small">Évaluer les profils →</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex' }} aria-hidden="true">
                    {visages.map((c) => (
                      <span key={c.candidatureId} style={{ width: 44, height: 44, marginRight: -10, borderRadius: '50%', border: '2px solid #fff', background: '#fff', color: '#17181c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{initiales(c.candidatNom)}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                    <span className="big">{r.aEvaluer}</span>
                    <span className="small" style={{ paddingBottom: 8 }}>profil(s)<br />à évaluer</span>
                  </div>
                </div>
              </Link>
            );
          }
          return (
            <section key={m.id} className="card stack" style={{ gap: 14 }}>
              <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>{m.intitule}</h2>
                  <div className="muted small">{[m.typeContrat, m.ville].filter(Boolean).join(' · ')} · créée le {dateFr(m.createdAt)}</div>
                </div>
                <Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill>
              </div>
              <div className="muted small">
                {m.statut === 'EN_VALIDATION' ? 'Votre recruteur revient vers vous pour valider le besoin.' : r && r.presentes > 0 ? `${r.presentes} profil(s) présenté(s).` : 'La recherche de profils est en cours.'}
              </div>
              <Progression etape={Math.max(etape, 1)} total={5} enCours={etape < 5} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4, fontSize: 11 }} className="muted">
                <span>Besoin validé</span><span>Recherche</span><span>Shortlist</span><span>Entretiens</span><span>Embauche</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {r && r.presentes > 0 && <Link className="btn small" to={`/entreprise/shortlist/${m.id}`}>Voir les profils</Link>}
                <Link className="btn small" to={versFenetre('echanges', { mission: m.id })}>
                  <Icone nom="bulle" taille={14} />Écrire au recruteur
                  {(nonLus.get(m.id) ?? 0) > 0 && <span className="msg-compte" aria-label={`${nonLus.get(m.id)} non lu(s)`}>{nonLus.get(m.id)}</span>}
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>Entretiens à venir</h2>
            <Link to="/entreprise/entretiens" className="btn small">Tout voir</Link>
          </div>
          {entretiens.length === 0 && <Vide>Aucun entretien planifié.</Vide>}
          {entretiens.map((e) => {
            const d = e.debut ? new Date(e.debut) : e.creneaux[0] ? new Date(e.creneaux[0].debut) : null;
            return (
              <Link key={e.id} to="/entreprise/entretiens" className="tile" style={{ textDecoration: 'none' }}>
                <div className="box" style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--surface)' }}>
                  <div className="muted small" style={{ textTransform: 'capitalize' }}>{d ? jour.format(d) : '—'}</div>
                  <div style={{ fontSize: 22, fontWeight: 500 }}>{d ? d.getDate() : ''}</div>
                </div>
                <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{e.candidatNom} · {e.missionIntitule}</div>
                  <div className="muted small">{e.statut === 'CONFIRMEE' && d ? heure.format(d) : `${e.creneaux.length} créneau(x) proposé(s)`} · {e.type === 'PRESENTIEL' ? e.lieu ?? 'sur site' : e.typeLibelle}</div>
                </div>
                <Pill tone={e.statut === 'CONFIRMEE' ? 'ok' : 'warn'}>{e.statut === 'CONFIRMEE' ? 'Confirmé' : 'En attente du candidat'}</Pill>
              </Link>
            );
          })}
        </section>
        {admin && <section className="card">
          <div className="card-head">
            <h2>Factures</h2>
            <Link to="/entreprise/factures" className="btn small">Tout voir</Link>
          </div>
          {factures.data?.length === 0 && <Vide>Aucune facture.</Vide>}
          {factures.data?.slice(0, 4).map((f) => (
            <div key={f.id} className="tile">
              <span style={{ flex: '1 1 180px', minWidth: 0 }}>{f.objet}<span className="muted small" style={{ display: 'block' }}>{f.numero ?? 'Brouillon'}</span></span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 500 }}>{n(f.montantTtc)}</span>
              <Pill tone={toneFacture(f.statut)}>{libelleStatutFacture[f.statut]}</Pill>
            </div>
          ))}
        </section>}
      </div>
    </div>
  );
}
