import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, messageErreur } from '../../../api/client';
import { AIDE_TYPE, LIBELLE_NIVEAU, LIBELLE_TYPE, type Niveau, type Question, type QuestionSaisie, type TypeQuestion } from '../../../api/evaluations';
import { Annuler, Fenetre } from '../../../components/Fenetre';
import { Erreur, Icone } from '../../../components/ui';

const TYPES = Object.keys(LIBELLE_TYPE) as TypeQuestion[];
const NIVEAUX = Object.keys(LIBELLE_NIVEAU) as Niveau[];
const A_CHOIX: TypeQuestion[] = ['QCM', 'QCM_MULTI', 'CODE'];

/** Création ou modification d'une question de la banque. */
export function ModaleQuestion({ question, competences, onFermer }: { question?: Question; competences: string[]; onFermer: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<TypeQuestion>(question?.type ?? 'QCM');
  const [enonce, setEnonce] = useState(question?.enonce ?? '');
  const [code, setCode] = useState(question?.code ?? '');
  const [langage, setLangage] = useState(question?.langage ?? 'java');
  const [choix, setChoix] = useState<string[]>(question?.choix.length ? question.choix : ['', '', '', '']);
  const [bonnes, setBonnes] = useState<Set<number>>(new Set(A_CHOIX.includes(question?.type ?? 'QCM') ? (question?.attendues ?? '').split(',').filter(Boolean).map(Number) : []));
  const [acceptees, setAcceptees] = useState(question?.type === 'COURTE' ? (question.attendues ?? '').split('|').join('\n') : '');
  const [competence, setCompetence] = useState(question?.competence ?? '');
  const [niveau, setNiveau] = useState<Niveau>(question?.niveau ?? 'CONFIRME');
  const [points, setPoints] = useState(question?.points ?? 1);
  const [indice, setIndice] = useState(question?.indice ?? '');
  const [explication, setExplication] = useState(question?.explication ?? '');
  const [modifie, setModifie] = useState(false);
  const m = <T,>(f: (v: T) => void) => (v: T) => { f(v); setModifie(true); };

  const aChoix = A_CHOIX.includes(type);
  const choixRemplis = choix.map((c) => c.trim()).filter(Boolean);
  const valide = enonce.trim() && competence.trim() && (type !== 'CODE' || code.trim())
    && (!aChoix || (choixRemplis.length >= 2 && bonnes.size >= 1 && [...bonnes].every((i) => choix[i]?.trim()) && (type === 'QCM_MULTI' || bonnes.size === 1)))
    && (type !== 'COURTE' || acceptees.trim());

  const enregistrer = useMutation({
    mutationFn: () => {
      // Les indices des bonnes réponses suivent les choix non vides, dans l'ordre.
      const garde = choix.map((c, i) => ({ c: c.trim(), i })).filter((x) => x.c);
      const corps: QuestionSaisie = {
        type, enonce: enonce.trim(), code: type === 'CODE' || code.trim() ? code : undefined, langage: code.trim() ? langage : undefined,
        choix: aChoix ? garde.map((x) => x.c) : [],
        attendues: aChoix ? garde.map((x, k) => (bonnes.has(x.i) ? k : -1)).filter((k) => k >= 0).join(',')
          : type === 'COURTE' ? acceptees.split('\n').map((s) => s.trim()).filter(Boolean).join('|') : undefined,
        indice: indice.trim() || undefined, explication: explication.trim() || undefined, competence: competence.trim(), niveau, points,
      };
      return question ? api.put(`/api/selection/evaluation/questions/${question.id}`, corps) : api.post('/api/selection/evaluation/questions', corps);
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['eval', 'questions'] }); onFermer(); },
  });
  const retirer = useMutation({
    mutationFn: () => api.delete(`/api/selection/evaluation/questions/${question!.id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['eval', 'questions'] }); onFermer(); },
  });

  const basculer = (i: number) => m(() => setBonnes((b) => {
    if (type !== 'QCM_MULTI') return new Set([i]);
    const n = new Set(b); if (n.has(i)) n.delete(i); else n.add(i); return n;
  }))(undefined);

  return (
    <Fenetre type="drawer" largeur={620} titre={question ? 'Modifier la question' : 'Nouvelle question'} onFermer={onFermer} modifie={modifie}
      sousTitre={question?.plateforme ? 'Question de la plateforme : vos modifications créeront votre propre copie.' : 'Elle rejoint la banque et peut être tirée dans vos tests.'}
      pied={<>
        {question && !question.plateforme && <button type="button" className="btn contour-rouge" style={{ marginRight: 'auto' }} disabled={retirer.isPending}
          onClick={() => { if (window.confirm('Retirer cette question de la banque ? Les tests déjà envoyés la gardent.')) retirer.mutate(); }}>Retirer</button>}
        <Annuler onClick={onFermer} />
        <button type="button" className="btn primary" disabled={!valide || enregistrer.isPending} onClick={() => enregistrer.mutate()}>
          {question?.plateforme ? 'Créer ma copie' : 'Enregistrer'}</button>
      </>}>
      {(enregistrer.error ?? retirer.error) && <Erreur message={messageErreur(enregistrer.error ?? retirer.error)} />}
      <label className="field">Type
        <select value={type} onChange={(e) => { m(setType)(e.target.value as TypeQuestion); setBonnes((b) => (e.target.value === 'QCM_MULTI' ? b : new Set([...b].slice(0, 1)))); }}>
          {TYPES.map((t) => <option key={t} value={t}>{LIBELLE_TYPE[t]}</option>)}
        </select>
        <span className="aide">{AIDE_TYPE[type]}</span>
      </label>
      <label className="field">Énoncé<textarea rows={3} value={enonce} onChange={(e) => m(setEnonce)(e.target.value)} placeholder={type === 'CODE' ? 'Que va afficher ce code ?' : 'Ex. : Quelle annotation rend une méthode transactionnelle ?'} /></label>
      {(type === 'CODE' || code) && (
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 140px' }}>
          <label className="field">Extrait de code<textarea rows={6} className="mono" spellCheck={false} value={code} onChange={(e) => m(setCode)(e.target.value)} /></label>
          <label className="field">Langage<select value={langage} onChange={(e) => m(setLangage)(e.target.value)}>
            {['java', 'javascript', 'typescript', 'sql', 'python', 'php', 'autre'].map((l) => <option key={l}>{l}</option>)}</select></label>
        </div>
      )}
      {type !== 'CODE' && !code && <button type="button" className="lien-fleche" onClick={() => setCode(' ')}><Icone nom="plus" taille={14} />Ajouter un extrait de code</button>}

      {aChoix && (
        <div className="field">Propositions <span className="aide">{type === 'QCM_MULTI' ? 'Cochez toutes les bonnes réponses.' : 'Cochez la bonne réponse.'} L'ordre peut être mélangé pour chaque candidat.</span>
          <div className="stack" style={{ gap: 6 }}>
            {choix.map((c, i) => (
              <div key={i} className="eval-choix-saisie">
                <input type={type === 'QCM_MULTI' ? 'checkbox' : 'radio'} name="bonne" checked={bonnes.has(i)} onChange={() => basculer(i)} aria-label={`Proposition ${i + 1} correcte`} />
                <input className="input" value={c} placeholder={`Proposition ${i + 1}`} onChange={(e) => m(setChoix)(choix.map((x, k) => (k === i ? e.target.value : x)))} />
                {choix.length > 2 && <button type="button" className="ico petit" aria-label={`Supprimer la proposition ${i + 1}`}
                  onClick={() => { m(setChoix)(choix.filter((_, k) => k !== i)); setBonnes((b) => new Set([...b].filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)))); }}>✕</button>}
              </div>
            ))}
            {choix.length < 8 && <button type="button" className="lien-fleche" onClick={() => m(setChoix)([...choix, ''])}><Icone nom="plus" taille={14} />Ajouter une proposition</button>}
          </div>
        </div>
      )}
      {type === 'COURTE' && (
        <label className="field">Réponses acceptées, une par ligne
          <textarea rows={3} value={acceptees} onChange={(e) => m(setAcceptees)(e.target.value)} placeholder={'ordre\nmême partition'} />
          <span className="aide">La réponse est juste si elle contient l'une d'elles, sans tenir compte des majuscules ni des accents.</span>
        </label>
      )}
      {type === 'OUVERTE' && <div className="alert info">Vous noterez la réponse après le test ; le résultat reste « à corriger » jusque-là.</div>}

      <div className="form-grid" style={{ gridTemplateColumns: '1fr 140px 100px' }}>
        <label className="field">Compétence<input list="competences-eval" value={competence} onChange={(e) => m(setCompetence)(e.target.value)} placeholder="Ex. : Spring Boot" />
          <datalist id="competences-eval">{competences.map((c) => <option key={c} value={c} />)}</datalist></label>
        <label className="field">Niveau<select value={niveau} onChange={(e) => m(setNiveau)(e.target.value as Niveau)}>{NIVEAUX.map((n) => <option key={n} value={n}>{LIBELLE_NIVEAU[n]}</option>)}</select></label>
        <label className="field">Points<input type="number" min={1} max={10} value={points} onChange={(e) => m(setPoints)(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} /></label>
      </div>
      <label className="field">Indice (facultatif)<input value={indice} onChange={(e) => m(setIndice)(e.target.value)} /><span className="aide">Montré au candidat seulement si le modèle autorise les indices.</span></label>
      <label className="field">Explication (facultatif)<textarea rows={2} value={explication} onChange={(e) => m(setExplication)(e.target.value)} /><span className="aide">Visible par le recruteur dans les résultats, jamais par le candidat.</span></label>
    </Fenetre>
  );
}
