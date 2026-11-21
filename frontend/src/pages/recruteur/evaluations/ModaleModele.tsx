import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur } from '../../../api/client';
import { LIBELLE_NIVEAU, useQuestions, type Mode, type Modele, type Niveau } from '../../../api/evaluations';
import { Annuler, Fenetre } from '../../../components/Fenetre';
import { Erreur, Icone } from '../../../components/ui';

interface Tirage { cle: number; questionId?: string; competence: string; niveau: Niveau | ''; nombre: number }
interface Critere { cle: number; libelle: string; guides: string; poids: number }
let compteur = 0;
const cle = () => ++compteur;

/** Création ou modification d'un modèle : test en ligne (tirages et règles) ou grille d'entretien (critères). */
export function ModaleModele({ modele, mode, onFermer }: { modele?: Modele; mode: Mode; onFermer: () => void }) {
  const qc = useQueryClient();
  const banque = useQuestions();
  const test = mode === 'TEST';
  const [intitule, setIntitule] = useState(modele?.intitule ?? '');
  const [competences, setCompetences] = useState(modele?.competences.join(', ') ?? '');
  const [dureeMin, setDuree] = useState(modele?.dureeMinutes ?? 30);
  const [seuil, setSeuil] = useState(modele?.seuil ?? 60);
  const [delai, setDelai] = useState(modele?.delaiJours ?? 5);
  const [regles, setRegles] = useState({
    melanger: modele?.melanger ?? true, indices: modele?.indices ?? false, scoreVisible: modele?.scoreVisible ?? false,
    pleinEcran: modele?.pleinEcran ?? true, signaux: modele?.signaux ?? true,
  });
  const [alerteSorties, setAlerteSorties] = useState(modele?.alerteSorties ?? 2);
  const [alerteSecondes, setAlerteSecondes] = useState(modele?.alerteSecondes ?? 15);
  const [tirages, setTirages] = useState<Tirage[]>(test ? (modele?.elements.map((e) => ({ cle: cle(), questionId: e.questionId, competence: e.competence ?? '', niveau: (e.niveau ?? '') as Niveau | '', nombre: e.nombre ?? 1 }))
    ?? [{ cle: cle(), competence: '', niveau: '', nombre: 5 }]) : []);
  const [criteres, setCriteres] = useState<Critere[]>(!test ? (modele?.elements.map((e) => ({ cle: cle(), libelle: e.libelle ?? '', guides: e.guides.join('\n'), poids: e.poids ?? 1 }))
    ?? [{ cle: cle(), libelle: '', guides: '', poids: 1 }]) : []);
  const [modifie, setModifie] = useState(false);
  const touche = () => setModifie(true);

  const questions = banque.data ?? [];
  const comps = [...new Set(questions.map((q) => q.competence))].sort();
  const disponibles = (t: Tirage) => questions.filter((q) => q.competence.toLowerCase() === t.competence.toLowerCase() && (!t.niveau || q.niveau === t.niveau)).length;
  const total = tirages.reduce((s, t) => s + (t.questionId ? 1 : Math.min(t.nombre, disponibles(t))), 0);
  const valide = intitule.trim() && (test ? dureeMin >= 5 && tirages.length > 0 && tirages.every((t) => t.questionId || (t.competence.trim() && t.nombre > 0)) && total > 0
    : criteres.length > 0 && criteres.every((c) => c.libelle.trim()));

  const enregistrer = useMutation({
    mutationFn: () => {
      const corps = {
        mode, intitule: intitule.trim(), competences: competences.trim() || undefined, dureeMinutes: test ? dureeMin : undefined, seuil, delaiJours: delai,
        ...regles, alerteSorties, alerteSecondes,
        elements: test
          ? tirages.map((t) => (t.questionId ? { questionId: t.questionId } : { competence: t.competence.trim(), niveau: t.niveau || undefined, nombre: t.nombre }))
          : criteres.map((c) => ({ libelle: c.libelle.trim(), guides: c.guides.trim() || undefined, poids: c.poids })),
      };
      return modele ? api.put(`/api/selection/evaluation/modeles/${modele.id}`, corps) : api.post('/api/selection/evaluation/modeles', corps);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['eval', 'modeles'] }); onFermer(); },
  });

  const regle = (k: keyof typeof regles, titre: string, aide: string) => (
    <div className="ligne-entre eval-regle">
      <span><b className="moyen">{titre}</b><span className="muted small" style={{ display: 'block' }}>{aide}</span></span>
      <button type="button" role="switch" className="interrupteur" aria-checked={regles[k]} aria-label={titre} onClick={() => { setRegles((r) => ({ ...r, [k]: !r[k] })); touche(); }} />
    </div>
  );

  return (
    <Fenetre type="drawer" largeur={680} onFermer={onFermer} modifie={modifie}
      titre={modele ? `Modifier « ${modele.intitule} »` : test ? 'Nouveau test en ligne' : "Nouvelle grille d'entretien"}
      sousTitre={modele && modele.utilisations > 0 ? 'Les évaluations déjà envoyées gardent leur version ; les changements valent pour les prochaines.' : undefined}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn primary" disabled={!valide || enregistrer.isPending} onClick={() => enregistrer.mutate()}>Enregistrer</button></>}>
      {enregistrer.error && <Erreur message={messageErreur(enregistrer.error)} />}
      <label className="field">Intitulé<input value={intitule} onChange={(e) => { setIntitule(e.target.value); touche(); }} placeholder={test ? 'Ex. : Java & Spring · confirmé' : 'Ex. : Entretien technique back-end'} /></label>
      <label className="field">Compétences évaluées (facultatif)<input value={competences} onChange={(e) => { setCompetences(e.target.value); touche(); }} placeholder="Java, Spring Boot, SQL" /></label>

      {test ? (
        <>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <label className="field">Durée (min)<input type="number" min={5} max={240} value={dureeMin} onChange={(e) => { setDuree(Number(e.target.value)); touche(); }} /></label>
            <label className="field">Seuil de réussite<input type="number" min={0} max={100} value={seuil} onChange={(e) => { setSeuil(Number(e.target.value)); touche(); }} /></label>
            <label className="field">Délai pour le passer (jours)<input type="number" min={1} max={60} value={delai} onChange={(e) => { setDelai(Number(e.target.value)); touche(); }} /></label>
          </div>

          <div className="field">Questions
            <span className="aide">Un tirage prend au hasard N questions d'une compétence : deux candidats n'ont pas le même test. Vous pouvez aussi imposer une question précise.</span>
            <div className="stack" style={{ gap: 8 }}>
              {tirages.map((t, i) => {
                const maj = (p: Partial<Tirage>) => { setTirages(tirages.map((x) => (x.cle === t.cle ? { ...x, ...p } : x))); touche(); };
                const q = t.questionId ? questions.find((x) => x.id === t.questionId) : undefined;
                return (
                  <div key={t.cle} className="eval-tirage">
                    {t.questionId ? (
                      <span className="grow"><span className="muted small">Question imposée</span><b className="moyen" style={{ display: 'block' }}>{q?.enonce ?? 'Question'}</b></span>
                    ) : (
                      <>
                        <label className="field">Compétence<input list="comps-modele" value={t.competence} onChange={(e) => maj({ competence: e.target.value })} /></label>
                        <label className="field">Niveau<select value={t.niveau} onChange={(e) => maj({ niveau: e.target.value as Niveau | '' })}>
                          <option value="">Tous</option>{(Object.keys(LIBELLE_NIVEAU) as Niveau[]).map((n) => <option key={n} value={n}>{LIBELLE_NIVEAU[n]}</option>)}</select></label>
                        <label className="field">Nombre<input type="number" min={1} max={50} value={t.nombre} onChange={(e) => maj({ nombre: Number(e.target.value) })} /></label>
                        <span className={`small ${t.competence && disponibles(t) < t.nombre ? 'ton-bad' : 'muted'}`} style={{ alignSelf: 'center' }}>
                          {t.competence ? `${disponibles(t)} dispo.` : ''}</span>
                      </>
                    )}
                    <button type="button" className="ico petit" aria-label={`Retirer la ligne ${i + 1}`} onClick={() => { setTirages(tirages.filter((x) => x.cle !== t.cle)); touche(); }}>✕</button>
                  </div>
                );
              })}
              <datalist id="comps-modele">{comps.map((c) => <option key={c} value={c} />)}</datalist>
              <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="lien-fleche" onClick={() => { setTirages([...tirages, { cle: cle(), competence: '', niveau: '', nombre: 3 }]); touche(); }}><Icone nom="plus" taille={14} />Ajouter un tirage</button>
                <select className="input" aria-label="Imposer une question" value="" onChange={(e) => { if (e.target.value) { setTirages([...tirages, { cle: cle(), questionId: e.target.value, competence: '', niveau: '', nombre: 1 }]); touche(); } }}>
                  <option value="">Imposer une question…</option>
                  {questions.map((q) => <option key={q.id} value={q.id}>{q.competence} · {q.enonce.slice(0, 70)}</option>)}
                </select>
              </div>
              <span className="muted small">Environ {total} question{total > 1 ? 's' : ''} par candidat, soit {total ? Math.round((dureeMin * 60) / total) : 0} s par question.</span>
            </div>
          </div>

          <div className="field">Règles de passage
            <div className="stack" style={{ gap: 4 }}>
              {regle('melanger', "Mélanger l'ordre", 'Questions et propositions dans un ordre différent pour chaque candidat.')}
              {regle('pleinEcran', 'Plein écran', 'Le test démarre en plein écran ; en sortir est signalé.')}
              {regle('signaux', "Signaux d'intégrité", 'Changements d’onglet ou de fenêtre et textes collés sont relevés pour vous.')}
              {regle('indices', 'Indices', 'Le candidat voit l’indice des questions qui en ont un.')}
              {regle('scoreVisible', 'Montrer le score au candidat', 'Sinon, il voit seulement que son test est bien reçu.')}
            </div>
          </div>
          {regles.signaux && (
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label className="field">Alerte à partir de (sorties)<input type="number" min={1} max={20} value={alerteSorties} onChange={(e) => { setAlerteSorties(Number(e.target.value)); touche(); }} /></label>
              <label className="field">ou de (secondes hors de la page)<input type="number" min={1} max={600} value={alerteSecondes} onChange={(e) => { setAlerteSecondes(Number(e.target.value)); touche(); }} /></label>
            </div>
          )}
        </>
      ) : (
        <div className="field">Critères notés de 1 à 5
          <span className="aide">Les repères aident à noter de façon homogène d'un entretien à l'autre ; le poids compte dans le score sur 100.</span>
          <div className="stack" style={{ gap: 10 }}>
            {criteres.map((c, i) => {
              const maj = (p: Partial<Critere>) => { setCriteres(criteres.map((x) => (x.cle === c.cle ? { ...x, ...p } : x))); touche(); };
              return (
                <div key={c.cle} className="eval-critere-saisie">
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 90px auto' }}>
                    <label className="field">Critère {i + 1}<input value={c.libelle} onChange={(e) => maj({ libelle: e.target.value })} placeholder="Ex. : Conception d'API" /></label>
                    <label className="field">Poids<input type="number" min={1} max={10} value={c.poids} onChange={(e) => maj({ poids: Number(e.target.value) })} /></label>
                    {criteres.length > 1 && <button type="button" className="ico petit" style={{ alignSelf: 'end', marginBottom: 6 }} aria-label={`Retirer le critère ${i + 1}`}
                      onClick={() => { setCriteres(criteres.filter((x) => x.cle !== c.cle)); touche(); }}>✕</button>}
                  </div>
                  <label className="field">Repères, un par ligne<textarea rows={2} value={c.guides} onChange={(e) => maj({ guides: e.target.value })} placeholder={'Questions à poser, ce qui fait un 5…'} /></label>
                </div>
              );
            })}
            <button type="button" className="lien-fleche" onClick={() => { setCriteres([...criteres, { cle: cle(), libelle: '', guides: '', poids: 1 }]); touche(); }}><Icone nom="plus" taille={14} />Ajouter un critère</button>
          </div>
        </div>
      )}
    </Fenetre>
  );
}
