import { useMutation, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { listeDepuisTexte, mad } from '../../api/format';
import type { Entreprise, Mission, MissionRequest } from '../../api/types';
import { Erreur } from '../../components/ui';

export default function NouvelleMission() {
  const navigate = useNavigate();
  const entreprises = useQuery({ queryKey: ['entreprises'], queryFn: async () => (await api.get<Entreprise[]>('/api/entreprises')).data });
  const [f, setF] = useState({
    entrepriseId: '', intitule: '', description: '', typeContrat: 'CDI', ville: '', teletravail: 'Hybride', nbPostes: '1',
    experienceMin: '', salaireMin: '', salaireMax: '', dateLimite: '', priorite: 'Normale', requises: '', souhaitees: '',
  });
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const creer = useMutation({
    mutationFn: async (statut: 'OUVERTE' | 'BROUILLON') => {
      const body: MissionRequest = {
        entrepriseId: f.entrepriseId,
        intitule: f.intitule,
        description: f.description || undefined,
        typeContrat: f.typeContrat,
        ville: f.ville || undefined,
        teletravail: f.teletravail,
        nbPostes: Number(f.nbPostes) || 1,
        experienceMin: f.experienceMin ? Number(f.experienceMin) : undefined,
        salaireMin: f.salaireMin ? Number(f.salaireMin) : undefined,
        salaireMax: f.salaireMax ? Number(f.salaireMax) : undefined,
        dateLimite: f.dateLimite || undefined,
        priorite: f.priorite,
        competencesRequises: listeDepuisTexte(f.requises),
        competencesSouhaitees: listeDepuisTexte(f.souhaitees),
        statut,
      };
      return (await api.post<Mission>('/api/missions', body)).data;
    },
    onSuccess: (m) => navigate(`/recruteur/missions/${m.id}`),
  });

  const soumettre = (statut: 'OUVERTE' | 'BROUILLON') => (e?: FormEvent) => {
    e?.preventDefault();
    creer.mutate(statut);
  };

  const client = entreprises.data?.find((e) => e.id === f.entrepriseId);
  const requises = listeDepuisTexte(f.requises);

  return (
    <>
      <section className="header">
        <div>
          <div className="crumbs"><Link to="/recruteur/missions">Missions</Link><span>/</span><span>Nouvelle</span></div>
          <h1>Nouvelle mission</h1>
        </div>
        <div className="actions">
          <button type="button" className="btn" disabled={creer.isPending} onClick={() => soumettre('BROUILLON')()}>Enregistrer en brouillon</button>
          <button type="submit" form="nouvelle-mission" className="btn accent" disabled={creer.isPending}>Ouvrir la mission</button>
        </div>
      </section>
      {creer.error && <Erreur message={messageErreur(creer.error)} />}
      <form id="nouvelle-mission" className="grid-2" onSubmit={soumettre('OUVERTE')} style={{ alignItems: 'start' }}>
        <section className="card stack">
          <h2><span className="step">1</span>Client</h2>
          <label className="field">Entreprise
            <select required value={f.entrepriseId} onChange={maj('entrepriseId')}>
              <option value="">Choisir une entreprise…</option>
              {entreprises.data?.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
            </select>
          </label>
          <div className="box small" style={{ color: 'var(--ink-2)' }}>
            {client
              ? `Honoraires repris du contrat : ${client.tauxHonoraires ?? '—'} % du salaire annuel${client.acompte ? `, acompte de ${mad(client.acompte)}` : ''}.`
              : 'Les honoraires sont repris des conditions tarifaires du client.'}
          </div>
        </section>
        <section className="card stack">
          <h2><span className="step">2</span>Poste</h2>
          <label className="field">Intitulé<input required value={f.intitule} onChange={maj('intitule')} placeholder="Développeur Java senior" /></label>
          <div className="form-grid">
            <label className="field">Contrat
              <select value={f.typeContrat} onChange={maj('typeContrat')}><option>CDI</option><option>CDD</option><option>Freelance</option></select>
            </label>
            <label className="field">Ville<input value={f.ville} onChange={maj('ville')} /></label>
            <label className="field">Postes<input type="number" min={1} value={f.nbPostes} onChange={maj('nbPostes')} /></label>
          </div>
          <div className="field">Télétravail
            <div className="tabs" role="group" aria-label="Télétravail" style={{ alignSelf: 'flex-start' }}>
              {['Sur site', 'Hybride', 'Total'].map((t) => (
                <button key={t} type="button" className={`tab ${f.teletravail === t ? 'on' : ''}`} aria-pressed={f.teletravail === t} onClick={() => setF({ ...f, teletravail: t })}>{t}</button>
              ))}
            </div>
          </div>
          <label className="field">Description<textarea rows={3} value={f.description} onChange={maj('description')} /></label>
        </section>
        <section className="card stack">
          <h2><span className="step">3</span>Profil recherché</h2>
          <label className="field">Compétences requises (séparées par des virgules)<input value={f.requises} onChange={maj('requises')} placeholder="Java, Spring Boot, React" /></label>
          {requises.length > 0 && <div className="chips">{requises.map((c) => <span key={c} className="chip dark">{c}</span>)}</div>}
          <div className="form-grid">
            <label className="field">Souhaitées<input value={f.souhaitees} onChange={maj('souhaitees')} placeholder="Kafka" /></label>
            <label className="field">Expérience min. (années)<input type="number" min={0} value={f.experienceMin} onChange={maj('experienceMin')} /></label>
          </div>
        </section>
        <section className="card stack">
          <h2><span className="step">4</span>Conditions</h2>
          <div className="form-grid">
            <label className="field">Salaire min. (MAD/an)<input type="number" value={f.salaireMin} onChange={maj('salaireMin')} /></label>
            <label className="field">Salaire max. (MAD/an)<input type="number" value={f.salaireMax} onChange={maj('salaireMax')} /></label>
            <label className="field">Date limite<input type="date" value={f.dateLimite} onChange={maj('dateLimite')} /></label>
            <label className="field">Priorité
              <select value={f.priorite} onChange={maj('priorite')}><option>Haute</option><option>Normale</option></select>
            </label>
          </div>
        </section>
      </form>
    </>
  );
}
