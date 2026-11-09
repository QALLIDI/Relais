import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, messageErreur } from '../../api/client';
import type { Entreprise, Mission, MissionRequest } from '../../api/types';
import { Annuler, Fenetre } from '../../components/Fenetre';
import { Erreur } from '../../components/ui';

/** Création rapide d'une mission : trois informations suffisent ; la fiche complète se remplit ensuite. */
export default function ModaleMission({ onFermer }: { onFermer: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const entreprises = useQuery({ queryKey: ['entreprises'], queryFn: async () => (await api.get<Entreprise[]>('/api/entreprises')).data });
  const [f, setF] = useState({ entrepriseId: '', intitule: '', dateLimite: '', nbPostes: '1' });
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const creer = useMutation({
    mutationFn: async () => {
      const body: MissionRequest = {
        entrepriseId: f.entrepriseId,
        intitule: f.intitule.trim(),
        nbPostes: Number(f.nbPostes) || 1,
        dateLimite: f.dateLimite || undefined,
        typeContrat: 'CDI',
        teletravail: 'Hybride',
        priorite: 'Normale',
        competencesRequises: [],
        competencesSouhaitees: [],
        statut: 'BROUILLON',
      };
      return (await api.post<Mission>('/api/missions', body)).data;
    },
    onSuccess: (m) => {
      void qc.invalidateQueries({ queryKey: ['missions'] });
      onFermer();
      navigate(`/recruteur/missions/${m.id}`);
    },
  });

  const pret = !!f.entrepriseId && !!f.intitule.trim();
  const soumettre = (e: FormEvent) => { e.preventDefault(); if (pret) creer.mutate(); };
  const modifie = Object.entries(f).some(([k, v]) => (k === 'nbPostes' ? v !== '1' : !!v));

  return (
    <Fenetre titre="Nouvelle mission" sousTitre="Trois informations suffisent pour démarrer. Vous compléterez la fiche de poste ensuite."
      onFermer={onFermer} modifie={modifie}
      pied={<>
        <Link className="lien-action gauche" to="/recruteur/missions/nouvelle">Remplir la fiche complète</Link>
        <Annuler onClick={onFermer} />
        <button type="submit" form="mission-rapide" className="btn primary" disabled={!pret || creer.isPending}>Créer la mission</button>
      </>}>
      {creer.error && <Erreur message={messageErreur(creer.error)} />}
      <form id="mission-rapide" className="stack" style={{ gap: 14 }} onSubmit={soumettre}>
        <label className="field">Client
          <select required value={f.entrepriseId} onChange={maj('entrepriseId')}>
            <option value="">Choisir une entreprise…</option>
            {entreprises.data?.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
          </select>
        </label>
        <label className="field">Intitulé du poste<input required value={f.intitule} onChange={maj('intitule')} placeholder="Ex. : Développeur Java senior" /></label>
        <div className="form-grid" style={{ gap: 12 }}>
          <label className="field">Shortlist attendue le<input type="date" value={f.dateLimite} onChange={maj('dateLimite')} /></label>
          <label className="field">Postes à pourvoir<input type="number" min={1} value={f.nbPostes} onChange={maj('nbPostes')} /></label>
        </div>
        <div className="encadre">La mission s’ouvre en brouillon : le client la voit dès que vous la validez depuis le pipeline.</div>
      </form>
    </Fenetre>
  );
}
