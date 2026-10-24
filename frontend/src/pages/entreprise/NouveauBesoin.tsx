import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { api, messageErreur } from '../../api/client';
import { libelleStatutMission, listeDepuisTexte } from '../../api/format';
import type { Mission } from '../../api/types';
import { Erreur, Pill, toneMission } from '../../components/ui';

export default function NouveauBesoin() {
  const qc = useQueryClient();
  const vide = { intitule: '', description: '', competences: '', typeContrat: 'CDI', ville: '', nbPostes: '1', experienceMin: '', salaireMin: '', salaireMax: '', dateLimite: '' };
  const [f, setF] = useState(vide);
  const [envoye, setEnvoye] = useState(false);
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const envoyer = useMutation({
    mutationFn: () => api.post('/api/missions', {
      intitule: f.intitule, description: f.description, competencesRequises: listeDepuisTexte(f.competences), competencesSouhaitees: [],
      typeContrat: f.typeContrat, ville: f.ville || undefined, nbPostes: Number(f.nbPostes) || 1,
      experienceMin: f.experienceMin ? Number(f.experienceMin) : undefined,
      salaireMin: f.salaireMin ? Number(f.salaireMin) : undefined, salaireMax: f.salaireMax ? Number(f.salaireMax) : undefined,
      dateLimite: f.dateLimite || undefined,
    }),
    onSuccess: () => { setF(vide); setEnvoye(true); void qc.invalidateQueries({ queryKey: ['missions'] }); },
  });
  const soumettre = (e: FormEvent) => { e.preventDefault(); setEnvoye(false); envoyer.mutate(); };

  return (
    <main className="page">
      <div className="row">
        <form className="card stack grow-main" onSubmit={soumettre}>
          <div>
            <h1 style={{ fontSize: 26 }}>Exprimer un nouveau besoin</h1>
            <p className="muted" style={{ margin: '6px 0 0' }}>Décrivez le poste ; votre recruteur le valide avec vous avant de lancer la recherche.</p>
          </div>
          {envoye && <div className="alert info">Besoin envoyé. Votre recruteur revient vers vous pour le valider.</div>}
          <label className="field">Intitulé du poste<input required value={f.intitule} onChange={maj('intitule')} /></label>
          <label className="field">Missions principales<textarea rows={4} value={f.description} onChange={maj('description')} /></label>
          <label className="field">Compétences indispensables (séparées par des virgules)<input value={f.competences} onChange={maj('competences')} /></label>
          <div className="form-grid">
            <label className="field">Contrat<select value={f.typeContrat} onChange={maj('typeContrat')}><option>CDI</option><option>CDD</option><option>Freelance</option></select></label>
            <label className="field">Lieu<input value={f.ville} onChange={maj('ville')} /></label>
            <label className="field">Postes<input type="number" min={1} value={f.nbPostes} onChange={maj('nbPostes')} /></label>
            <label className="field">Expérience minimum (années)<input type="number" min={0} value={f.experienceMin} onChange={maj('experienceMin')} /></label>
            <label className="field">Budget min. (MAD brut/an)<input type="number" value={f.salaireMin} onChange={maj('salaireMin')} /></label>
            <label className="field">Budget max. (MAD brut/an)<input type="number" value={f.salaireMax} onChange={maj('salaireMax')} /></label>
            <label className="field">Prise de poste souhaitée<input type="date" value={f.dateLimite} onChange={maj('dateLimite')} /></label>
          </div>
          {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn primary" disabled={envoyer.isPending}>Envoyer à mon recruteur</button>
          </div>
        </form>
        <aside className="card grow-side" aria-label="Mes besoins">
          <h2 style={{ marginBottom: 8 }}>Mes besoins</h2>
          {missions.data?.map((m) => (
            <div key={m.id} className="list-item"><span>{m.intitule}</span><Pill tone={toneMission(m.statut)}>{libelleStatutMission[m.statut]}</Pill></div>
          ))}
        </aside>
      </div>
    </main>
  );
}
