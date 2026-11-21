import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { api, messageErreur } from '../../api/client';
import { dateFr } from '../../api/format';
import type { Candidat, MaCandidature, Reunion } from '../../api/types';
import { Annuler, Fenetre } from '../../components/Fenetre';
import { Chargement, Erreur, TetePage } from '../../components/ui';

type Choix = 'presentation' | 'vivier' | 'actualites';

/** Page « Mes données » : consentements, téléchargement des données et suppression du compte (loi 09-08 / RGPD). */
export default function MesDonnees() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [supprimer, setSupprimer] = useState(false);
  const [exporte, setExporte] = useState(false);
  const profil = useQuery({ queryKey: ['candidat', 'me'], queryFn: async () => (await api.get<Candidat>('/api/candidats/me')).data });

  const changer = useMutation({
    mutationFn: async (v: Partial<Record<Choix, boolean>>) => (await api.put<Candidat>('/api/candidats/me/consentements', v)).data,
    onSuccess: (c) => qc.setQueryData(['candidat', 'me'], c),
  });

  // Export immédiat : profil, candidatures et réunions, dans un fichier JSON lisible.
  const exporter = useMutation({
    mutationFn: async () => {
      const [moi, candidatures, reunions] = await Promise.all([
        api.get<Candidat>('/api/candidats/me'),
        api.get<MaCandidature[]>('/api/candidatures/mes').catch(() => ({ data: [] as MaCandidature[] })),
        api.get<Reunion[]>('/api/reunions').catch(() => ({ data: [] as Reunion[] })),
      ]);
      const c = moi.data;
      const contenu = {
        exporteLe: new Date().toISOString(),
        profil: { ...c, cvDisponible: undefined },
        consentements: {
          presentationAuxEntreprises: c.consentementLe ? `oui, depuis le ${c.consentementLe}` : 'non',
          resterDansLeVivier: c.consentementVivier !== false,
          actualites: !!c.consentementActualites,
        },
        cv: c.cvNomFichier ? `${c.cvNomFichier} (téléchargeable depuis « Mon profil »)` : null,
        candidatures: candidatures.data,
        reunions: reunions.data.map((r) => ({ nature: r.natureLibelle, mission: r.missionIntitule, statut: r.statut, debut: r.debut, fin: r.fin, type: r.typeLibelle })),
      };
      const url = URL.createObjectURL(new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-recrut-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => setExporte(true),
  });

  if (profil.isLoading) return <Chargement />;
  if (!profil.data) return <Erreur message={messageErreur(profil.error)} />;
  const c = profil.data;
  const valeurs: Record<Choix, boolean> = { presentation: !!c.consentementLe, vivier: c.consentementVivier !== false, actualites: !!c.consentementActualites };
  const lignes: { cle: Choix; titre: string; aide: string }[] = [
    { cle: 'presentation', titre: 'Présenter mon profil aux entreprises', aide: c.consentementLe ? `Donné le ${dateFr(c.consentementLe)}. Indispensable pour recevoir des propositions.` : 'Indispensable pour recevoir des propositions.' },
    { cle: 'vivier', titre: 'Rester dans le vivier du cabinet', aide: 'Si je ne suis pas retenu, mon recruteur peut me proposer d’autres postes.' },
    { cle: 'actualites', titre: 'Recevoir les actualités de Relais', aide: 'Un e-mail par mois au plus.' },
  ];

  return (
    <div className="page narrow" style={{ maxWidth: 640 }}>
      <TetePage titre="Mes données" sous="Vos données et vos choix. Vous pouvez les modifier à tout moment." />
      {changer.error && <Erreur message={messageErreur(changer.error)} />}

      <section className="bloc" aria-labelledby="consentements">
        <div className="bloc-tete"><h2 id="consentements">Mes consentements</h2></div>
        <div className="bloc-corps">
          {lignes.map((l) => (
            <div key={l.cle} className="ligne-choix">
              <span><b>{l.titre}</b><span>{l.aide}</span></span>
              <button type="button" role="switch" className="interrupteur" aria-checked={valeurs[l.cle]} aria-label={l.titre}
                disabled={changer.isPending} onClick={() => changer.mutate({ [l.cle]: !valeurs[l.cle] })} />
            </div>
          ))}
          {!valeurs.presentation && <div className="encadre alerte" style={{ marginTop: 10 }}>Sans ce consentement, votre recruteur ne peut plus présenter votre profil aux entreprises.</div>}
        </div>
      </section>

      <section className="bloc" aria-labelledby="telecharger">
        <div className="bloc-tete"><h2 id="telecharger">Télécharger mes données</h2></div>
        <div className="bloc-corps stack" style={{ gap: 10 }}>
          <p className="muted small" style={{ margin: 0 }}>Profil, expériences, candidatures, réunions et consentements, dans un fichier JSON lisible.</p>
          <button type="button" className="btn primary" disabled={exporter.isPending} onClick={() => exporter.mutate()}>
            {exporter.isPending ? 'Préparation…' : 'Télécharger mes données'}
          </button>
          {exporte && <span className="muted small" role="status">Fichier téléchargé.</span>}
          {exporter.error && <Erreur message={messageErreur(exporter.error)} />}
        </div>
      </section>

      <section className="bloc zone-danger" aria-labelledby="supprimer">
        <div className="bloc-tete"><h2 id="supprimer">Supprimer mon profil</h2></div>
        <div className="bloc-corps stack" style={{ gap: 10 }}>
          <p className="muted small" style={{ margin: 0 }}>Votre nom, vos coordonnées et vos expériences sont anonymisés, votre CV est effacé et votre compte de connexion supprimé. Vos entretiens à venir sont annulés. Cette action est définitive.</p>
          <button type="button" className="btn contour-rouge" onClick={() => setSupprimer(true)}>Supprimer mon profil</button>
        </div>
      </section>

      {supprimer && <FeuilleSuppression onFermer={() => setSupprimer(false)} onFait={() => { void auth.removeUser().then(() => window.location.assign('/')); }} />}
    </div>
  );
}

/** Feuille de confirmation : il faut taper SUPPRIMER (maquette « Feuille · supprimer mon compte »). */
function FeuilleSuppression({ onFermer, onFait }: { onFermer: () => void; onFait: () => void }) {
  const [saisie, setSaisie] = useState('');
  // Profil anonymisé d'abord, puis compte de connexion supprimé.
  const effacer = useMutation({
    mutationFn: async () => { await api.delete('/api/candidats/me'); await api.delete('/api/comptes/moi'); },
    onSuccess: onFait,
  });
  const ok = saisie.trim().toUpperCase() === 'SUPPRIMER';
  return (
    <Fenetre type="sheet" largeur={480} titre="Supprimer votre profil ?" sousTitre="Cette action est définitive." onFermer={onFermer} modifie={!!saisie}
      pied={<><Annuler onClick={onFermer} /><button type="button" className="btn danger" disabled={!ok || effacer.isPending} onClick={() => effacer.mutate()}>Supprimer définitivement</button></>}>
      <div className="encadre alerte">Votre nom, vos coordonnées et vos expériences seront anonymisés et votre CV effacé. Les entreprises ne verront plus votre profil et votre compte de connexion sera supprimé.</div>
      <label className="field">Tapez SUPPRIMER pour confirmer
        <input value={saisie} onChange={(e) => setSaisie(e.target.value)} autoComplete="off" placeholder="SUPPRIMER" />
      </label>
      {effacer.error && <Erreur message={messageErreur(effacer.error)} />}
    </Fenetre>
  );
}
