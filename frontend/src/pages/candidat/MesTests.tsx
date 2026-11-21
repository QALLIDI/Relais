import { Link } from 'react-router';
import { messageErreur } from '../../api/client';
import { dateCourte, joursRestants, libelleJours } from '../../api/format';
import { useMesTests, type MonTest } from '../../api/evaluations';
import { Chargement, Erreur, Pill, Vide } from '../../components/ui';

/** Tests techniques reçus par le candidat. */
export default function MesTests() {
  const tests = useMesTests();
  const aPasser = tests.data?.filter((t) => t.statut === 'ENVOYEE' || t.statut === 'COMMENCEE') ?? [];
  const passes = tests.data?.filter((t) => t.statut !== 'ENVOYEE' && t.statut !== 'COMMENCEE') ?? [];
  return (
    <div className="page narrow stack" style={{ gap: 18 }}>
      <header><h1 style={{ fontSize: 26 }}>Mes tests</h1>
        <p className="muted">Les tests techniques que le cabinet vous a envoyés. Choisissez un moment calme : une fois commencé, le chronomètre ne s'arrête plus.</p></header>
      {tests.isLoading && <Chargement />}
      {tests.error && <Erreur message={messageErreur(tests.error)} />}
      {tests.data?.length === 0 && <Vide>Aucun test pour l'instant. S'il y en a un pour une de vos candidatures, vous le recevrez aussi par e-mail.</Vide>}
      {aPasser.map((t) => <CarteTest key={t.id} t={t} />)}
      {passes.length > 0 && (
        <section className="card stack" style={{ borderRadius: 24, gap: 10 }}>
          <h2>Tests passés</h2>
          {passes.map((t) => (
            <div key={t.id} className="tile">
              <span style={{ flex: '1 1 180px', minWidth: 0 }}><b style={{ fontWeight: 600 }}>{t.intitule}</b>
                <span className="muted small" style={{ display: 'block' }}>{t.missionIntitule} · {t.entrepriseNom}{t.fin ? ` · terminé le ${dateCourte(t.fin)}` : ''}</span></span>
              {t.score != null ? <span className="pill ok">{t.score} / 100</span> : <Pill tone={t.statut === 'EXPIREE' ? 'bad' : 'ok'}>{t.statut === 'EXPIREE' ? 'Expiré' : 'Reçu'}</Pill>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export function CarteTest({ t }: { t: MonTest }) {
  const j = t.dateLimite ? joursRestants(t.dateLimite) : null;
  return (
    <section className="bloc reperes carte-entretien" aria-label={`Test : ${t.intitule}`}>
      <div className="ligne-entre">
        <span className="etat-carte">{t.statut === 'COMMENCEE' ? 'Test commencé' : 'Test à passer'}</span>
        {j != null && t.statut === 'ENVOYEE' && <span className={`small ${j <= 1 ? 'ton-bad' : 'muted'}`}>avant le {dateCourte(t.dateLimite)} · {libelleJours(j)}</span>}
      </div>
      <Link to={`/candidat/tests/${t.id}`} className="titre-entretien">{t.intitule}</Link>
      <span className="small muted">{t.missionIntitule} · {t.entrepriseNom} · {t.nombreQuestions} questions{t.dureeMinutes ? ` · ${t.dureeMinutes} min` : ''}</span>
      {t.message && <p className="texte small" style={{ margin: 0 }}>« {t.message} »</p>}
      <Link to={`/candidat/tests/${t.id}`} className="btn primary" style={{ justifySelf: 'start' }}>{t.statut === 'COMMENCEE' ? 'Reprendre le test' : 'Voir les consignes'}</Link>
    </section>
  );
}
