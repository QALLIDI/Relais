import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from 'react-oidc-context';
import { api, messageErreur, telecharger } from '../../api/client';
import { dateFr } from '../../api/format';
import type { Candidat, CandidatRequest } from '../../api/types';
import { CandidatForm } from '../../components/CandidatForm';
import { Chargement, Erreur, Modal } from '../../components/ui';

export default function MonProfil() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const auth = useAuth();
  const [supprimer, setSupprimer] = useState(false);
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
  const effacer = useMutation({
    mutationFn: () => api.delete('/api/candidats/me'),
    onSuccess: () => void auth.signoutRedirect(),
  });

  const pasDeProfil = axios.isAxiosError(profil.error) && profil.error.response?.status === 404;
  if (profil.isLoading) return <main className="page narrow"><Chargement /></main>;
  const c = profil.data;
  const initial = c ?? (pasDeProfil ? ({
    nomComplet: auth.user?.profile.name ?? '', email: auth.user?.profile.email, anneesExperience: 0, competences: [], experiences: [], cvDisponible: false,
  } as unknown as Candidat) : undefined);

  return (
    <main className="page" style={{ maxWidth: 960 }}>
      <header className="header">
        <h1 style={{ fontSize: 34 }}>{c ? 'Mon profil et mon CV' : 'Créer mon profil'}</h1>
        {c && <button className="btn" onClick={() => navigate('/candidat')}>Retour à l'accueil</button>}
      </header>
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
          <p className="muted" style={{ margin: 0 }}>
            Consentement donné le {dateFr(c.consentementLe)}. Vous pouvez supprimer votre profil : il sera anonymisé et votre CV effacé.
          </p>
          <div><button className="btn danger" onClick={() => setSupprimer(true)}>Supprimer mon profil</button></div>
        </section>
      )}

      {supprimer && (
        <Modal titre="Supprimer votre profil ?" onClose={() => setSupprimer(false)}>
          <p className="muted" style={{ margin: 0 }}>Votre profil sera anonymisé, votre CV effacé, et vous serez déconnecté. Cette action est définitive.</p>
          {effacer.error && <Erreur message={messageErreur(effacer.error)} />}
          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setSupprimer(false)}>Annuler</button>
            <button className="btn danger" disabled={effacer.isPending} onClick={() => effacer.mutate()}>Supprimer définitivement</button>
          </div>
        </Modal>
      )}
    </main>
  );
}
