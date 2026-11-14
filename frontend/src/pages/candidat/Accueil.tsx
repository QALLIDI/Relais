import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { initiales } from '../../api/format';
import { plage, useReunions } from '../../api/reunions';
import type { Candidat, Creneau, MaCandidature, Reunion } from '../../api/types';
import { FeuilleConfirmation, FeuilleCreneau, libelleCreneau } from './FeuillesReunion';
import { Chargement, Progression, Vide } from '../../components/ui';

function completude(c: Candidat): { pct: number; manque?: string } {
  const champs: [boolean, string][] = [
    [!!c.titre, 'votre titre'],
    [c.competences.length > 0, 'vos compétences'],
    [!!c.ville, 'votre ville'],
    [c.experiences.length > 0, 'vos expériences'],
    [!!c.langues, 'vos langues'],
    [c.cvDisponible, 'votre CV'],
    [c.pretentionSalaire != null, 'vos prétentions'],
  ];
  const ok = champs.filter(([v]) => v).length;
  return { pct: Math.round((ok / champs.length) * 100), manque: champs.find(([v]) => !v)?.[1] };
}

export default function CandidatAccueil() {
  const profil = useQuery({
    queryKey: ['candidat', 'me'],
    queryFn: async () => (await api.get<Candidat>('/api/candidats/me')).data,
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 404) && count < 1,
  });
  const candidatures = useQuery({ queryKey: ['candidatures', 'mes'], queryFn: async () => (await api.get<MaCandidature[]>('/api/candidatures/mes')).data });
  const reunions = useReunions();
  const [feuille, setFeuille] = useState<{ type: 'confirmer'; r: Reunion; creneau: Creneau } | { type: 'creneau'; r: Reunion } | null>(null);

  const pasDeProfil = axios.isAxiosError(profil.error) && profil.error.response?.status === 404;
  if (profil.isLoading) return <div className="page narrow"><Chargement /></div>;
  if (pasDeProfil) {
    return (
      <div className="page narrow">
        <div className="card stack">
          <h1 style={{ fontSize: 34 }}>Bienvenue</h1>
          <p className="muted">Créez votre profil pour que le cabinet puisse vous proposer des postes qui vous correspondent.</p>
          <Link className="btn accent" to="/candidat/profil" style={{ alignSelf: 'flex-start' }}>Créer mon profil</Link>
        </div>
      </div>
    );
  }
  const c = profil.data;
  const comp = c ? completude(c) : null;
  const aConfirmer = reunions.data?.filter((r) => r.statut === 'PROPOSEE') ?? [];
  const confirmees = reunions.data?.filter((r) => r.statut === 'CONFIRMEE' && r.fin && new Date(r.fin) >= new Date()) ?? [];
  const arc = 2 * Math.PI * 16;

  return (
    <div className="page narrow">
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="muted">Bonjour</div>
          <h1 style={{ fontSize: 26 }}>{c?.nomComplet}</h1>
        </div>
        <span className="avatar lavande-av" style={{ width: 48, height: 48, flexBasis: 48 }} aria-hidden="true">
          {initiales(c?.nomComplet ?? '')}
        </span>
      </header>

      {comp && (
        <section className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 24 }}>
          <svg width="64" height="64" viewBox="0 0 42 42" role="img" aria-label={`Profil complété à ${comp.pct} %`}>
            <circle cx="21" cy="21" r="16" fill="none" stroke="var(--line)" strokeWidth="5" />
            <circle cx="21" cy="21" r="16" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(arc * comp.pct) / 100} ${arc}`} transform="rotate(-90 21 21)" />
            <text x="21" y="24.5" textAnchor="middle" fontSize="9" fill="var(--ink)">{comp.pct} %</text>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{comp.pct === 100 ? 'Profil complet' : comp.pct >= 70 ? 'Profil presque complet' : 'Profil à compléter'}</div>
            {comp.manque && <div className="muted small">Ajoutez {comp.manque} pour finir.</div>}
            {comp.manque && <Link to="/candidat/profil" className="small" style={{ display: 'inline-block', marginTop: 6, color: 'var(--accent-ink)', fontWeight: 600 }}>Compléter</Link>}
          </div>
        </section>
      )}

      {aConfirmer.map((r) => {
        const premier = r.creneaux[0];
        return (
          <section key={r.id} className="bloc reperes carte-entretien" aria-label={`Entretien à confirmer : ${r.missionIntitule}`}>
            <div className="ligne-entre">
              <span className="etat-carte">Entretien à confirmer</span>
              {premier && <span className="small muted">{libelleCreneau(premier).split(' · ')[0]}</span>}
            </div>
            <Link to={`/candidat/reunions/${r.id}`} className="titre-entretien">{r.nature === 'ENTRETIEN_CLIENT' && r.entrepriseNom ? <>{r.entrepriseNom}<br /></> : null}{r.missionIntitule}</Link>
            <span className="small muted">{premier ? `${libelleCreneau(premier).split(' · ')[1]} · ` : ''}{r.natureLibelle} · {r.type === 'PRESENTIEL' ? `sur site${r.lieu ? `, ${r.lieu}` : ''}` : r.typeLibelle.toLowerCase()}{r.creneaux.length > 1 ? ` · ${r.creneaux.length} créneaux proposés` : ''}</span>
            <div className="deux-boutons" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
              <button type="button" className="btn primary" disabled={!premier} onClick={() => premier && setFeuille({ type: 'confirmer', r, creneau: premier })}>Confirmer ce créneau</button>
              <button type="button" className="btn" onClick={() => setFeuille({ type: 'creneau', r })}>Autre créneau</button>
            </div>
          </section>
        );
      })}

      {confirmees.length > 0 && (
        <section className="card stack" style={{ borderRadius: 24, gap: 10 }}>
          <h2>Mes entretiens</h2>
          {confirmees.map((r) => (
            <Link key={r.id} to={`/candidat/reunions/${r.id}`} className="tile" style={{ textDecoration: 'none' }}>
              <span style={{ flex: '1 1 180px', minWidth: 0 }}><b style={{ fontWeight: 600 }}>{r.missionIntitule}</b>
                <span className="muted small" style={{ display: 'block' }}>{r.debut && r.fin ? plage(r.debut, r.fin) : ''} · {r.type === 'PRESENTIEL' ? r.lieu ?? 'sur site' : r.typeLibelle}</span></span>
              <span className="pill ok">Confirmé</span>
            </Link>
          ))}
        </section>
      )}

      <section className="card stack" style={{ borderRadius: 24, gap: 14 }}>
        <h2>Mes candidatures</h2>
        {candidatures.data?.length === 0 && <Vide>Aucune candidature en cours. Le cabinet vous contacte dès qu'un poste vous correspond.</Vide>}
        {candidatures.data?.map((x, i) => (
          <div key={x.id} className="stack" style={{ gap: 8, borderTop: i ? '1px solid var(--line)' : 0, paddingTop: i ? 14 : 0 }}>
            <div className="card-head" style={{ margin: 0 }}><b style={{ fontWeight: 600 }}>{x.missionIntitule}</b><span className="muted small">{x.entreprise}</span></div>
            {x.etapeNumero > 0 ? <Progression etape={x.etapeNumero} total={x.etapesTotal} enCours={x.etapeNumero < x.etapesTotal} /> : null}
            <div className="small" style={{ color: x.etapeNumero === 0 ? 'var(--muted)' : 'var(--ink-2)' }}>
              {x.etapeNumero > 0 ? `${x.etapeLibelle} · étape ${x.etapeNumero} sur ${x.etapesTotal}` : 'Candidature close'}
            </div>
          </div>
        ))}
      </section>
      {feuille?.type === 'confirmer' && <FeuilleConfirmation r={feuille.r} creneau={feuille.creneau} onFermer={() => setFeuille(null)} onFait={() => setFeuille(null)} />}
      {feuille?.type === 'creneau' && (
        <FeuilleCreneau r={feuille.r} onFermer={() => setFeuille(null)} onFait={() => setFeuille(null)}
          onChoisi={(creneau) => setFeuille({ type: 'confirmer', r: feuille.r, creneau })} />
      )}
    </div>
  );
}
