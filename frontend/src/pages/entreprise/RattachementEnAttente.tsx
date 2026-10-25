import { useAuth } from 'react-oidc-context';
import { Icone } from '../../components/ui';

/** Compte entreprise créé par l'inscription, pas encore rattaché à une société par le recruteur. */
export default function RattachementEnAttente() {
  const auth = useAuth();
  const prenom = auth.user?.profile.given_name ?? '';
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
          <button className="btn" type="button" onClick={() => auth.signoutRedirect()} style={{ alignSelf: 'flex-start' }}>
            <Icone nom="sortie" taille={16} /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
