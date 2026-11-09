import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur } from '../api/client';
import { fmtJourLong, libelleDecision, useReunion } from '../api/reunions';
import type { DecisionEntretien, ProfilPresente } from '../api/types';
import { Annuler, Fenetre } from '../components/Fenetre';
import { Chargement, Erreur } from '../components/ui';

type Critere = 'technique' | 'communication' | 'motivation' | 'adequationEquipe';
const CRITERES: [Critere, string, string][] = [
  ['technique', 'Compétences techniques', 'Maîtrise des outils et des méthodes du poste'],
  ['communication', 'Communication', 'Clarté, écoute, échanges avec l’équipe'],
  ['motivation', 'Motivation', 'Intérêt pour le poste et l’entreprise'],
  ['adequationEquipe', 'Adéquation à l’équipe', 'Façon de travailler, valeurs'],
];
const DECISIONS: DecisionEntretien[] = ['RETENIR', 'SECOND_ENTRETIEN', 'NE_PAS_RETENIR'];

/** Modale « Évaluer l'entretien » : grille commune à tous les entretiens, ouverte depuis la liste des entretiens ou l'agenda. */
export default function ModaleEvaluation({ reunionId, onFermer }: { reunionId: string; onFermer: () => void }) {
  const qc = useQueryClient();
  const reunion = useReunion(reunionId);
  const r = reunion.data;
  const shortlist = useQuery({
    queryKey: ['shortlist', r?.missionId],
    queryFn: async () => (await api.get<ProfilPresente[]>(`/api/shortlists/mission/${r?.missionId}`)).data,
    enabled: !!r?.missionId,
  });
  const profil = shortlist.data?.find((p) => p.candidatureId === r?.candidatureId);
  const [notes, setNotes] = useState<Record<Critere, number>>({ technique: 0, communication: 0, motivation: 0, adequationEquipe: 0 });
  const [decision, setDecision] = useState<DecisionEntretien | null>(null);
  const [commentaire, setCommentaire] = useState('');

  const envoyer = useMutation({
    mutationFn: () => api.post(`/api/reunions/${reunionId}/evaluation`, { ...notes, decision, commentaire: commentaire || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reunions'] });
      void qc.invalidateQueries({ queryKey: ['shortlist'] });
      void qc.invalidateQueries({ queryKey: ['selection'] });
      onFermer();
    },
  });

  const donnees = Object.values(notes).filter((v) => v > 0);
  const moyenne = donnees.length ? (donnees.reduce((a, b) => a + b, 0) / donnees.length).toFixed(1).replace('.', ',') : '—';
  const complet = donnees.length === 4 && !!decision;
  const modifie = donnees.length > 0 || !!decision || !!commentaire;

  return (
    <Fenetre largeur={560} onFermer={onFermer} modifie={modifie}
      titre={r ? `Évaluer l’entretien avec ${r.candidatNom}` : 'Évaluer l’entretien'}
      sousTitre={r ? `${r.debut ? `Entretien du ${fmtJourLong(r.debut)} · ` : ''}${r.missionIntitule ?? ''} · grille commune à toute l’équipe` : undefined}
      pied={<>
        <Annuler onClick={onFermer} />
        <button type="button" className="btn primary" disabled={!complet || !!r?.evaluation || envoyer.isPending} onClick={() => envoyer.mutate()}>Envoyer mon avis</button>
      </>}>
      {reunion.isLoading && <Chargement />}
      {reunion.error && <Erreur message={messageErreur(reunion.error)} />}
      {r?.evaluation && <div className="encadre">Cet entretien a déjà été évalué ({libelleDecision[r.evaluation.decision].toLowerCase()}).</div>}
      {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
      {r && (
        <>
          <div className="row" style={{ gap: 8 }}>
            <span className="chip">Votre moyenne <b>{moyenne} / 5</b></span>
            <span className="chip">Note du recruteur <b>{profil?.noteGlobale ? `${profil.noteGlobale} / 5` : '—'}</b></span>
            <span className="chip">{r.typeLibelle} · {r.dureeMinutes} min</span>
          </div>
          {CRITERES.map(([k, nom, aide]) => (
            <div key={k} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div><div style={{ fontWeight: 500 }}>{nom}</div><div className="muted small">{aide}</div></div>
              <div className="choix" role="radiogroup" aria-label={nom}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={notes[k] === v} style={{ width: 34, padding: 0 }} onClick={() => setNotes({ ...notes, [k]: v })}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          <label className="field">Commentaire pour le recruteur
            <textarea rows={3} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
          </label>
          <div className="field">Votre décision
            <div className="decision" role="radiogroup" aria-label="Décision">
              {DECISIONS.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={decision === d} onClick={() => setDecision(d)}>{libelleDecision[d]}</button>
              ))}
            </div>
          </div>
          <div className="encadre">« Second entretien » prévient votre recruteur, qui vous propose de nouveaux créneaux. « Retenir » fait passer la candidature à l’offre ; la garantie de remplacement s’applique dès l’embauche.</div>
        </>
      )}
    </Fenetre>
  );
}
