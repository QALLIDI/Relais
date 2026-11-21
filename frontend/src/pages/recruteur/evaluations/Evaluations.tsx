import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { dateCourte } from '../../../api/format';
import { LIBELLE_NIVEAU, LIBELLE_STATUT, LIBELLE_TYPE, TON_STATUT, useEvaluationsRecentes, useModeles, useQuestions,
  type Modele, type Question } from '../../../api/evaluations';
import { messageErreur } from '../../../api/client';
import { Chargement, Erreur, Icone, Pill, Segments, TetePage, Vide } from '../../../components/ui';
import { FenetreResultat, PastilleIntegrite, ScoreSeuil } from './Resultat';
import { ModaleQuestion } from './ModaleQuestion';
import { ModaleModele } from './ModaleModele';
import './evaluations.css';

type Onglet = 'resultats' | 'questions' | 'modeles';

/** Évaluations techniques : résultats des tests, banque de questions et modèles (DAT, section 15). */
export default function Evaluations() {
  const [params, setParams] = useSearchParams();
  const onglet = (params.get('onglet') as Onglet) || 'resultats';
  const choisir = (o: Onglet) => { const p = new URLSearchParams(params); p.set('onglet', o); setParams(p, { replace: true }); };
  return (
    <>
      <TetePage titre="Évaluations" sous="Tests techniques passés en ligne et grilles d'entretien, corrigés et comparables d'un candidat à l'autre." />
      <Segments<Onglet> label="Rubrique" valeur={onglet} onChange={choisir}
        options={[{ v: 'resultats', l: 'Résultats' }, { v: 'questions', l: 'Banque de questions' }, { v: 'modeles', l: 'Modèles' }]} />
      <div style={{ marginTop: 18 }}>
        {onglet === 'resultats' && <Resultats />}
        {onglet === 'questions' && <Questions />}
        {onglet === 'modeles' && <Modeles />}
      </div>
    </>
  );
}

function Resultats() {
  const liste = useEvaluationsRecentes();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<'tous' | 'corriger' | 'alerte'>('tous');
  if (liste.isLoading) return <Chargement />;
  if (liste.error) return <Erreur message={messageErreur(liste.error)} />;
  const toutes = liste.data ?? [];
  const aCorriger = toutes.filter((e) => e.statut === 'A_CORRIGER' || e.statut === 'EN_COURS');
  const alertes = toutes.filter((e) => e.integrite.alerte || e.integrite.aVerifier > 0);
  const vues = filtre === 'corriger' ? aCorriger : filtre === 'alerte' ? alertes : toutes;
  return (
    <section className="card">
      <div className="ligne-entre" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div className="filtres" role="group" aria-label="Filtrer">
          <button type="button" className="filtre-pilule" aria-pressed={filtre === 'tous'} onClick={() => setFiltre('tous')}>Toutes · {toutes.length}</button>
          <button type="button" className="filtre-pilule" aria-pressed={filtre === 'corriger'} onClick={() => setFiltre('corriger')}>À noter · {aCorriger.length}</button>
          <button type="button" className="filtre-pilule" aria-pressed={filtre === 'alerte'} onClick={() => setFiltre('alerte')}>Signaux · {alertes.length}</button>
        </div>
        <span className="muted small">On envoie un test depuis la préqualification d'une candidature.</span>
      </div>
      {vues.length === 0 ? <Vide>{toutes.length === 0 ? "Aucune évaluation pour l'instant. Ouvrez une candidature, puis « Envoyer un test »." : 'Rien dans ce filtre.'}</Vide> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Candidat</th><th>Évaluation</th><th>Statut</th><th className="num">Score</th><th>Intégrité</th><th>Envoyée le</th></tr></thead>
            <tbody>
              {vues.map((e) => (
                <tr key={e.id} className="ligne-cliquable" onClick={() => setOuverte(e.id)}>
                  <td><button type="button" className="nom-lien" onClick={(x) => { x.stopPropagation(); setOuverte(e.id); }}>{e.candidatNom}</button>
                    <span className="muted small" style={{ display: 'block' }}>{e.missionIntitule}</span></td>
                  <td>{e.intitule}<span className="muted small" style={{ display: 'block' }}>{e.mode === 'GRILLE' ? "Grille d'entretien" : `Test en ligne${e.dureeMinutes ? ` · ${e.dureeMinutes} min` : ''}`}</span></td>
                  <td><Pill tone={TON_STATUT[e.statut]}>{LIBELLE_STATUT[e.statut]}</Pill>{e.aNoter > 0 && <span className="muted small" style={{ display: 'block' }}>{e.aNoter} à noter</span>}</td>
                  <td className="num"><ScoreSeuil e={e} /></td>
                  <td>{e.mode === 'TEST' ? <PastilleIntegrite e={e} /> : <span className="muted">—</span>}</td>
                  <td>{dateCourte(e.envoyeeLe)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ouverte && <FenetreResultat id={ouverte} onFermer={() => setOuverte(null)} />}
    </section>
  );
}

function Questions() {
  const questions = useQuestions();
  const [comp, setComp] = useState('');
  const [texte, setTexte] = useState('');
  const [edition, setEdition] = useState<Question | 'nouvelle' | null>(null);
  if (questions.isLoading) return <Chargement />;
  if (questions.error) return <Erreur message={messageErreur(questions.error)} />;
  const toutes = questions.data ?? [];
  const competences = [...new Set(toutes.map((q) => q.competence))].sort();
  const t = texte.trim().toLowerCase();
  const vues = toutes.filter((q) => (!comp || q.competence === comp) && (!t || q.enonce.toLowerCase().includes(t)));
  return (
    <>
      <div className="alert info" style={{ marginBottom: 14 }}>
        Les questions marquées <b>Plateforme</b> sont fournies avec l'application. Les modifier crée votre propre copie ; l'originale reste intacte.
      </div>
      <div className="ligne-entre" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input className="input" type="search" placeholder="Rechercher dans les énoncés" aria-label="Rechercher" value={texte} onChange={(e) => setTexte(e.target.value)} style={{ minWidth: 240 }} />
          <select className="input" aria-label="Compétence" value={comp} onChange={(e) => setComp(e.target.value)}>
            <option value="">Toutes les compétences</option>
            {competences.map((c) => <option key={c} value={c}>{c} · {toutes.filter((q) => q.competence === c).length}</option>)}
          </select>
        </div>
        <button type="button" className="btn primary" onClick={() => setEdition('nouvelle')}><Icone nom="plus" taille={14} />Nouvelle question</button>
      </div>
      {vues.length === 0 && <Vide>Aucune question ne correspond.</Vide>}
      <div className="eval-questions">
        {vues.map((q) => (
          <button key={q.id} type="button" className="carte eval-question" onClick={() => setEdition(q)}>
            <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <span className="tag">{q.competence}</span><span className="tag">{LIBELLE_NIVEAU[q.niveau]}</span>
              <span className="tag">{LIBELLE_TYPE[q.type]}</span>{q.plateforme && <span className="tag plateforme">Plateforme</span>}
            </span>
            <b>{q.enonce}</b>
            {q.code && <pre className="eval-code court">{q.code}</pre>}
            <span className="muted small">{q.points} pt{q.points > 1 ? 's' : ''} · utilisée {q.utilisations} fois{q.auteur && !q.plateforme ? ` · par ${q.auteur}` : ''}</span>
          </button>
        ))}
      </div>
      {edition && <ModaleQuestion question={edition === 'nouvelle' ? undefined : edition} competences={competences} onFermer={() => setEdition(null)} />}
    </>
  );
}

function Modeles() {
  const modeles = useModeles();
  const [edition, setEdition] = useState<Modele | 'TEST' | 'GRILLE' | null>(null);
  if (modeles.isLoading) return <Chargement />;
  if (modeles.error) return <Erreur message={messageErreur(modeles.error)} />;
  const liste = modeles.data ?? [];
  return (
    <>
      <div className="ligne-entre" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="muted small">Un <b>test</b> se passe en ligne par le candidat, chronométré. Une <b>grille</b> se remplit par vous pendant un entretien.</span>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn" onClick={() => setEdition('GRILLE')}><Icone nom="plus" taille={14} />Nouvelle grille</button>
          <button type="button" className="btn primary" onClick={() => setEdition('TEST')}><Icone nom="plus" taille={14} />Nouveau test</button>
        </div>
      </div>
      {liste.length === 0 && <Vide>Aucun modèle.</Vide>}
      <div className="eval-modeles">
        {liste.map((m) => (
          <button key={m.id} type="button" className="carte eval-modele" onClick={() => setEdition(m)}>
            <span className="ligne-entre"><span className="etat-carte">{m.mode === 'TEST' ? 'Test en ligne' : "Grille d'entretien"}</span>
              {m.mode === 'TEST' && <span className="muted small">{m.dureeMinutes} min</span>}</span>
            <b className="eval-modele-titre">{m.intitule}</b>
            {m.competences.length > 0 && <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>{m.competences.map((c) => <span key={c} className="tag">{c}</span>)}</span>}
            <span className="muted small">
              {m.mode === 'TEST' ? `${m.nombreQuestions} questions · seuil ${m.seuil} / 100` : `${m.nombreQuestions} critère${m.nombreQuestions > 1 ? 's' : ''} notés de 1 à 5`}
              {` · utilisé ${m.utilisations} fois`}
            </span>
            {m.mode === 'TEST' && (
              <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {m.pleinEcran && <span className="tag">Plein écran</span>}{m.signaux && <span className="tag">Signaux d'intégrité</span>}
                {m.melanger && <span className="tag">Ordre mélangé</span>}{m.scoreVisible && <span className="tag">Score montré au candidat</span>}
              </span>
            )}
          </button>
        ))}
      </div>
      {edition && <ModaleModele modele={typeof edition === 'string' ? undefined : edition} mode={typeof edition === 'string' ? edition : edition.mode}
        onFermer={() => setEdition(null)} />}
    </>
  );
}
