export type StatutMission = 'EN_VALIDATION' | 'BROUILLON' | 'OUVERTE' | 'EN_PAUSE' | 'POURVUE' | 'ANNULEE';

export interface Contact {
  id?: string;
  nom: string;
  fonction?: string;
  email: string;
  telephone?: string;
}

export interface Entreprise {
  id: string;
  raisonSociale: string;
  ice?: string;
  secteur?: string;
  ville?: string;
  taille?: string;
  tauxHonoraires?: number;
  modeleTarif?: string;
  acompte?: number;
  contacts: Contact[];
  missionsOuvertes: number;
}

export interface Mission {
  id: string;
  entrepriseId: string;
  entrepriseNom: string;
  entrepriseSecteur?: string;
  contactEmail?: string;
  tauxHonoraires?: number;
  intitule: string;
  description?: string;
  typeContrat?: string;
  ville?: string;
  teletravail?: string;
  nbPostes?: number;
  experienceMin?: number;
  salaireMin?: number;
  salaireMax?: number;
  dateLimite?: string;
  priorite?: string;
  statut: StatutMission;
  competencesRequises: string[];
  competencesSouhaitees: string[];
  createdAt: string;
  confidentiel?: boolean;
  motifAnnulation?: string;
}

export interface MissionRequest {
  entrepriseId?: string;
  intitule: string;
  description?: string;
  typeContrat?: string;
  ville?: string;
  teletravail?: string;
  nbPostes?: number;
  experienceMin?: number;
  salaireMin?: number;
  salaireMax?: number;
  dateLimite?: string;
  priorite?: string;
  competencesRequises: string[];
  competencesSouhaitees: string[];
  statut?: StatutMission;
  confidentiel?: boolean;
}

export interface MissionStats {
  parStatut: Record<StatutMission, number>;
  competencesDemandees: { competence: string; missions: number }[];
  entreprisesClientes: number;
}

export type Disponibilite = 'IMMEDIATE' | 'UN_MOIS' | 'TROIS_MOIS' | 'NON_DISPONIBLE';
export type Niveau = 'JUNIOR' | 'CONFIRME' | 'SENIOR';

export interface Experience {
  periode?: string;
  poste?: string;
  employeur?: string;
  description?: string;
}

export interface Candidat {
  id: string;
  nomComplet: string;
  email?: string;
  telephone?: string;
  titre?: string;
  anneesExperience: number;
  niveau?: Niveau;
  niveauLibelle?: string;
  secteur?: string;
  ville?: string;
  mobilite?: string;
  disponibilite?: Disponibilite;
  disponibiliteLibelle?: string;
  pretentionSalaire?: number;
  langues?: string;
  source?: string;
  competences: string[];
  experiences: Experience[];
  consentementLe?: string;
  cvDisponible: boolean;
  cvNomFichier?: string;
  createdAt: string;
  consentementVivier?: boolean;
  consentementActualites?: boolean;
}

export interface CandidatResume {
  id: string;
  nomComplet: string;
  titre?: string;
  anneesExperience: number;
  niveau?: Niveau;
  ville?: string;
  secteur?: string;
  disponibilite?: Disponibilite;
  disponibiliteLibelle?: string;
  pretentionSalaire?: number;
  competences: string[];
  email?: string;
}

export interface CandidatRequest {
  nomComplet: string;
  email?: string;
  telephone?: string;
  titre?: string;
  anneesExperience: number;
  secteur?: string;
  ville?: string;
  mobilite?: string;
  disponibilite?: Disponibilite;
  pretentionSalaire?: number;
  langues?: string;
  source?: string;
  competences: string[];
  experiences: Experience[];
  consentement?: boolean;
}

export interface Groupe {
  cle: string;
  libelle: string;
  nombre: number;
  candidats: CandidatResume[];
}

export interface Note {
  id: string;
  auteur?: string;
  texte: string;
  createdAt: string;
}

export interface VivierStats {
  total: number;
  ajoutesCeMois: number;
  parSource: Record<string, number>;
  parNiveau: Record<string, number>;
  parDisponibilite: Record<string, number>;
}

export type Etape =
  | 'SOURCE'
  | 'QUALIFIE'
  | 'ENTRETIEN_RECRUTEUR'
  | 'PRESENTE'
  | 'ENTRETIEN_CLIENT'
  | 'OFFRE'
  | 'PLACE'
  | 'REFUSE'
  | 'RETIRE';

export type AvisClient = 'RETENU' | 'A_RENCONTRER' | 'REFUSE';

export interface Candidature {
  id: string;
  missionId: string;
  missionIntitule: string;
  entrepriseId: string;
  entrepriseNom: string;
  candidatId: string;
  candidatNom: string;
  candidatEmail?: string;
  candidatTitre?: string;
  candidatExperience: number;
  candidatVille?: string;
  competences: string[];
  candidatDisponibilite?: string;
  candidatPretention?: number;
  etape: Etape;
  etapeLibelle: string;
  score: number;
  motifSortie?: string;
  noteGlobale?: number;
  synthese?: string;
  avisClient?: AvisClient;
  commentaireClient?: string;
  presenteLe?: string;
  updatedAt: string;
  evaluationEntretien?: EvaluationEntretien;
  scoreTest?: number;
  referencesDemandees?: number;
  referencesRecues?: number;
}

/** Grille du client après l'entretien, recopiée sur la candidature par selection-service. */
export interface EvaluationEntretien {
  technique: number;
  communication: number;
  motivation: number;
  adequationEquipe: number;
  decision: string;
}

export interface Pipeline {
  missionId: string;
  colonnes: { etape: Etape; libelle: string; candidatures: Candidature[] }[];
  sorties: Candidature[];
}

export interface Suggestion {
  candidatId: string;
  nomComplet: string;
  titre?: string;
  anneesExperience: number;
  ville?: string;
  competences: string[];
  disponibilite?: string;
  score: number;
}

export interface ProfilPresente {
  candidatureId: string;
  missionId: string;
  missionIntitule: string;
  candidatNom: string;
  candidatTitre?: string;
  candidatExperience: number;
  candidatVille?: string;
  competences: string[];
  candidatDisponibilite?: string;
  candidatPretention?: number;
  noteGlobale?: number;
  synthese?: string;
  etape: Etape;
  etapeLibelle: string;
  avisClient?: AvisClient;
  commentaireClient?: string;
  presenteLe?: string;
  scoreTest?: number;
  referencesRecues?: number;
}

export interface MaCandidature {
  id: string;
  missionIntitule: string;
  entreprise: string;
  etape: Etape;
  etapeLibelle: string;
  etapeNumero: number;
  etapesTotal: number;
  updatedAt: string;
}

/* Réunions (agenda-service) */
export type NatureReunion = 'PREQUALIFICATION' | 'ENTRETIEN_RECRUTEUR' | 'ENTRETIEN_CLIENT';
export type TypeReunion = 'VISIO' | 'PRESENTIEL' | 'TELEPHONE';
export type StatutReunion = 'A_PLANIFIER' | 'PROPOSEE' | 'CONFIRMEE' | 'REPORTEE' | 'ANNULEE' | 'TERMINEE';
export type DecisionEntretien = 'RETENIR' | 'SECOND_ENTRETIEN' | 'NE_PAS_RETENIR';

export interface Creneau {
  id: string;
  debut: string;
  fin: string;
  choisi: boolean;
}

export interface ParticipantReunion {
  nom?: string;
  email?: string;
  role: 'CANDIDAT' | 'CLIENT' | 'RECRUTEUR';
  reponse: 'EN_ATTENTE' | 'ACCEPTE' | 'DECLINE';
  facultatif: boolean;
}

export interface EvaluationReunion {
  technique: number;
  communication: number;
  motivation: number;
  adequationEquipe: number;
  moyenne: number;
  decision: DecisionEntretien;
  commentaire?: string;
  auteur?: string;
  createdAt: string;
}

export interface Reunion {
  id: string;
  candidatureId?: string;
  missionId?: string;
  missionIntitule?: string;
  entrepriseId?: string;
  entrepriseNom?: string;
  candidatNom?: string;
  nature: NatureReunion;
  natureLibelle: string;
  type: TypeReunion;
  typeLibelle: string;
  dureeMinutes: number;
  statut: StatutReunion;
  lieu?: string;
  lienVisio?: string;
  debut?: string;
  fin?: string;
  motif?: string;
  compteRendu?: string;
  creneaux: Creneau[];
  participants: ParticipantReunion[];
  evaluation?: EvaluationReunion;
  createdAt: string;
  updatedAt: string;
}

export interface PlageDisponibilite {
  id?: string;
  jour: number;
  heureDebut: string;
  heureFin: string;
}

export interface MissionResume {
  missionId: string;
  sources: number;
  presentes: number;
  enCours: number;
  aEvaluer: number;
  places: number;
}

export interface SelectionStats {
  entonnoir: { etape: Etape; libelle: string; nombre: number }[];
  placements: number;
  tauxPresentesPlaces: number;
  delaiMoyenPlacementJours?: number;
  delaiMoyenShortlistJours?: number;
  entretiensAVenir: number;
  retoursEnAttente: number;
  derniersRetours: Candidature[];
}

export interface Facture {
  id: string;
  numero?: string;
  entrepriseId: string;
  entrepriseNom: string;
  objet: string;
  placementId?: string;
  montantHt: number;
  montantTva: number;
  montantTtc: number;
  statut: 'BROUILLON' | 'EMISE' | 'PAYEE' | 'EN_RETARD';
  dateEmission?: string;
  echeance?: string;
  datePaiement?: string;
}

export interface Placement {
  id: string;
  candidatureId: string;
  entrepriseNom: string;
  missionIntitule: string;
  candidatNom: string;
  salaireAnnuel: number;
  tauxHonoraires: number;
  dateEmbauche: string;
  finGarantie: string;
}

export interface FacturationStats {
  factureCeMois: number;
  encaisseCeMois: number;
  enAttente: number;
  enRetard: number;
  placements: number;
  encaisseParMois: { mois: string; montant: number }[];
  parClient: { entreprise: string; placements: number; montantHt: number }[];
}

export interface Notification {
  id: string;
  titre: string;
  message?: string;
  type?: string;
  lu: boolean;
  createdAt: string;
}
