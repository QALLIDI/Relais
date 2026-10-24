import { type FormEvent, useState } from 'react';
import { listeDepuisTexte } from '../api/format';
import type { Candidat, CandidatRequest, Disponibilite } from '../api/types';

/** Formulaire de profil partagé entre le recruteur (ajout au vivier) et le candidat (son profil). */
export function CandidatForm({
  initial,
  avecConsentement,
  avecSource,
  libelleBouton,
  enCours,
  onSubmit,
}: {
  initial?: Candidat;
  avecConsentement?: boolean;
  avecSource?: boolean;
  libelleBouton: string;
  enCours?: boolean;
  onSubmit: (req: CandidatRequest) => void;
}) {
  const [f, setF] = useState({
    nomComplet: initial?.nomComplet ?? '',
    email: initial?.email ?? '',
    telephone: initial?.telephone ?? '',
    titre: initial?.titre ?? '',
    anneesExperience: String(initial?.anneesExperience ?? ''),
    secteur: initial?.secteur ?? '',
    ville: initial?.ville ?? '',
    mobilite: initial?.mobilite ?? '',
    disponibilite: (initial?.disponibilite ?? 'UN_MOIS') as Disponibilite,
    pretentionSalaire: initial?.pretentionSalaire != null ? String(initial.pretentionSalaire) : '',
    langues: initial?.langues ?? '',
    source: initial?.source ?? 'LinkedIn',
    competences: initial?.competences.join(', ') ?? '',
    consentement: !!initial?.consentementLe,
  });
  const [experiences, setExperiences] = useState(initial?.experiences ?? []);
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      nomComplet: f.nomComplet,
      email: f.email || undefined,
      telephone: f.telephone || undefined,
      titre: f.titre || undefined,
      anneesExperience: Number(f.anneesExperience) || 0,
      secteur: f.secteur || undefined,
      ville: f.ville || undefined,
      mobilite: f.mobilite || undefined,
      disponibilite: f.disponibilite,
      pretentionSalaire: f.pretentionSalaire ? Number(f.pretentionSalaire) : undefined,
      langues: f.langues || undefined,
      source: avecSource ? f.source : undefined,
      competences: listeDepuisTexte(f.competences),
      experiences: experiences.filter((x) => x.poste || x.employeur),
      consentement: avecConsentement ? f.consentement : true,
    });
  };

  return (
    <form className="stack" onSubmit={soumettre}>
      <section className="card stack">
        <h2>Identité</h2>
        <div className="form-grid">
          <label className="field">Nom complet<input required value={f.nomComplet} onChange={maj('nomComplet')} /></label>
          <label className="field">E-mail<input type="email" value={f.email} onChange={maj('email')} /></label>
          <label className="field">Téléphone<input value={f.telephone} onChange={maj('telephone')} /></label>
        </div>
      </section>
      <section className="card stack">
        <h2>Profil</h2>
        <div className="form-grid">
          <label className="field">Titre<input value={f.titre} onChange={maj('titre')} placeholder="Développeur Java" /></label>
          <label className="field">Années d'expérience<input type="number" min={0} required value={f.anneesExperience} onChange={maj('anneesExperience')} /></label>
          <label className="field">Secteur<input value={f.secteur} onChange={maj('secteur')} placeholder="Banque et assurance" /></label>
          <label className="field">Ville<input value={f.ville} onChange={maj('ville')} /></label>
          <label className="field">Mobilité<input value={f.mobilite} onChange={maj('mobilite')} placeholder="Casablanca, Rabat" /></label>
          <label className="field">Disponibilité
            <select value={f.disponibilite} onChange={maj('disponibilite')}>
              <option value="IMMEDIATE">Immédiate</option>
              <option value="UN_MOIS">Sous 1 mois</option>
              <option value="TROIS_MOIS">Sous 3 mois</option>
              <option value="NON_DISPONIBLE">Plus en recherche</option>
            </select>
          </label>
          <label className="field">Prétentions (MAD brut/an)<input type="number" value={f.pretentionSalaire} onChange={maj('pretentionSalaire')} /></label>
          <label className="field">Langues<input value={f.langues} onChange={maj('langues')} placeholder="Français, anglais" /></label>
          {avecSource && (
            <label className="field">Source
              <select value={f.source} onChange={maj('source')}>
                <option>LinkedIn</option><option>Cooptation</option><option>Candidature spontanée</option><option>Job board</option><option>Vivier existant</option>
              </select>
            </label>
          )}
        </div>
        <label className="field">Compétences (séparées par des virgules)<input value={f.competences} onChange={maj('competences')} placeholder="Java, Spring Boot, PostgreSQL" /></label>
      </section>
      <section className="card stack">
        <div className="header">
          <h2>Expériences</h2>
          <button type="button" className="btn small" onClick={() => setExperiences([...experiences, { periode: '', poste: '', employeur: '', description: '' }])}>Ajouter une expérience</button>
        </div>
        {experiences.length === 0 && <p className="muted">Aucune expérience saisie.</p>}
        {experiences.map((x, i) => (
          <div key={i} className="form-grid" style={{ borderTop: i ? '1px solid var(--line)' : undefined, paddingTop: i ? 12 : 0 }}>
            <label className="field">Période<input value={x.periode ?? ''} onChange={(e) => setExperiences(experiences.map((y, j) => (j === i ? { ...y, periode: e.target.value } : y)))} placeholder="2021 – aujourd'hui" /></label>
            <label className="field">Poste<input value={x.poste ?? ''} onChange={(e) => setExperiences(experiences.map((y, j) => (j === i ? { ...y, poste: e.target.value } : y)))} /></label>
            <label className="field">Employeur<input value={x.employeur ?? ''} onChange={(e) => setExperiences(experiences.map((y, j) => (j === i ? { ...y, employeur: e.target.value } : y)))} /></label>
            <label className="field">Description<input value={x.description ?? ''} onChange={(e) => setExperiences(experiences.map((y, j) => (j === i ? { ...y, description: e.target.value } : y)))} /></label>
          </div>
        ))}
      </section>
      {avecConsentement && (
        <label className="check card">
          <input type="checkbox" required checked={f.consentement} onChange={(e) => setF({ ...f, consentement: e.target.checked })} />
          <span>J'accepte que le cabinet conserve mon profil et le présente à des entreprises. Je peux le supprimer à tout moment depuis mon espace.</span>
        </label>
      )}
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button type="submit" className="btn primary" disabled={enCours}>{libelleBouton}</button>
      </div>
    </form>
  );
}
