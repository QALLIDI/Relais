import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { TetePage } from '../../components/ui';
import type { Membre } from './Equipe';

const nom = (m: Membre) => [m.prenom, m.nom].filter(Boolean).join(' ') || m.email || 'un administrateur';

/** Page affichée à un membre qui ouvre une page réservée aux administrateurs (lien direct, e-mail…). */
export default function ReserveAdmin({ action }: { action: string }) {
  const equipe = useQuery({ queryKey: ['equipe'], queryFn: async () => (await api.get<Membre[]>('/api/comptes/equipe')).data });
  const admins = (equipe.data ?? []).filter((m) => m.admin);
  return (
    <>
      <TetePage titre="Réservé aux administrateurs" />
      <section className="bloc">
        <div className="bloc-corps" style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 620 }}>
          <p style={{ margin: 0 }}>Seuls les administrateurs de votre entreprise peuvent {action}.</p>
          {admins.length > 0 && (
            <p className="muted" style={{ margin: 0 }}>
              {admins.length === 1 ? 'Votre administrateur : ' : 'Vos administrateurs : '}
              {admins.map((a, i) => <span key={a.id}>{i > 0 && ', '}<b>{nom(a)}</b>{a.email && <> (<a href={`mailto:${a.email}`}>{a.email}</a>)</>}</span>)}.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/entreprise" className="btn">Retour à mes recrutements</Link>
            <Link to="/entreprise/equipe" className="btn">Voir l'équipe</Link>
          </div>
        </div>
      </section>
    </>
  );
}
