import { useMutation, useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { listeDepuisTexte } from '../../api/format';
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

  return (
    <>
      <h1>Nouvelle mission</h1>
      <form className="stack" onSubmit={soumettre('OUVERTE')} style={{ maxWidth: 960 }}>
        <section className="card stack">
          <h2>1. Client</h2>
          <label className="field">Entreprise
            <select required value={f.entrepriseId} onChange={maj('entrepriseId')}>
              <option value="">Choisir une entreprise…</option>
              {entreprises.data?.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
            </select>
          </label>
        </section>
        <section className="card stack">
          <h2>2. Poste</h2>
          <label className="field">Intitulé<input required value={f.intitule} onChange={maj('intitule')} placeholder="Développeur Java senior" /></label>
          <div className="form-grid">
            <label className="field">Contrat
              <select value={f.typeContrat} onChange={maj('typeContrat')}><option>CDI</option><option>CDD</option><option>Freelance</option></select>
            </label>
            <label className="field">Ville<input value={f.ville} onChange={maj('ville')} /></label>
            <label className="field">Télétravail
              <select value={f.teletravail} onChange={maj('teletravail')}><option>Hybride</option><option>Sur site</option><option>Total</option></select>
            </label>
            <label className="field">Postes<input type="number" min={1} value={f.nbPostes} onChange={maj('nbPostes')} /></label>
          </div>
          <label className="field">Description<textarea rows={3} value={f.description} onChange={maj('description')} /></label>
        </section>
        <section className="card stack">
          <h2>3. Profil recherché</h2>
          <label className="field">Compétences requises (séparées par des virgules)<input value={f.requises} onChange={maj('requises')} placeholder="Java, Spring Boot, React" /></label>
          <div className="form-grid">
            <label className="field">Compétences souhaitées<input value={f.souhaitees} onChange={maj('souhaitees')} /></label>
            <label className="field">Expérience minimum (années)<input type="number" min={0} value={f.experienceMin} onChange={maj('experienceMin')} /></label>
          </div>
        </section>
        <section className="card stack">
          <h2>4. Conditions</h2>
          <div className="form-grid">
            <label className="field">Salaire min. (MAD/an)<input type="number" value={f.salaireMin} onChange={maj('salaireMin')} /></label>
            <label className="field">Salaire max. (MAD/an)<input type="number" value={f.salaireMax} onChange={maj('salaireMax')} /></label>
            <label className="field">Date limite<input type="date" value={f.dateLimite} onChange={maj('dateLimite')} /></label>
            <label className="field">Priorité
              <select value={f.priorite} onChange={maj('priorite')}><option>Haute</option><option>Normale</option></select>
            </label>
          </div>
          <p className="muted small">Les honoraires sont repris des conditions tarifaires du client.</p>
        </section>
        {creer.error && <Erreur message={messageErreur(creer.error)} />}
        <div className="actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn" disabled={creer.isPending} onClick={() => soumettre('BROUILLON')()}>Enregistrer en brouillon</button>
          <button type="submit" className="btn primary" disabled={creer.isPending}>Ouvrir la mission</button>
        </div>
      </form>
    </>
  );
}
