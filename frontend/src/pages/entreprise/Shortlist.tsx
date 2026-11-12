import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateCourte, initiales, libelleAvis, mad } from '../../api/format';
import type { AvisClient, Mission, ProfilPresente } from '../../api/types';
import { Annuler, Fenetre } from '../../components/Fenetre';
import { Chargement, Erreur, Icone, Pill, Tags, TetePage, toneAvis, Vide } from '../../components/ui';
import { useFilAriane } from '../../components/Layouts';
import { versFenetre } from '../../components/Fenetre';

export default function Shortlist() {
  const { missionId = '' } = useParams();
  const qc = useQueryClient();
  const [commentaires, setCommentaires] = useState<Record<string, string>>({});
  const [aEcarter, setAEcarter] = useState<ProfilPresente | null>(null);
  const mission = useQuery({ queryKey: ['mission', missionId], queryFn: async () => (await api.get<Mission>(`/api/missions/${missionId}`)).data });
  const profils = useQuery({ queryKey: ['shortlist', missionId], queryFn: async () => (await api.get<ProfilPresente[]>(`/api/shortlists/mission/${missionId}`)).data });
  const avis = useMutation({
    mutationFn: ({ id, valeur, commentaire }: { id: string; valeur: AvisClient; commentaire?: string }) =>
      api.post(`/api/candidatures/${id}/avis`, { avis: valeur, commentaire: commentaire ?? (commentaires[id] || undefined) }),
    onSuccess: () => { setAEcarter(null); void qc.invalidateQueries({ queryKey: ['shortlist', missionId] }); void qc.invalidateQueries({ queryKey: ['selection'] }); },
  });

  const donnes = profils.data?.filter((p) => p.avisClient).length ?? 0;
  const total = profils.data?.length ?? 0;
  const premier = profils.data?.map((p) => p.presenteLe).filter(Boolean).sort()[0];
  const meilleur = [...(profils.data ?? [])].sort((x, y) => (y.noteGlobale ?? 0) - (x.noteGlobale ?? 0))[0];
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const comparer = params.get('vue') === 'comparer';
  useFilAriane([{ label: 'Mes recrutements', to: '/entreprise' }, { label: mission.data?.intitule ?? 'Mission' }, { label: 'Shortlist' }]);

  // « Proposer un entretien » : l'avis « à rencontrer » est enregistré, puis le panneau de planification s'ouvre.
  const rencontrer = (p: ProfilPresente) =>
    avis.mutate({ id: p.candidatureId, valeur: 'A_RENCONTRER' }, {
      onSuccess: () => navigate(versFenetre('planifier', { candidature: p.candidatureId, nom: p.candidatNom, mission: p.missionIntitule })),
    });

  const etapes = [
    { titre: 'Shortlist reçue', texte: premier ? `Le ${dateCourte(premier)}, ${total} profil(s).` : 'En préparation.', fait: total > 0, ton: 'menthe' },
    { titre: 'Votre avis', texte: donnes === total && total ? 'Merci, tous les avis sont donnés.' : 'Retenez ou écartez chaque profil.', fait: donnes === total && total > 0, ton: 'lavande' },
    { titre: 'Entretiens', texte: 'Créneaux proposés par votre recruteur, invitation envoyée à tous.', fait: false },
    { titre: 'Embauche', texte: 'Proposition, puis garantie de remplacement.', fait: false },
  ];

  return (
    <>
      <TetePage titre={`Shortlist · ${mission.data?.intitule ?? ''}`}
        sous={total ? `${total} profil(s) présenté(s)${premier ? ` le ${dateCourte(premier)}` : ''} · donnez votre avis sous 48 h pour garder le rythme.` : 'Profils pré-sélectionnés par votre recruteur.'}>
        {total > 1 && (
          <button type="button" className="btn" onClick={() => setParams((x) => { const n = new URLSearchParams(x); if (comparer) n.delete('vue'); else n.set('vue', 'comparer'); return n; }, { replace: true })}>
            {comparer ? 'Vue en cartes' : 'Comparer les profils'}
          </button>
        )}
        <span className="compteur-avis">
          <span className="muted small">Avis donnés</span><b>{donnes} / {total}</b>
          <span className="points" aria-hidden="true">{profils.data?.map((p) => <i key={p.candidatureId} className={p.avisClient ? 'on' : ''} />)}</span>
        </span>
      </TetePage>
      {avis.error && <Erreur message={messageErreur(avis.error)} />}
      {profils.isLoading && <Chargement />}
      {profils.data?.length === 0 && <Vide>Aucun profil ne vous a encore été présenté pour cette mission.</Vide>}

      {premier && donnes < total && (
        <div className="bandeau-delai" role="status">
          <Icone nom="horloge" taille={20} />
          <span><b>Votre avis est attendu avant le {limite(premier)}.</b> Passé ce délai, votre recruteur vous relance : les bons profils partent vite.</span>
        </div>
      )}

      {comparer && profils.data && profils.data.length > 0 && (
        <Comparateur profils={profils.data} onAvis={(p, v) => (v === 'REFUSE' ? setAEcarter(p) : v === 'A_RENCONTRER' ? rencontrer(p) : avis.mutate({ id: p.candidatureId, valeur: v }))} />
      )}

      <div className="profils-shortlist" style={comparer ? { display: 'none' } : undefined}>
        {profils.data?.map((p, i) => (
          <article key={p.candidatureId} className="bloc profil-sl">
            <div className="profil-sl-tete">
              <span className="mono-av grand" aria-hidden="true">{initiales(p.candidatNom)}</span>
              <div className="txt"><b>{p.candidatNom}</b><span>{p.candidatTitre}</span></div>
              {p.avisClient ? <Pill tone={toneAvis(p.avisClient)}>{libelleAvis[p.avisClient]}</Pill>
                : <span className="etat-carte">{p === meilleur && total > 1 ? 'Recommandé' : `Profil ${i + 1}`}</span>}
            </div>
            <div className="tags">
              <span className="tag contour">{p.candidatExperience} ans</span>
              {p.candidatVille && <span className="tag contour">{p.candidatVille}</span>}
              {p.candidatDisponibilite && <span className="tag contour">Dispo {p.candidatDisponibilite.toLowerCase()}</span>}
            </div>
            {p.noteGlobale != null && (
              <div className="mesure">
                <span className="ligne-entre"><span>Qualification</span><b>{String(p.noteGlobale).replace('.', ',')} / 5</b></span>
                <div className="barre"><div style={{ width: `${(p.noteGlobale / 5) * 100}%` }} /></div>
              </div>
            )}
            {p.competences.length > 0 && <div><b className="petit-titre">Compétences</b><Tags items={p.competences} /></div>}
            {p.synthese && <div><b className="petit-titre">L'avis de votre recruteur</b><p className="texte">{p.synthese}</p></div>}
            <span className="ligne-entre small"><span className="muted">Prétentions</span><b className="moyen">{p.candidatPretention != null ? mad(p.candidatPretention) : '—'}</b></span>

            {p.etape === 'PRESENTE' && !p.avisClient && (
              <div className="profil-sl-pied">
                <label className="sr-only" htmlFor={`com-${p.candidatureId}`}>Commentaire pour le recruteur</label>
                <input id={`com-${p.candidatureId}`} className="input" placeholder="Un commentaire pour le recruteur ? (facultatif)" value={commentaires[p.candidatureId] ?? ''}
                  onChange={(e) => setCommentaires({ ...commentaires, [p.candidatureId]: e.target.value })} />
                <div className="deux-boutons">
                  <button className="btn" onClick={() => setAEcarter(p)}>Écarter</button>
                  <button className="btn primary" disabled={avis.isPending} onClick={() => rencontrer(p)}>Proposer un entretien</button>
                </div>
                <button type="button" className="lien-action" onClick={() => avis.mutate({ id: p.candidatureId, valeur: 'RETENU' })}>Retenir sans entretien supplémentaire</button>
              </div>
            )}
            {p.avisClient && p.avisClient !== 'REFUSE' && p.etape === 'PRESENTE' && (
              <Link className="btn primary" to={versFenetre('planifier', { candidature: p.candidatureId, nom: p.candidatNom, mission: p.missionIntitule })}>Proposer un entretien</Link>
            )}
            {p.etape !== 'PRESENTE' && p.etape !== 'REFUSE' && <Pill tone="info">{p.etapeLibelle}</Pill>}
          </article>
        ))}
      </div>

      <section className="bloc" aria-labelledby="suite">
        <div className="bloc-tete"><h2 id="suite">Prochaines étapes</h2></div>
        <div className="bloc-corps etapes-fiche" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          {etapes.map((e, k) => (
            <div key={e.titre} className={`etape-suite ${e.fait || k === etapes.findIndex((x) => !x.fait) ? e.ton ?? '' : ''}`}>
              <span className="ligne-titre"><span className="rond">{e.fait ? '✓' : k + 1}</span><b>{e.titre}</b></span>
              <span>{e.texte}</span>
            </div>
          ))}
        </div>
      </section>
      {aEcarter && (
        <ModaleEcarter profil={aEcarter} envoi={avis.isPending} onFermer={() => setAEcarter(null)}
          onConfirmer={(commentaire) => avis.mutate({ id: aEcarter.candidatureId, valeur: 'REFUSE', commentaire })} />
      )}
    </>
  );
}

const limiteFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** Délai de réponse attendu : 48 h après la présentation. */
const limite = (presenteLe: string) => limiteFmt.format(new Date(new Date(presenteLe).getTime() + 48 * 3600_000));

/** Tableau comparatif (maquette « Comparateur de profils ») : un point bleu marque le meilleur profil sur chaque critère. */
function Comparateur({ profils, onAvis }: { profils: ProfilPresente[]; onAvis: (p: ProfilPresente, v: AvisClient) => void }) {
  const meilleur = (val: (p: ProfilPresente) => number | undefined, plusPetit = false) => {
    const vs = profils.map(val).filter((v): v is number => v != null);
    if (vs.length < 2) return undefined;
    return plusPetit ? Math.min(...vs) : Math.max(...vs);
  };
  const noteMax = meilleur((p) => p.noteGlobale);
  const expMax = meilleur((p) => p.candidatExperience);
  const salMin = meilleur((p) => p.candidatPretention, true);
  const testMax = meilleur((p) => p.scoreTest);
  const point = (ok: boolean) => (ok ? <span className="point-ton" style={{ background: 'var(--accent)' }} aria-label="meilleur sur ce critère" /> : null);
  const lignes: { libelle: string; cellule: (p: ProfilPresente) => ReactNode }[] = [
    { libelle: 'Note du recruteur', cellule: (p) => <>{point(p.noteGlobale != null && p.noteGlobale === noteMax)}{p.noteGlobale != null ? `${String(p.noteGlobale).replace('.', ',')} / 5` : '—'}</> },
    { libelle: "L'avis du recruteur", cellule: (p) => p.synthese ?? '—' },
    { libelle: 'Test technique', cellule: (p) => <>{point(p.scoreTest != null && p.scoreTest === testMax)}{p.scoreTest != null ? `${p.scoreTest} / 100` : '—'}</> },
    { libelle: 'Références', cellule: (p) => (p.referencesRecues ? `${p.referencesRecues} reçue(s)` : '—') },
    { libelle: 'Compétences', cellule: (p) => p.competences.join(', ') || '—' },
    { libelle: 'Expérience', cellule: (p) => <>{point(p.candidatExperience === expMax)}{p.candidatExperience} ans</> },
    { libelle: 'Prétentions', cellule: (p) => <>{point(p.candidatPretention != null && p.candidatPretention === salMin)}{p.candidatPretention != null ? mad(p.candidatPretention) : '—'}</> },
    { libelle: 'Disponibilité', cellule: (p) => p.candidatDisponibilite ?? '—' },
    { libelle: 'Ville', cellule: (p) => p.candidatVille ?? '—' },
  ];
  return (
    <section className="bloc comparateur" aria-label="Comparaison des profils">
      <div className="table-wrap">
        <table style={{ minWidth: 220 + profils.length * 240 }}>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Critère</span></th>
              {profils.map((p) => (
                <th key={p.candidatureId} scope="col">
                  <span className="personne"><span className="avatar lavande-av" aria-hidden="true">{initiales(p.candidatNom)}</span>
                    <span><span className="nom">{p.candidatNom}</span><span className="sous">{p.candidatTitre}</span></span></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.libelle}><th scope="row">{l.libelle}</th>{profils.map((p) => <td key={p.candidatureId}><span className="cellule">{l.cellule(p)}</span></td>)}</tr>
            ))}
            <tr className="ligne-avis">
              <th scope="row"><span className="muted small" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="point-ton" style={{ background: 'var(--accent)' }} />meilleur sur le critère</span></th>
              {profils.map((p) => (
                <td key={p.candidatureId}>
                  {p.avisClient ? <Pill tone={toneAvis(p.avisClient)}>{libelleAvis[p.avisClient]}</Pill>
                    : p.etape !== 'PRESENTE' ? <Pill tone="info">{p.etapeLibelle}</Pill>
                    : (
                      <div className="segments" role="group" aria-label={`Votre avis sur ${p.candidatNom}`}>
                        <button type="button" onClick={() => onAvis(p, 'RETENU')}>Retenir</button>
                        <button type="button" onClick={() => onAvis(p, 'A_RENCONTRER')}>Rencontrer</button>
                        <button type="button" onClick={() => onAvis(p, 'REFUSE')}>Écarter</button>
                      </div>
                    )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

const RAISONS = ['Salaire hors budget', 'Expérience insuffisante', 'Compétences techniques', 'Disponibilité', 'Profil trop senior', 'Autre'];

/** Écarter un profil : la raison aide le recruteur à affiner la recherche ; le candidat reçoit un message bienveillant. */
function ModaleEcarter({ profil, envoi, onFermer, onConfirmer }: {
  profil: ProfilPresente; envoi: boolean; onFermer: () => void; onConfirmer: (commentaire: string) => void;
}) {
  const [raison, setRaison] = useState('');
  const [precision, setPrecision] = useState('');
  return (
    <Fenetre titre={`Écarter ${profil.candidatNom} ?`} largeur={500} onFermer={onFermer} modifie={!!raison || !!precision}
      sousTitre="Votre raison aide le recruteur à affiner la recherche. Le candidat reçoit un message bienveillant, sans détail."
      pied={<>
        <Annuler onClick={onFermer} />
        <button type="button" className="btn primary" disabled={!raison || envoi}
          onClick={() => onConfirmer(`Raison : ${raison}.${precision.trim() ? ` ${precision.trim()}` : ''}`)}>Écarter le profil</button>
      </>}>
      <div className="field">Raison principale
        <div className="choix" role="radiogroup" aria-label="Raison principale">
          {RAISONS.map((r) => <button key={r} type="button" role="radio" aria-checked={raison === r} onClick={() => setRaison(r)}>{r}</button>)}
        </div>
      </div>
      <label className="field">Précisez (facultatif)
        <textarea rows={3} value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="Ex. : il manque une vraie expérience Kafka en production." />
      </label>
    </Fenetre>
  );
}
