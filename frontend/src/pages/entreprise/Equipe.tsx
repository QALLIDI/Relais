import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { api, messageErreur } from '../../api/client';
import { initiales } from '../../api/format';
import type { Entreprise } from '../../api/types';
import { useSession } from '../../auth/useSession';
import { Annuler, Fenetre } from '../../components/Fenetre';
import { Chargement, Erreur, Icone, TetePage, Vide } from '../../components/ui';

export interface Membre {
  id: string;
  prenom?: string;
  nom?: string;
  email?: string;
  fonction?: string;
  actif: boolean;
  moi: boolean;
  /** Administrateur : gère l'équipe, exprime les besoins, accepte les propositions, voit les factures. */
  admin: boolean;
}

const nomComplet = (m: Membre) => [m.prenom, m.nom].filter(Boolean).join(' ') || m.email || 'Membre';

/** Équipe de l'entreprise : les collègues qui suivent les recrutements (maquette « Équipe »). */
export default function Equipe() {
  const qc = useQueryClient();
  const { admin: jeSuisAdmin } = useSession();
  const [inviter, setInviter] = useState<string | null>(null);
  const [aRetirer, setARetirer] = useState<Membre | null>(null);
  const [message, setMessage] = useState('');
  const entreprise = useQuery({ queryKey: ['entreprise', 'me'], queryFn: async () => (await api.get<Entreprise>('/api/entreprises/me')).data });
  const membres = useQuery({ queryKey: ['equipe'], queryFn: async () => (await api.get<Membre[]>('/api/comptes/equipe')).data });
  const rafraichir = () => qc.invalidateQueries({ queryKey: ['equipe'] });

  const relancer = useMutation({
    mutationFn: (m: Membre) => api.post(`/api/comptes/equipe/${m.id}/relance`),
    onSuccess: (_, m) => setMessage(`Invitation renvoyée à ${m.email}.`),
  });
  const retirer = useMutation({
    mutationFn: (m: Membre) => api.delete(`/api/comptes/equipe/${m.id}`),
    onSuccess: (_, m) => { setARetirer(null); setMessage(`${nomComplet(m)} n'a plus accès à l'espace.`); void rafraichir(); },
  });
  const changerRole = useMutation({
    mutationFn: ({ m, admin }: { m: Membre; admin: boolean }) => api.put<Membre>(`/api/comptes/equipe/${m.id}/role`, { admin }),
    onSuccess: (_, { m, admin }) => {
      setMessage(`${nomComplet(m)} est maintenant ${admin ? 'administrateur' : 'membre'}. Le changement s'applique à sa prochaine connexion.`);
      void rafraichir();
    },
  });
  const [saisie, setSaisie] = useState('');
  const ouvrir = (e: FormEvent) => { e.preventDefault(); setInviter(saisie.trim()); };
  const liste = membres.data ?? [];
  const nbAdmins = liste.filter((m) => m.admin).length;
  const erreur = relancer.error ?? retirer.error ?? changerRole.error;

  return (
    <>
      <TetePage titre="Votre équipe" sous={`${entreprise.data?.raisonSociale ?? 'Votre entreprise'} · ${liste.length} membre(s), dont ${nbAdmins} administrateur(s).`}>
        {jeSuisAdmin && <button type="button" className="btn primary" onClick={() => setInviter('')}><Icone nom="plus" taille={16} />Inviter un membre</button>}
      </TetePage>
      {message && <div className="alert info" role="status">{message}</div>}
      {erreur && <Erreur message={messageErreur(erreur)} />}
      {!jeSuisAdmin && liste.length > 0 && (
        <div className="alert info" role="note">Seuls les administrateurs peuvent inviter ou retirer des membres et changer les rôles.</div>
      )}

      <div className="tableau-bord">
        <section className="bloc" aria-labelledby="membres">
          <div className="bloc-tete"><h2 id="membres">Membres</h2></div>
          <div className="bloc-corps">
            {membres.isLoading && <Chargement />}
            {membres.error && <Erreur message={messageErreur(membres.error)} />}
            {membres.data && liste.length === 0 && <Vide>Aucun membre pour l'instant.</Vide>}
            {liste.map((m) => (
              <div key={m.id} className="membre">
                <span className={`mono-av grand ${m.actif ? '' : 'attente'}`} aria-hidden="true">{initiales(nomComplet(m))}</span>
                <span className="txt">
                  <b>{nomComplet(m)}{m.moi && <span className="muted"> · vous</span>}</b>
                  <span>{[m.email, m.fonction].filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`eq-role ${m.admin ? 'admin' : ''}`}>{m.admin ? 'Administrateur' : 'Membre'}</span>
                {m.actif ? <span className="oui-non oui">Actif</span> : <span className="etat-carte attente">Invitation envoyée</span>}
                {jeSuisAdmin && !m.moi && (
                  <details className="carte-menu">
                    <summary aria-label={`Actions pour ${nomComplet(m)}`}>⋯</summary>
                    <div className="menu" onClick={(e) => (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open')}>
                      {!m.actif && <button type="button" disabled={relancer.isPending} onClick={() => relancer.mutate(m)}>Renvoyer l'invitation</button>}
                      {m.admin
                        ? <button type="button" disabled={changerRole.isPending || nbAdmins <= 1} title={nbAdmins <= 1 ? 'Votre entreprise doit garder au moins un administrateur' : undefined}
                            onClick={() => changerRole.mutate({ m, admin: false })}>Retirer le rôle administrateur</button>
                        : <button type="button" disabled={changerRole.isPending} onClick={() => changerRole.mutate({ m, admin: true })}>Nommer administrateur</button>}
                      <button type="button" className="danger" onClick={() => setARetirer(m)}>Retirer de l'équipe</button>
                    </div>
                  </details>
                )}
              </div>
            ))}
            {jeSuisAdmin && (
              <form className="invitation-rapide" onSubmit={ouvrir}>
                <label className="sr-only" htmlFor="email-rapide">E-mail du collègue à inviter</label>
                <input id="email-rapide" type="email" placeholder="E-mail du collègue à inviter" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
                <button type="submit" className="btn primary">Inviter</button>
              </form>
            )}
          </div>
        </section>

        <div className="colonne-droite">
          <section className="bloc reperes" aria-labelledby="comment">
            <div className="bloc-tete"><h2 id="comment">Qui peut faire quoi</h2></div>
            <div className="bloc-corps eq-droits">
              <div>
                <b>Membre</b>
                <span>Suit les recrutements, donne son avis sur les profils, participe aux entretiens et écrit au recruteur.</span>
              </div>
              <div>
                <b>Administrateur</b>
                <span>En plus : exprime les nouveaux besoins, accepte les propositions commerciales, voit les factures et gère l'équipe.</span>
              </div>
              <p>Un collègue invité reçoit un e-mail pour choisir son mot de passe (lien valable 7 jours). Votre entreprise garde toujours au moins un administrateur.</p>
            </div>
          </section>
        </div>
      </div>

      {inviter !== null && (
        <ModaleInvitation emailInitial={inviter} entreprise={entreprise.data?.raisonSociale} onFermer={() => setInviter(null)}
          onFait={(m) => { setInviter(null); setSaisie(''); setMessage(`Invitation envoyée à ${m.email}.`); void rafraichir(); }} />
      )}
      {aRetirer && (
        <Fenetre titre={`Retirer ${nomComplet(aRetirer)} ?`} largeur={460} onFermer={() => setARetirer(null)}
          sousTitre="Son accès à l'espace est supprimé. Ses avis déjà donnés restent visibles."
          pied={<><Annuler onClick={() => setARetirer(null)} /><button type="button" className="btn danger" disabled={retirer.isPending} onClick={() => retirer.mutate(aRetirer)}>Retirer</button></>}>
          <p className="muted small" style={{ margin: 0 }}>Vous pourrez l'inviter à nouveau plus tard.</p>
        </Fenetre>
      )}
    </>
  );
}

/** Modale « Inviter un membre » : il reçoit un e-mail pour créer son accès à l'espace entreprise. */
function ModaleInvitation({ emailInitial, entreprise, onFermer, onFait }: {
  emailInitial: string; entreprise?: string; onFermer: () => void; onFait: (m: Membre) => void;
}) {
  const [f, setF] = useState({ prenom: '', nom: '', email: emailInitial, fonction: '' });
  const [admin, setAdmin] = useState(false);
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const envoyer = useMutation({
    mutationFn: async () => (await api.post<Membre>('/api/comptes/equipe', { ...f, email: f.email.trim(), admin })).data,
    onSuccess: onFait,
  });
  const valide = /^\S+@\S+\.\S+$/.test(f.email.trim());
  return (
    <Fenetre titre="Inviter un membre" sousTitre={`Il reçoit un e-mail pour créer son accès à l'espace ${entreprise ?? 'de votre entreprise'}.`} largeur={520}
      onFermer={onFermer} modifie={!!(f.prenom || f.nom || f.fonction || f.email !== emailInitial)}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!valide || envoyer.isPending} onClick={() => envoyer.mutate()}>Envoyer l'invitation</button></>}>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="field">Prénom<input value={f.prenom} onChange={maj('prenom')} autoComplete="off" /></label>
        <label className="field">Nom<input value={f.nom} onChange={maj('nom')} autoComplete="off" /></label>
      </div>
      <label className="field">E-mail professionnel<input type="email" required value={f.email} onChange={maj('email')} placeholder="prenom.nom@entreprise.ma" autoComplete="off" /></label>
      <label className="field">Fonction (facultatif)<input value={f.fonction} onChange={maj('fonction')} placeholder="Ex. : responsable RH, manager de l'équipe" /></label>
      <fieldset className="eq-choix">
        <legend>Rôle</legend>
        <label>
          <input type="radio" name="role" checked={!admin} onChange={() => setAdmin(false)} />
          <span><b>Membre</b><small>Suit les recrutements, évalue les profils et les entretiens.</small></span>
        </label>
        <label>
          <input type="radio" name="role" checked={admin} onChange={() => setAdmin(true)} />
          <span><b>Administrateur</b><small>Peut aussi exprimer des besoins, accepter les propositions, voir les factures et gérer l'équipe.</small></span>
        </label>
      </fieldset>
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
    </Fenetre>
  );
}
