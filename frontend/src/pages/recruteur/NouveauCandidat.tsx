import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api, messageErreur } from '../../api/client';
import type { Candidat, CandidatRequest } from '../../api/types';
import { CandidatForm } from '../../components/CandidatForm';
import { Erreur } from '../../components/ui';

export default function NouveauCandidat() {
  const navigate = useNavigate();
  const creer = useMutation({
    mutationFn: async (req: CandidatRequest) => (await api.post<Candidat>('/api/candidats', req)).data,
    onSuccess: (c) => navigate(`/recruteur/vivier/${c.id}`),
  });
  return (
    <>
      <h1>Ajouter un candidat</h1>
      <p className="muted">Vous pourrez déposer son CV depuis sa fiche une fois le profil créé.</p>
      {creer.error && <Erreur message={messageErreur(creer.error)} />}
      <div style={{ maxWidth: 960 }}>
        <CandidatForm avecSource libelleBouton="Créer le profil" enCours={creer.isPending} onSubmit={(req) => creer.mutate(req)} />
      </div>
    </>
  );
}
