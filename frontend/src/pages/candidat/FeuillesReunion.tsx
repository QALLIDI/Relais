import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur, telecharger } from '../../api/client';
import { fmtHeure } from '../../api/reunions';
import type { Creneau, Reunion } from '../../api/types';
import { Annuler, Fenetre } from '../../components/Fenetre';
import { Erreur } from '../../components/ui';

const jour = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
export const libelleCreneau = (c: Pick<Creneau, 'debut' | 'fin'>) => `${jour.format(new Date(c.debut)).replace(/^./, (x) => x.toUpperCase())} · ${fmtHeure(c.debut)} – ${fmtHeure(c.fin)}`;
const lieu = (r: Reunion) => (r.type === 'PRESENTIEL' ? `sur site${r.lieu ? `, ${r.lieu}` : ''}` : r.typeLibelle.toLowerCase());

/** Feuille « Confirmer l'entretien ? » (maquette « Feuille · confirmer l'entretien »). */
export function FeuilleConfirmation({ r, creneau, onFermer, onFait }: { r: Reunion; creneau: Creneau; onFermer: () => void; onFait: () => void }) {
  const qc = useQueryClient();
  const [agenda, setAgenda] = useState(true);
  const confirmer = useMutation({
    mutationFn: () => api.post(`/api/reunions/${r.id}/confirmation`, { creneauId: creneau.id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reunions'] });
      if (agenda) void telecharger(`/api/reunions/${r.id}/invitation.ics`, 'invitation.ics');
      onFait();
    },
  });
  return (
    <Fenetre type="sheet" largeur={480} titre="Confirmer l'entretien ?" sousTitre={`${libelleCreneau(creneau)} · ${lieu(r)}`} onFermer={onFermer}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={confirmer.isPending} onClick={() => confirmer.mutate()}>Confirmer ma présence</button></>}>
      <div className="encadre">
        {r.type === 'PRESENTIEL' ? "L'adresse et le nom de votre interlocuteur vous sont envoyés par e-mail." : 'Le lien de la visio vous est envoyé par e-mail.'} Un rappel arrive la veille.
      </div>
      <label className="check"><input type="checkbox" checked={agenda} onChange={(e) => setAgenda(e.target.checked)} />Ajouter à mon agenda (fichier .ics)</label>
      {confirmer.error && <Erreur message={messageErreur(confirmer.error)} />}
    </Fenetre>
  );
}

/** Feuille « Choisir un autre créneau » : un des créneaux proposés, ou « aucun ne me convient » avec un message. */
export function FeuilleCreneau({ r, onFermer, onChoisi, onFait }: { r: Reunion; onFermer: () => void; onChoisi: (c: Creneau) => void; onFait: () => void }) {
  const qc = useQueryClient();
  const [choix, setChoix] = useState<string>(r.statut === 'PROPOSEE' ? r.creneaux[0]?.id ?? 'aucun' : 'aucun');
  const [message, setMessage] = useState('');
  const creneaux = r.statut === 'PROPOSEE' ? r.creneaux : [];
  const reporter = useMutation({
    mutationFn: () => api.post(`/api/reunions/${r.id}/report`, { motif: message.trim() || 'Aucun des créneaux proposés ne me convient.' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['reunions'] }); onFait(); },
  });
  const valider = () => {
    const c = creneaux.find((x) => x.id === choix);
    if (c) onChoisi(c);
    else reporter.mutate();
  };
  return (
    <Fenetre type="sheet" largeur={480} titre={creneaux.length ? 'Choisir un autre créneau' : 'Changer de créneau'}
      sousTitre={[r.nature === 'ENTRETIEN_CLIENT' ? r.entrepriseNom : null, r.missionIntitule].filter(Boolean).join(' · ')} onFermer={onFermer} modifie={!!message}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={reporter.isPending} onClick={valider}>
        {choix === 'aucun' ? 'Demander d’autres créneaux' : 'Proposer ce créneau'}</button></>}>
      <div role="radiogroup" aria-label="Créneaux" className="stack" style={{ gap: 8 }}>
        {creneaux.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={choix === c.id} className="option-creneau" onClick={() => setChoix(c.id)}>
            <b>{jour.format(new Date(c.debut)).replace(/^./, (x) => x.toUpperCase())}</b><span>{fmtHeure(c.debut)} – {fmtHeure(c.fin)}</span>
          </button>
        ))}
        <button type="button" role="radio" aria-checked={choix === 'aucun'} className="option-creneau" onClick={() => setChoix('aucun')}>
          <b>{creneaux.length ? 'Aucun ne me convient' : 'Je ne peux plus venir'}</b><span>votre recruteur vous propose d'autres créneaux</span>
        </button>
      </div>
      {choix === 'aucun' && (
        <label className="field">Message au recruteur (facultatif)
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. : je suis disponible plutôt le matin." />
        </label>
      )}
      {reporter.error && <Erreur message={messageErreur(reporter.error)} />}
    </Fenetre>
  );
}
