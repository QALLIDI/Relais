import { lazy, Suspense } from 'react';
import { useFenetreUrl } from './Fenetre';

const PanneauPlanifier = lazy(() => import('../pages/Planifier'));
const ModaleEvaluation = lazy(() => import('../pages/Evaluation'));
const ModaleMission = lazy(() => import('../pages/recruteur/ModaleMission'));
const PanneauEchanges = lazy(() => import('../pages/Echanges'));

/**
 * Fenêtres ouvertes par l'URL (?fenetre=planifier|evaluation|mission|echanges&…), par-dessus la page courante.
 * Un lien d'e-mail ou de notification peut ainsi ouvrir directement la bonne fenêtre.
 */
export function FenetresGlobales({ espace }: { espace: 'recruteur' | 'entreprise' | 'candidat' }) {
  const { nom, params, fermer } = useFenetreUrl();
  if (!nom || espace === 'candidat') return null;
  return (
    <Suspense fallback={null}>
      {nom === 'planifier' && <PanneauPlanifier key={params.toString()} espace={espace} onFermer={fermer} />}
      {nom === 'evaluation' && params.get('reunion') && <ModaleEvaluation reunionId={params.get('reunion')!} onFermer={fermer} />}
      {nom === 'mission' && espace === 'recruteur' && <ModaleMission onFermer={fermer} />}
      {nom === 'echanges' && params.get('mission') && <PanneauEchanges key={params.get('mission')} missionId={params.get('mission')!} espace={espace} onFermer={fermer} />}
    </Suspense>
  );
}
