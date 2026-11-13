import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { api, messageErreur } from '../api/client';
import { initiales } from '../api/format';
import { LONGUEUR_MAX_MESSAGE, useFil } from '../api/messagerie';
import type { MessageMission, Mission } from '../api/types';
import { Fenetre } from '../components/Fenetre';
import { Chargement, Erreur, Icone, Vide } from '../components/ui';

const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function libelleJour(d: Date) {
  const aujourdHui = new Date();
  const hier = new Date(aujourdHui.getTime() - 86400000);
  if (d.toDateString() === aujourdHui.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === hier.toDateString()) return 'Hier';
  const t = jour.format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Messages regroupés par jour, dans l'ordre du fil. */
function parJour(messages: MessageMission[]) {
  const groupes: { cle: string; libelle: string; messages: MessageMission[] }[] = [];
  messages.forEach((m) => {
    const d = new Date(m.creeLe);
    const cle = d.toDateString();
    const dernier = groupes[groupes.length - 1];
    if (dernier?.cle === cle) dernier.messages.push(m);
    else groupes.push({ cle, libelle: libelleJour(d), messages: [m] });
  });
  return groupes;
}

/**
 * Panneau « Échanges » d'une mission : fil de messages entre le recruteur et l'entreprise.
 * Ouvert par l'URL (?fenetre=echanges&mission=…), depuis la page Messages, le pipeline, l'accueil client ou un e-mail.
 */
export default function PanneauEchanges({ missionId, espace, onFermer }: { missionId: string; espace: 'recruteur' | 'entreprise'; onFermer: () => void }) {
  const qc = useQueryClient();
  const mission = useQuery({ queryKey: ['missions', missionId], queryFn: async () => (await api.get<Mission>(`/api/missions/${missionId}`)).data });
  const fil = useFil(missionId);
  const [texte, setTexte] = useState('');
  const fin = useRef<HTMLDivElement>(null);

  const messages = fil.data ?? [];
  const dernierRecu = [...messages].reverse().find((m) => !m.deMoi)?.id;

  // Ouvrir le fil (puis chaque nouveau message reçu pendant qu'il est ouvert) le marque comme lu.
  useEffect(() => {
    if (!fil.isSuccess) return;
    api.post(`/api/missions/${missionId}/messages/lu`)
      .then(() => qc.invalidateQueries({ queryKey: ['messagerie'], refetchType: 'active', predicate: (q) => q.queryKey[1] !== 'fil' }))
      .catch(() => { /* sans conséquence : réessayé au prochain message */ });
  }, [missionId, fil.isSuccess, dernierRecu, qc]);

  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const envoyer = useMutation({
    mutationFn: async () => (await api.post<MessageMission>(`/api/missions/${missionId}/messages`, { contenu: texte.trim() })).data,
    onSuccess: (m) => {
      setTexte('');
      qc.setQueryData<MessageMission[]>(['messagerie', 'fil', missionId], (l) => [...(l ?? []), m]);
      qc.invalidateQueries({ queryKey: ['messagerie', 'fils'] });
    },
  });

  const vide = texte.trim().length === 0;
  const trop = texte.length > LONGUEUR_MAX_MESSAGE;
  const soumettre = (e?: FormEvent) => {
    e?.preventDefault();
    if (!vide && !trop && !envoyer.isPending) envoyer.mutate();
  };
  const touche = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) soumettre();
  };

  const m = mission.data;
  const avecQui = espace === 'recruteur' ? (m ? `Échanges avec ${m.entrepriseNom}` : 'Échanges') : 'Échanges avec votre recruteur';

  return (
    <Fenetre type="drawer" largeur={520} titre={m?.intitule ?? 'Échanges'} sousTitre={avecQui} onFermer={onFermer} modifie={!vide}
      pied={
        <form className="ech-saisie" onSubmit={soumettre}>
          <label htmlFor="ech-texte" className="sr-only">Votre message</label>
          <textarea id="ech-texte" rows={3} value={texte} onChange={(e) => setTexte(e.target.value)} onKeyDown={touche}
            placeholder={espace === 'recruteur' ? 'Écrire au client…' : 'Écrire à votre recruteur…'} aria-describedby="ech-aide" />
          <div className="ech-saisie-bas">
            <span id="ech-aide" className={trop ? 'ech-trop' : ''}>
              {trop ? `${texte.length - LONGUEUR_MAX_MESSAGE} caractère(s) de trop` : texte.length > LONGUEUR_MAX_MESSAGE - 300 ? `${LONGUEUR_MAX_MESSAGE - texte.length} caractères restants` : 'Ctrl + Entrée pour envoyer'}
            </span>
            <button type="submit" className="btn primary" disabled={vide || trop || envoyer.isPending}>
              <Icone nom="fleche" taille={16} />{envoyer.isPending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
          {envoyer.isError && <Erreur message={messageErreur(envoyer.error)} />}
        </form>
      }>
      {fil.isLoading && <Chargement />}
      {fil.isError && <Erreur message={messageErreur(fil.error)} />}
      {fil.isSuccess && messages.length === 0 && (
        <Vide>
          {espace === 'recruteur'
            ? 'Aucun échange pour cette mission. Votre message sera envoyé au client par e-mail.'
            : 'Une question sur ce recrutement ? Écrivez ici : votre recruteur est prévenu par e-mail.'}
        </Vide>
      )}
      <div className="ech-fil" aria-live="polite">
        {parJour(messages).map((g) => (
          <section key={g.cle} aria-label={g.libelle}>
            <h3 className="ech-jour"><span>{g.libelle}</span></h3>
            {g.messages.map((x, i) => {
              const suite = i > 0 && g.messages[i - 1].auteurNom === x.auteurNom && g.messages[i - 1].deMoi === x.deMoi;
              return (
                <article key={x.id} className={`ech-msg ${x.deMoi ? 'moi' : ''} ${suite ? 'suite' : ''}`}>
                  {!x.deMoi && !suite && <span className="mono-av" aria-hidden="true">{initiales(x.auteurNom)}</span>}
                  <div className="ech-bulle">
                    {!suite && (
                      <div className="ech-auteur">
                        <b>{x.deMoi ? 'Vous' : x.auteurNom}</b>
                        {!x.deMoi && x.auteurRole === 'RECRUTEUR' && espace === 'entreprise' && <span>· votre recruteur</span>}
                      </div>
                    )}
                    <p>{x.contenu}</p>
                    <time dateTime={x.creeLe}>{heure.format(new Date(x.creeLe))}</time>
                  </div>
                </article>
              );
            })}
          </section>
        ))}
        <div ref={fin} />
      </div>
    </Fenetre>
  );
}
