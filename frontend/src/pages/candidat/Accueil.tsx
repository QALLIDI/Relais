import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateHeureFr } from '../../api/format';
import type { Candidat, Entretien, MaCandidature } from '../../api/types';
import { Chargement, Erreur, Progression, Vide } from '../../components/ui';

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
  const qc = useQueryClient();
  const profil = useQuery({
    queryKey: ['candidat', 'me'],
    queryFn: async () => (await api.get<Candidat>('/api/candidats/me')).data,
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 404) && count < 1,
  });
  const candidatures = useQuery({ queryKey: ['candidatures', 'mes'], queryFn: async () => (await api.get<MaCandidature[]>('/api/candidatures/mes')).data });
  const entretiens = useQuery({ queryKey: ['entretiens'], queryFn: async () => (await api.get<Entretien[]>('/api/entretiens')).data });
  const confirmer = useMutation({
    mutationFn: ({ id, confirme }: { id: string; confirme: boolean }) => api.patch(`/api/entretiens/${id}/confirmation`, { confirme }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entretiens'] }),
  });

  const pasDeProfil = axios.isAxiosError(profil.error) && profil.error.response?.status === 404;
  if (profil.isLoading) return <main className="page narrow"><Chargement /></main>;
  if (pasDeProfil) {
    return (
      <main className="page narrow">
        <div className="card stack">
          <h1 style={{ fontSize: 24 }}>Bienvenue</h1>
          <p className="muted">Créez votre profil pour que le cabinet puisse vous proposer des postes qui vous correspondent.</p>
          <Link className="btn primary" to="/candidat/profil">Créer mon profil</Link>
        </div>
      </main>
    );
  }
  const c = profil.data;
  const comp = c ? completude(c) : null;
  const aConfirmer = entretiens.data?.filter((e) => e.statut === 'PROPOSE') ?? [];

  return (
    <main className="page narrow">
      <header>
        <div className="muted">Bonjour</div>
        <h1 style={{ fontSize: 24 }}>{c?.nomComplet}</h1>
      </header>
      {confirmer.error && <Erreur message={messageErreur(confirmer.error)} />}

      {comp && (
        <section className="card stack" style={{ gap: 10 }}>
          <div className="header"><b>Profil complété</b><b style={{ color: 'var(--teal)' }}>{comp.pct} %</b></div>
          <div className="barre" style={{ height: 8 }}><div style={{ width: `${comp.pct}%` }} /></div>
          {comp.manque && <div className="header small"><span className="muted">Ajoutez {comp.manque} pour finir.</span><Link to="/candidat/profil">Compléter</Link></div>}
        </section>
      )}

      {aConfirmer.map((e) => (
        <section key={e.id} className="card stack" style={{ background: 'var(--teal-soft)', border: 0 }}>
          <div className="small" style={{ fontWeight: 600, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Entretien à confirmer</div>
          <div style={{ fontWeight: 600 }}>{e.entrepriseNom} · {e.missionIntitule}</div>
          <div>{dateHeureFr(e.dateHeure)} · {e.lieu}</div>
          <div className="actions">
            <button className="btn primary" onClick={() => confirmer.mutate({ id: e.id, confirme: true })}>Confirmer</button>
            <button className="btn" onClick={() => confirmer.mutate({ id: e.id, confirme: false })}>Décliner</button>
          </div>
        </section>
      ))}

      <section className="card stack">
        <h2>Mes candidatures</h2>
        {candidatures.data?.length === 0 && <Vide>Aucune candidature en cours. Le cabinet vous contacte dès qu'un poste vous correspond.</Vide>}
        {candidatures.data?.map((x) => (
          <div key={x.id} className="stack" style={{ gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <div className="header"><b>{x.missionIntitule}</b><span className="muted small">{x.entreprise}</span></div>
            {x.etapeNumero > 0 ? <Progression etape={x.etapeNumero} total={x.etapesTotal} /> : null}
            <div className="small" style={{ color: x.etapeNumero === 0 ? 'var(--muted)' : undefined }}>
              {x.etapeNumero > 0 ? `${x.etapeLibelle} · étape ${x.etapeNumero} sur ${x.etapesTotal}` : 'Candidature close'}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
