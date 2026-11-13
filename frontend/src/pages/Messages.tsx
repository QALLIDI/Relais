import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import { ilYa, initiales } from '../api/format';
import { useFils } from '../api/messagerie';
import type { Mission } from '../api/types';
import { versFenetre } from '../components/Fenetre';
import { Chargement, Icone, TetePage, Vide } from '../components/ui';

/** Boîte de réception commune au recruteur et à l'entreprise : un fil par mission. */
export default function Messages({ espace }: { espace: 'recruteur' | 'entreprise' }) {
  const fils = useFils();
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const [nouveau, setNouveau] = useState('');

  const liste = fils.data ?? [];
  const nonLus = liste.reduce((s, f) => s + f.nonLus, 0);
  // Missions sans fil, pour démarrer une conversation.
  const avecFil = new Set(liste.map((f) => f.missionId));
  const sansFil = (missions.data ?? []).filter((m) => !avecFil.has(m.id) && m.statut !== 'ANNULEE' && m.statut !== 'BROUILLON');
  const maintenant = new Date();

  return (
    <>
      <TetePage titre="Messages" sous={espace === 'recruteur' ? 'Vos échanges avec les clients, mission par mission.' : 'Vos échanges avec votre recruteur, recrutement par recrutement.'}>
        {sansFil.length > 0 && (
          <form className="msg-nouveau" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="msg-mission" className="sr-only">Mission</label>
            <select id="msg-mission" value={nouveau} onChange={(e) => setNouveau(e.target.value)}>
              <option value="">Nouveau message sur…</option>
              {sansFil.map((m) => <option key={m.id} value={m.id}>{m.intitule}{espace === 'recruteur' ? ` · ${m.entrepriseNom}` : ''}</option>)}
            </select>
            {nouveau
              ? <Link className="btn primary" to={versFenetre('echanges', { mission: nouveau })} onClick={() => setNouveau('')}><Icone nom="plus" taille={16} />Écrire</Link>
              : <button type="button" className="btn primary" disabled><Icone nom="plus" taille={16} />Écrire</button>}
          </form>
        )}
      </TetePage>

      <section className="bloc" aria-labelledby="msg-fils">
        <div className="bloc-tete">
          <h2 id="msg-fils">{liste.length} conversation{liste.length > 1 ? 's' : ''}</h2>
          {nonLus > 0 && <span className="pill info">{nonLus} non lu{nonLus > 1 ? 's' : ''}</span>}
        </div>
        {fils.isLoading ? <div className="bloc-corps"><Chargement /></div>
          : liste.length === 0 ? (
            <div className="bloc-corps">
              <Vide>{espace === 'recruteur'
                ? 'Aucun échange pour l’instant. Écrivez à un client depuis une mission ou le menu ci-dessus.'
                : 'Aucun échange pour l’instant. Une question sur un recrutement ? Choisissez-le ci-dessus pour écrire à votre recruteur.'}</Vide>
            </div>
          ) : (
            <ul className="msg-liste">
              {liste.map((f) => (
                <li key={f.missionId}>
                  <Link to={versFenetre('echanges', { mission: f.missionId })} className={f.nonLus > 0 ? 'non-lu' : ''}>
                    <span className="mono-av" aria-hidden="true">{initiales(espace === 'recruteur' ? f.entrepriseNom : f.missionIntitule)}</span>
                    <span className="txt">
                      <span className="ligne">
                        <b>{f.missionIntitule}</b>
                        <time dateTime={f.dernierLe}>{ilYa(f.dernierLe, maintenant)}</time>
                      </span>
                      {espace === 'recruteur' && <span className="qui">{f.entrepriseNom}</span>}
                      <span className="extrait">{f.dernierDeMoi ? 'Vous : ' : `${f.dernierAuteur} : `}{f.dernierExtrait}</span>
                    </span>
                    {f.nonLus > 0 && <span className="msg-compte" aria-label={`${f.nonLus} non lu(s)`}>{f.nonLus}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </section>
    </>
  );
}
