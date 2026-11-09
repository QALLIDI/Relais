import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur } from '../../api/client';
import { ilYa, initiales } from '../../api/format';
import type { Entreprise } from '../../api/types';
import { Annuler, Fenetre } from '../../components/Fenetre';
import { Erreur } from '../../components/ui';

export interface DemandeRattachement {
  id: string;
  nom: string;
  email: string;
  telephone?: string;
  raisonSociale?: string;
  createdAt: string;
  keycloakUserId: string;
}

export function useDemandesRattachement() {
  return useQuery({
    queryKey: ['demandes-rattachement'],
    queryFn: async () => (await api.get<DemandeRattachement[]>('/api/entreprises/demandes-rattachement')).data,
    refetchInterval: 60_000,
  });
}

const normaliser = (s?: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** Comptes entreprise inscrits en ligne, en attente d'accès à leur espace (bloc de la page Entreprises). */
export function DemandesRattachement() {
  const qc = useQueryClient();
  const demandes = useDemandesRattachement();
  const [choisie, setChoisie] = useState<DemandeRattachement | null>(null);
  const [aRefuser, setARefuser] = useState<DemandeRattachement | null>(null);
  const [message, setMessage] = useState('');
  const refuser = useMutation({
    mutationFn: (d: DemandeRattachement) => api.post(`/api/entreprises/demandes-rattachement/${d.id}/refus`),
    onSuccess: (_, d) => { setARefuser(null); setMessage(`Demande de ${d.nom} refusée.`); void qc.invalidateQueries({ queryKey: ['demandes-rattachement'] }); },
  });
  const liste = demandes.data ?? [];
  if (!demandes.data || (liste.length === 0 && !message)) return null;

  return (
    <section className="bloc demandes" aria-labelledby="demandes">
      <div className="bloc-tete">
        <h2 id="demandes">Demandes d'accès à l'espace entreprise</h2>
        {liste.length > 0 && <span className="etat-carte attente">{liste.length} en attente</span>}
      </div>
      <div className="bloc-corps">
        {message && <div className="alert info" role="status" style={{ marginBottom: 10 }}>{message}</div>}
        {refuser.error && <Erreur message={messageErreur(refuser.error)} />}
        {liste.map((d) => (
          <div key={d.id} className="membre">
            <span className="mono-av grand" aria-hidden="true">{initiales(d.nom)}</span>
            <span className="txt">
              <b>{d.nom}{d.raisonSociale ? <span className="muted"> · {d.raisonSociale}</span> : null}</b>
              <span>{[d.email, d.telephone, `inscrit ${ilYa(d.createdAt)}`].filter(Boolean).join(' · ')}</span>
            </span>
            <button type="button" className="btn small" onClick={() => setARefuser(d)}>Refuser</button>
            <button type="button" className="btn small primary" onClick={() => setChoisie(d)}>Rattacher</button>
          </div>
        ))}
      </div>
      {choisie && (
        <ModaleRattachement d={choisie} onFermer={() => setChoisie(null)}
          onFait={(e) => { setChoisie(null); setMessage(`${choisie.nom} a maintenant accès à l'espace ${e.raisonSociale}. Un e-mail le prévient.`); }} />
      )}
      {aRefuser && (
        <Fenetre titre={`Refuser la demande de ${aRefuser.nom} ?`} largeur={460} onFermer={() => setARefuser(null)}
          sousTitre="Le compte reste sans accès à un espace entreprise. Le contact est prévenu par e-mail."
          pied={<><Annuler onClick={() => setARefuser(null)} /><button type="button" className="btn danger" disabled={refuser.isPending} onClick={() => refuser.mutate(aRefuser)}>Refuser</button></>}>
          <p className="muted small" style={{ margin: 0 }}>{aRefuser.email}{aRefuser.raisonSociale ? ` · ${aRefuser.raisonSociale}` : ''}</p>
        </Fenetre>
      )}
    </section>
  );
}

/**
 * Rattacher un compte : entreprise existante (proposée si la raison sociale correspond) ou nouvelle
 * entreprise créée avec la raison sociale déclarée. Trois appels, dans cet ordre : création éventuelle
 * de l'entreprise, entreprise renseignée sur le compte (compte-service), puis clôture de la demande.
 */
function ModaleRattachement({ d, onFermer, onFait }: { d: DemandeRattachement; onFermer: () => void; onFait: (e: Entreprise) => void }) {
  const qc = useQueryClient();
  const entreprises = useQuery({ queryKey: ['entreprises'], queryFn: async () => (await api.get<Entreprise[]>('/api/entreprises')).data });
  const proche = entreprises.data?.find((e) => d.raisonSociale && normaliser(e.raisonSociale) === normaliser(d.raisonSociale));
  const [choix, setChoix] = useState<string | null>(null);
  const valeur = choix ?? (proche ? proche.id : 'nouvelle');
  const [raison, setRaison] = useState(d.raisonSociale ?? '');

  const rattacher = useMutation({
    mutationFn: async () => {
      let entrepriseId = valeur;
      if (valeur === 'nouvelle') {
        entrepriseId = (await api.post<Entreprise>('/api/entreprises', { raisonSociale: raison.trim(), contacts: [] })).data.id;
      }
      await api.put(`/api/comptes/${d.keycloakUserId}/entreprise`, { entrepriseId });
      return (await api.post<Entreprise>(`/api/entreprises/demandes-rattachement/${d.id}/acceptation`, { entrepriseId })).data;
    },
    onSuccess: (e) => {
      void qc.invalidateQueries({ queryKey: ['demandes-rattachement'] });
      void qc.invalidateQueries({ queryKey: ['entreprises'] });
      onFait(e);
    },
  });

  return (
    <Fenetre titre={`Rattacher ${d.nom}`} sousTitre={`${d.email}${d.raisonSociale ? ` · a déclaré « ${d.raisonSociale} »` : ''}`} largeur={520} onFermer={onFermer}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={rattacher.isPending || (valeur === 'nouvelle' && !raison.trim())} onClick={() => rattacher.mutate()}>Donner l'accès</button></>}>
      <div className="field">Entreprise
        <div className="stack" style={{ gap: 6 }} role="radiogroup" aria-label="Entreprise">
          {proche && (
            <button type="button" role="radio" aria-checked={valeur === proche.id} className="option-creneau" onClick={() => setChoix(proche.id)}>
              <b>{proche.raisonSociale}</b><span>même raison sociale · {proche.contacts.length} contact(s)</span>
            </button>
          )}
          <button type="button" role="radio" aria-checked={valeur === 'nouvelle'} className="option-creneau" onClick={() => setChoix('nouvelle')}>
            <b>Nouvelle entreprise</b><span>créée avec ce compte comme contact</span>
          </button>
          <button type="button" role="radio" aria-checked={valeur !== 'nouvelle' && valeur !== proche?.id} className="option-creneau"
            onClick={() => setChoix(entreprises.data?.find((e) => e.id !== proche?.id)?.id ?? 'nouvelle')}>
            <b>Autre entreprise existante</b><span>choisir dans la liste</span>
          </button>
        </div>
      </div>
      {valeur === 'nouvelle' && <label className="field">Raison sociale<input value={raison} onChange={(e) => setRaison(e.target.value)} /></label>}
      {valeur !== 'nouvelle' && valeur !== proche?.id && (
        <label className="field">Entreprise existante
          <select value={valeur} onChange={(e) => setChoix(e.target.value)}>
            {entreprises.data?.map((e) => <option key={e.id} value={e.id}>{e.raisonSociale}</option>)}
          </select>
        </label>
      )}
      <div className="encadre">Le compte devient un contact de l'entreprise et voit ses recrutements, shortlists et factures. Un e-mail « Votre espace est ouvert » lui est envoyé.</div>
      {rattacher.error && <Erreur message={messageErreur(rattacher.error)} />}
    </Fenetre>
  );
}
