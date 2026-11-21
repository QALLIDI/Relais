import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { dateCourte } from '../../api/format';
import { chrono, duree, useMesTests, type Fin, type Passage, type QuestionPassage, type TypeSignal } from '../../api/evaluations';
import { Logo } from '../../components/Logo';
import { Chargement, Erreur } from '../../components/ui';
import '../recruteur/evaluations/evaluations.css';

interface Signal { ordre?: number; type: TypeSignal; debut: string; dureeMs?: number; longueur?: number }

/**
 * Passage d'un test par le candidat : consignes, questions chronométrées (le serveur fait foi), enregistrement
 * à chaque réponse, signaux d'intégrité annoncés à l'avance, puis écran de fin.
 */
export default function PassageTest() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const passage = useQuery({ queryKey: ['passage', id], queryFn: async () => (await api.get<Passage>(`/api/selection/mes-tests/${id}`)).data, refetchOnWindowFocus: false });
  const mesTests = useMesTests();
  const resume = mesTests.data?.find((t) => t.id === id);
  const [fin, setFin] = useState<Fin | null>(null);

  const demarrer = useMutation({
    mutationFn: async () => (await api.post<Passage>(`/api/selection/mes-tests/${id}/demarrer`)).data,
    onSuccess: (p) => qc.setQueryData(['passage', id], p),
  });

  const p = passage.data;
  return (
    <div className="passage">
      <header className="passage-tete">
        <Link to="/candidat/tests" aria-label="Retour à mes tests"><Logo taille={26} /></Link>
        {p && <span className="passage-titre"><b>{p.intitule}</b><span className="muted small">{p.missionIntitule} · {p.entrepriseNom}</span></span>}
      </header>
      {passage.isLoading && <Chargement />}
      {passage.error && <div className="passage-corps"><Erreur message={messageErreur(passage.error)} /><Link to="/candidat/tests" className="btn">Mes tests</Link></div>}
      {p && !fin && p.statut === 'ENVOYEE' && (
        <Consignes p={p} nombre={resume?.nombreQuestions} dureeMin={resume?.dureeMinutes} dateLimite={resume?.dateLimite} message={resume?.message}
          enCours={demarrer.isPending} erreur={demarrer.error}
          onCommencer={() => {
            // Le plein écran doit être demandé dans le clic lui-même.
            if (p.pleinEcran) void document.documentElement.requestFullscreen?.().catch(() => undefined);
            demarrer.mutate();
          }} />
      )}
      {p && !fin && p.statut === 'COMMENCEE' && <Questions p={p} onFin={(f) => { setFin(f); void qc.invalidateQueries({ queryKey: ['mes-tests'] }); }} />}
      {(fin || (p && p.statut !== 'ENVOYEE' && p.statut !== 'COMMENCEE')) && <EcranFin fin={fin} statut={fin?.statut ?? p!.statut} score={fin?.score ?? resume?.score} />}
    </div>
  );
}

function Consignes({ p, nombre, dureeMin, dateLimite, message, enCours, erreur, onCommencer }: {
  p: Passage; nombre?: number; dureeMin?: number; dateLimite?: string; message?: string; enCours: boolean; erreur: unknown; onCommencer: () => void;
}) {
  const [lu, setLu] = useState(false);
  return (
    <main className="passage-corps passage-consignes">
      <h1>Avant de commencer</h1>
      {message && <p className="texte">« {message} »</p>}
      <div className="passage-chiffres">
        {nombre != null && <span><b>{nombre}</b> questions</span>}
        {dureeMin != null && <span><b>{dureeMin}</b> minutes</span>}
        {dateLimite && <span>à passer avant le <b>{dateCourte(dateLimite)}</b></span>}
      </div>
      <ul className="passage-regles">
        <li>Le chronomètre démarre au clic sur « Commencer » et ne s'arrête plus, même si vous fermez la page.</li>
        <li>Chaque réponse est enregistrée aussitôt : en cas de coupure, rouvrez le lien et reprenez où vous en étiez.</li>
        <li>Vous pouvez revenir sur une question tant que le temps n'est pas écoulé. À la fin du temps, le test est envoyé tel quel.</li>
        {p.pleinEcran && <li>Le test s'ouvre en plein écran. En sortir est signalé au recruteur.</li>}
        {p.signaux && <li><b>Pour l'équité entre candidats</b>, les passages sur un autre onglet ou une autre fenêtre, leur durée et les textes collés sont signalés au recruteur. Rien d'autre n'est enregistré : ni caméra, ni micro, ni écran.</li>}
        <li>Utilisez un ordinateur si possible, avec une connexion stable.</li>
      </ul>
      {erreur ? <Erreur message={messageErreur(erreur)} /> : null}
      <label className="check"><input type="checkbox" checked={lu} onChange={(e) => setLu(e.target.checked)} />J'ai lu les consignes et je suis prêt(e).</label>
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn primary" disabled={!lu || enCours} onClick={onCommencer}>Commencer le test</button>
        <Link to="/candidat/tests" className="btn">Plus tard</Link>
      </div>
    </main>
  );
}

function Questions({ p, onFin }: { p: Passage; onFin: (f: Fin) => void }) {
  const total = p.questions.length;
  const [index, setIndex] = useState(() => Math.max(0, p.questions.findIndex((q) => !q.reponse)));
  const [reponses, setReponses] = useState<Record<number, string>>(() => Object.fromEntries(p.questions.filter((q) => q.reponse).map((q) => [q.ordre, q.reponse!])));
  const [restant, setRestant] = useState(p.secondesRestantes);
  const [bandeau, setBandeau] = useState<string | null>(null);
  const [horsPleinEcran, setHorsPleinEcran] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const q = p.questions[index];
  const ordreCourant = useRef(q?.ordre);
  ordreCourant.current = q?.ordre;
  const finEstimee = useRef(Date.now() + p.secondesRestantes * 1000);
  const debutQuestion = useRef(Date.now());
  const file = useRef<Signal[]>([]);
  const termine = useRef(false);

  // ---- Signaux d'intégrité ----
  const envoyerSignaux = useCallback(async () => {
    if (!p.signaux || file.current.length === 0) return;
    const lot = file.current.splice(0, file.current.length);
    try { await api.post(`/api/selection/mes-tests/${p.id}/signaux`, lot); } catch { file.current.unshift(...lot); }
  }, [p.id, p.signaux]);

  useEffect(() => {
    if (!p.signaux) return;
    let sortie: { type: TypeSignal; t: number; ordre?: number } | null = null;
    const partir = (type: TypeSignal) => { if (!sortie) sortie = { type, t: Date.now(), ordre: ordreCourant.current }; };
    const revenir = () => {
      if (!sortie) return;
      const ms = Date.now() - sortie.t;
      file.current.push({ ordre: sortie.ordre, type: sortie.type, debut: new Date(sortie.t).toISOString(), dureeMs: ms });
      if (ms >= 1000) setBandeau(`Vous avez quitté la page du test pendant ${duree(ms / 1000)}. C'est signalé au recruteur.`);
      sortie = null;
    };
    const visibilite = () => (document.hidden ? partir('ONGLET') : revenir());
    let attente: number | undefined;
    const flou = () => { attente = window.setTimeout(() => { if (!document.hidden) partir('FENETRE'); }, 150); };
    const focus = () => { window.clearTimeout(attente); if (!document.hidden) revenir(); };
    const coller = (e: ClipboardEvent) => {
      const n = e.clipboardData?.getData('text')?.length ?? 0;
      if (n > 0) file.current.push({ ordre: ordreCourant.current, type: 'COLLAGE', debut: new Date().toISOString(), longueur: n });
    };
    const copier = () => file.current.push({ ordre: ordreCourant.current, type: 'COPIE', debut: new Date().toISOString() });
    document.addEventListener('visibilitychange', visibilite);
    window.addEventListener('blur', flou);
    window.addEventListener('focus', focus);
    document.addEventListener('paste', coller);
    document.addEventListener('copy', copier);
    const minuterie = window.setInterval(() => void envoyerSignaux(), 5000);
    return () => {
      document.removeEventListener('visibilitychange', visibilite);
      window.removeEventListener('blur', flou);
      window.removeEventListener('focus', focus);
      document.removeEventListener('paste', coller);
      document.removeEventListener('copy', copier);
      window.clearInterval(minuterie);
      window.clearTimeout(attente);
    };
  }, [p.signaux, envoyerSignaux]);

  useEffect(() => {
    if (!p.pleinEcran) return;
    let depuis: number | null = null;
    const changement = () => {
      if (!document.fullscreenElement) {
        depuis = Date.now();
        setHorsPleinEcran(true);
      } else {
        if (depuis && p.signaux) file.current.push({ ordre: ordreCourant.current, type: 'PLEIN_ECRAN', debut: new Date(depuis).toISOString(), dureeMs: Date.now() - depuis });
        depuis = null;
        setHorsPleinEcran(false);
      }
    };
    if (!document.fullscreenElement) setHorsPleinEcran(true);
    document.addEventListener('fullscreenchange', changement);
    return () => { document.removeEventListener('fullscreenchange', changement); };
  }, [p.pleinEcran, p.signaux]);

  // ---- Enregistrement des réponses ----
  const enregistrer = useCallback(async (ordre: number, valeur: string | undefined) => {
    const tempsMs = Date.now() - debutQuestion.current;
    debutQuestion.current = Date.now();
    try {
      await api.put(`/api/selection/mes-tests/${p.id}/reponses/${ordre}`, { reponse: valeur ?? null, tempsMs });
      setErreur(null);
    } catch (e) { setErreur(`Réponse non enregistrée : ${messageErreur(e)} Vérifiez votre connexion, elle sera renvoyée à la question suivante.`); }
  }, [p.id]);

  const terminer = useCallback(async () => {
    if (termine.current) return;
    termine.current = true;
    setEnvoi(true);
    try {
      if (q) await enregistrer(q.ordre, reponses[q.ordre]);
      await envoyerSignaux();
      const f = (await api.post<Fin>(`/api/selection/mes-tests/${p.id}/terminer`)).data;
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      onFin(f);
    } catch (e) {
      termine.current = false;
      setEnvoi(false);
      setErreur(messageErreur(e));
    }
  }, [q, reponses, enregistrer, envoyerSignaux, p.id, onFin]);

  // ---- Chronomètre ----
  useEffect(() => {
    const t = window.setInterval(() => {
      const s = Math.max(0, Math.round((finEstimee.current - Date.now()) / 1000));
      setRestant(s);
      if (s === 0) void terminer();
    }, 1000);
    return () => window.clearInterval(t);
  }, [terminer]);

  const aller = (i: number) => {
    if (i === index || i < 0 || i >= total) return;
    void enregistrer(q.ordre, reponses[q.ordre]);
    setIndex(i);
    setBandeau(null);
  };
  const repondues = p.questions.filter((x) => reponses[x.ordre]?.trim()).length;
  const finir = () => {
    const manque = total - repondues;
    if (manque > 0 && !window.confirm(`Il reste ${manque} question${manque > 1 ? 's' : ''} sans réponse. Envoyer le test quand même ?`)) return;
    void terminer();
  };

  if (!q) return <main className="passage-corps"><Erreur message="Ce test ne contient aucune question." /></main>;
  return (
    <main className="passage-corps passage-questions">
      <div className="passage-barre">
        <span className="muted small">Question {index + 1} sur {total} · {repondues} répondue{repondues > 1 ? 's' : ''}</span>
        <span className={`passage-chrono ${restant <= 60 ? 'urgent' : restant <= 300 ? 'bientot' : ''}`} role="timer" aria-live={restant <= 60 ? 'assertive' : 'off'}
          aria-label={`Temps restant : ${duree(restant)}`}>{chrono(restant)}</span>
      </div>
      <div className="progress" aria-hidden="true">{p.questions.map((x, i) => <div key={x.ordre} className={i === index ? 'cur' : reponses[x.ordre]?.trim() ? 'on' : ''} />)}</div>

      {horsPleinEcran && (
        <div className="alert error passage-alerte" role="alert">
          Vous n'êtes plus en plein écran : c'est signalé au recruteur.
          <button type="button" className="btn small" onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}>Revenir en plein écran</button>
        </div>
      )}
      {bandeau && <div className="alert info passage-alerte" role="status">{bandeau}<button type="button" className="ico petit" aria-label="Fermer" onClick={() => setBandeau(null)}>✕</button></div>}
      {restant <= 60 && restant > 0 && <div className="alert error" role="status">Moins d'une minute : le test sera envoyé automatiquement.</div>}
      {erreur && <Erreur message={erreur} />}

      <article className="passage-question" aria-labelledby="enonce">
        <span className="muted small">{q.competence}{q.type === 'QCM_MULTI' ? ' · plusieurs réponses possibles' : ''}</span>
        <h1 id="enonce">{q.enonce}</h1>
        {q.code && <pre className="eval-code" aria-label={`Code ${q.langage ?? ''}`}>{q.code}</pre>}
        <Reponse q={q} valeur={reponses[q.ordre]} onChange={(v) => setReponses((r) => ({ ...r, [q.ordre]: v }))} />
        {q.indice && <details className="passage-indice"><summary>Indice</summary>{q.indice}</details>}
      </article>

      <div className="passage-nav">
        <button type="button" className="btn" disabled={index === 0} onClick={() => aller(index - 1)}>Précédente</button>
        <div className="passage-pastilles" role="navigation" aria-label="Aller à la question">
          {p.questions.map((x, i) => (
            <button key={x.ordre} type="button" aria-current={i === index ? 'step' : undefined} className={reponses[x.ordre]?.trim() ? 'faite' : ''}
              aria-label={`Question ${i + 1}${reponses[x.ordre]?.trim() ? ', répondue' : ''}`} onClick={() => aller(i)}>{i + 1}</button>
          ))}
        </div>
        {index < total - 1
          ? <button type="button" className="btn primary" onClick={() => aller(index + 1)}>Suivante</button>
          : <button type="button" className="btn primary" disabled={envoi} onClick={finir}>{envoi ? 'Envoi…' : 'Terminer le test'}</button>}
      </div>
      {index < total - 1 && <button type="button" className="lien-fleche" style={{ alignSelf: 'flex-end' }} disabled={envoi} onClick={finir}>Terminer maintenant</button>}
    </main>
  );
}

function Reponse({ q, valeur, onChange }: { q: QuestionPassage; valeur?: string; onChange: (v: string) => void }) {
  if (q.type === 'COURTE' || q.type === 'OUVERTE') {
    return (
      <label className="field">Votre réponse
        {q.type === 'COURTE'
          ? <input value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={500} autoComplete="off" />
          : <textarea rows={8} value={valeur ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={8000} />}
      </label>
    );
  }
  const multi = q.type === 'QCM_MULTI';
  const choisies = new Set((valeur ?? '').split(',').filter((x) => x !== '').map(Number));
  const basculer = (i: number) => {
    if (!multi) { onChange(String(i)); return; }
    const n = new Set(choisies); if (n.has(i)) n.delete(i); else n.add(i);
    onChange([...n].sort((a, b) => a - b).join(','));
  };
  return (
    <div className="passage-choix" role={multi ? 'group' : 'radiogroup'} aria-labelledby="enonce">
      {q.choix.map((c, i) => (
        <button key={i} type="button" role={multi ? 'checkbox' : 'radio'} aria-checked={choisies.has(i)} onClick={() => basculer(i)}>
          <span className={`passage-case ${multi ? 'carree' : ''}`} aria-hidden="true" />
          <span className={q.type === 'CODE' ? 'mono' : undefined}>{c}</span>
        </button>
      ))}
    </div>
  );
}

function EcranFin({ fin, statut, score }: { fin: Fin | null; statut: string; score?: number }) {
  const comp = fin ? Object.entries(fin.scoresCompetences) : [];
  return (
    <main className="passage-corps passage-fin">
      {statut === 'EXPIREE' ? (
        <>
          <h1>Ce test a expiré</h1>
          <p className="muted">La date limite est passée. Si vous pensez qu'il s'agit d'une erreur, écrivez au cabinet depuis votre espace.</p>
        </>
      ) : (
        <>
          <span className="passage-coche" aria-hidden="true">✓</span>
          <h1>Test envoyé, merci !</h1>
          {score != null ? (
            <>
              <p className="passage-score"><b>{score}</b> / 100{fin?.provisoire ? ' (provisoire)' : ''}</p>
              {fin?.provisoire && <p className="muted small">Certaines réponses sont relues par le recruteur ; le score peut encore évoluer.</p>}
              {comp.length > 0 && (
                <div className="stack" style={{ gap: 8, width: '100%', maxWidth: 420 }}>
                  {comp.map(([c, v]) => <div key={c} className="barre-ligne"><span>{c}</span><div className="barre"><div style={{ width: `${v}%` }} /></div><span className="mono" style={{ textAlign: 'right' }}>{v}</span></div>)}
                </div>
              )}
            </>
          ) : <p className="muted">Vos réponses sont bien reçues. Le cabinet revient vers vous après les avoir étudiées.</p>}
        </>
      )}
      <Link to="/candidat" className="btn primary">Retour à mon espace</Link>
    </main>
  );
}
