import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api, messageErreur, telecharger } from '../../api/client';
import type { Candidat, CandidatRequest } from '../../api/types';
import { CandidatForm } from '../../components/CandidatForm';
import { Chargement, Erreur, TetePage } from '../../components/ui';

export default function MonProfil() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [enregistre, setEnregistre] = useState(false);
  const profil = useQuery({
    queryKey: ['candidat', 'me'],
    queryFn: async () => (await api.get<Candidat>('/api/candidats/me')).data,
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 404) && count < 1,
  });
  const enregistrer = useMutation({
    mutationFn: async (req: CandidatRequest) => (await api.put<Candidat>('/api/candidats/me', req)).data,
    onSuccess: (c) => { qc.setQueryData(['candidat', 'me'], c); setEnregistre(true); },
  });
  const deposerCv = useMutation({
    mutationFn: (fichier: File) => {
      const data = new FormData();
      data.append('fichier', fichier);
      return api.post<Candidat>('/api/candidats/me/cv', data);
    },
    onSuccess: (res) => qc.setQueryData(['candidat', 'me'], res.data),
  });

  const pasDeProfil = axios.isAxiosError(profil.error) && profil.error.response?.status === 404;
  if (profil.isLoading) return <div className="page narrow"><Chargement /></div>;
  const c = profil.data;
  const initial = c ?? (pasDeProfil ? ({
    nomComplet: auth.user?.profile.name ?? '', email: auth.user?.profile.email, anneesExperience: 0, competences: [], experiences: [], cvDisponible: false,
  } as unknown as Candidat) : undefined);

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <TetePage titre={c ? 'Mon profil et mon CV' : 'Créer mon profil'}
        sous={c ? 'Un profil complet et à jour vous fait proposer les bons postes.' : 'Quelques minutes suffisent ; votre recruteur s’occupe du reste.'} />
      {enregistre && <div className="alert info">Profil enregistré.</div>}
      {(enregistrer.error || deposerCv.error) && <Erreur message={messageErreur(enregistrer.error ?? deposerCv.error)} />}

      {c && (
        <section className="card row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Mon CV</h2>
            <div className="muted">{c.cvDisponible ? c.cvNomFichier : 'Aucun CV déposé. Formats acceptés : PDF, Word (10 Mo maximum).'}</div>
          </div>
          <div className="actions">
            {c.cvDisponible && <button className="btn" onClick={() => telecharger('/api/candidats/me/cv', c.cvNomFichier ?? 'cv')}>Télécharger</button>}
            <label className="btn primary">
              {c.cvDisponible ? 'Remplacer' : 'Déposer mon CV'}
              <input type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => e.target.files?.[0] && deposerCv.mutate(e.target.files[0])} />
            </label>
          </div>
        </section>
      )}

      {initial && (
        <CandidatForm key={c?.id ?? 'nouveau'} initial={initial} avecConsentement libelleBouton={c ? 'Enregistrer' : 'Créer mon profil'}
          enCours={enregistrer.isPending} onSubmit={(req) => enregistrer.mutate(req)} />
      )}

      {c && (
        <section className="card stack">
          <h2>Mes données personnelles</h2>
          <p className="muted" style={{ margin: 0 }}>Consentements, téléchargement de vos données et suppression du compte.</p>
          <div><Link className="btn" to="/candidat/donnees">Gérer mes données</Link></div>
        </section>
      )}
    </div>
  );
}
