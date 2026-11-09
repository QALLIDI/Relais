import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { lireSession } from '../../auth/auth';
import { Icone } from '../../components/ui';

/** Compte entreprise créé par l'inscription, pas encore rattaché à une société par le recruteur. */
export default function RattachementEnAttente() {
  const auth = useAuth();
  const prenom = auth.user?.profile.given_name ?? '';
  const [verif, setVerif] = useState(false);
  const [pasEncore, setPasEncore] = useState(false);
  return (
    <div className="app-frame">
      <div className="centre">
        <div className="card" style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="pill info" style={{ alignSelf: 'flex-start' }}>En attente de rattachement</span>
          <h2 style={{ fontSize: 28, fontWeight: 400 }}>Bienvenue{prenom ? ` ${prenom}` : ''}, votre compte est prêt.</h2>
          <p className="muted" style={{ margin: 0 }}>
            Votre recruteur va rattacher votre compte à votre société. Une fois votre espace entreprise ouvert,
            reconnectez-vous pour exprimer vos besoins et suivre vos recrutements.
          </p>
          <div className="actions">
            {/* Le jeton renouvelé reprend l'entreprise dès que le recruteur a rattaché le compte. */}
            <button className="btn primary" type="button" disabled={verif} onClick={() => {
              setVerif(true);
              void auth.signinSilent().then((u) => { if (u && lireSession(u.access_token).entrepriseId) window.location.reload(); else setPasEncore(true); })
                .catch(() => void auth.signinRedirect()).finally(() => setVerif(false));
            }}>Vérifier mon accès</button>
            <button className="btn" type="button" onClick={() => auth.signoutRedirect()}>
              <Icone nom="sortie" taille={16} /> Se déconnecter
            </button>
          </div>
          {pasEncore && <p className="muted small" role="status" style={{ margin: 0 }}>Pas encore : votre recruteur n'a pas encore ouvert votre espace.</p>}
        </div>
      </div>
    </div>
  );
}
