import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { Link } from 'react-router';
import { api, messageErreur } from '../../api/client';
import { libelleStatutMission, n } from '../../api/format';
import type { Entreprise, Mission } from '../../api/types';
import { useFilAriane } from '../../components/Layouts';
import { Erreur, Icone, TetePage, toneMission } from '../../components/ui';

type Etape = 1 | 2;
type Niveau = 'indispensable' | 'souhaitee';
const SUGGESTIONS = ['Java', 'Spring Boot', 'React', 'SQL', 'Relation client', 'Gestion de projet', 'Anglais', 'Excel'];
const vide = {
  intitule: '', description: '', typeContrat: 'CDI', ville: '', teletravail: 'Hybride', nbPostes: '1',
  experienceMin: '', salaireMin: '', salaireMax: '', dateLimite: '',
};

/** Brouillon de description rédigé à partir des mots-clés (modifiable librement, rien n'est envoyé avant validation). */
function brouillon(intitule: string, entreprise: string | undefined, ville: string, teletravail: string, indisp: string[], souh: string[]) {
  const poste = intitule.trim();
  const lieu = ville.trim() ? `Poste basé à ${ville.trim()}${teletravail === 'Hybride' ? ', en mode hybride' : teletravail === 'Télétravail' ? ', en télétravail' : ''}.` : '';
  return [
    `Chez ${entreprise ?? 'nous'}, vous rejoignez l'équipe${poste ? ` au poste de ${poste}` : ''}.`,
    indisp.length ? `Vous mettez à profit votre maîtrise de ${liste(indisp)} au quotidien.` : '',
    souh.length ? `Une expérience en ${liste(souh)} est un vrai plus.` : '',
    lieu,
  ].filter(Boolean).join(' ');
}
const liste = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} et ${xs[xs.length - 1]}`);

export default function NouveauBesoin() {
  const qc = useQueryClient();
  useFilAriane([{ label: 'Mes recrutements', to: '/entreprise' }, { label: 'Nouveau besoin' }]);
  const [etape, setEtape] = useState<Etape>(1);
  const [f, setF] = useState(vide);
  const [motsCles, setMotsCles] = useState<{ mot: string; niveau: Niveau }[]>([]);
  const [saisie, setSaisie] = useState('');
  const [envoye, setEnvoye] = useState<Mission | null>(null);
  const [confidentiel, setConfidentiel] = useState(false);
  const missions = useQuery({ queryKey: ['missions'], queryFn: async () => (await api.get<Mission[]>('/api/missions')).data });
  const entreprise = useQuery({ queryKey: ['entreprise', 'me'], queryFn: async () => (await api.get<Entreprise>('/api/entreprises/me')).data });
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const indisp = motsCles.filter((m) => m.niveau === 'indispensable').map((m) => m.mot);
  const souh = motsCles.filter((m) => m.niveau === 'souhaitee').map((m) => m.mot);
  const ajouter = (mot: string) => {
    const m = mot.trim();
    if (m && !motsCles.some((x) => x.mot.toLowerCase() === m.toLowerCase())) setMotsCles([...motsCles, { mot: m, niveau: 'indispensable' }]);
    setSaisie('');
  };
  const surTouche = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); ajouter(saisie); }
    if (e.key === 'Backspace' && !saisie && motsCles.length) setMotsCles(motsCles.slice(0, -1));
  };
  const basculer = (mot: string) => setMotsCles(motsCles.map((m) => (m.mot === mot ? { ...m, niveau: m.niveau === 'indispensable' ? 'souhaitee' : 'indispensable' } : m)));
  const retirer = (mot: string) => setMotsCles(motsCles.filter((m) => m.mot !== mot));
  const rediger = () => setF({ ...f, description: brouillon(f.intitule, entreprise.data?.raisonSociale, f.ville, f.teletravail, indisp, souh) });

  // Repères : fourchettes des besoins précédents de l'entreprise qui partagent une compétence ou l'intitulé.
  const comparables = (missions.data ?? []).filter((m) => m.salaireMax && (
    (f.intitule.trim().length > 3 && m.intitule.toLowerCase().includes(f.intitule.trim().toLowerCase().split(' ')[0])) ||
    m.competencesRequises.some((c) => indisp.some((i) => i.toLowerCase() === c.toLowerCase()))));
  const bas = comparables.length ? Math.min(...comparables.map((m) => m.salaireMin ?? m.salaireMax!)) : undefined;
  const haut = comparables.length ? Math.max(...comparables.map((m) => m.salaireMax!)) : undefined;

  const envoyer = useMutation({
    mutationFn: async () => (await api.post<Mission>('/api/missions', {
      intitule: f.intitule, description: f.description || undefined, competencesRequises: indisp, competencesSouhaitees: souh,
      typeContrat: f.typeContrat, ville: f.ville || undefined, teletravail: f.teletravail, nbPostes: Number(f.nbPostes) || 1,
      experienceMin: f.experienceMin ? Number(f.experienceMin) : undefined,
      salaireMin: f.salaireMin ? Number(f.salaireMin) : undefined, salaireMax: f.salaireMax ? Number(f.salaireMax) : undefined,
      dateLimite: f.dateLimite || undefined, confidentiel,
    })).data,
    onSuccess: (m) => { setEnvoye(m); setF(vide); setMotsCles([]); setEtape(1); setConfidentiel(false); void qc.invalidateQueries({ queryKey: ['missions'] }); },
  });
  const soumettre = (e: FormEvent) => { e.preventDefault(); envoyer.mutate(); };
  const budgetOk = !f.salaireMin || !f.salaireMax || Number(f.salaireMin) <= Number(f.salaireMax);

  return (
    <>
      <TetePage titre={etape === 1 ? 'Décrivez le poste en quelques mots' : 'Conditions du poste'}
        sous={`Nouveau besoin · étape ${etape} sur 2. Votre recruteur le valide avec vous avant de lancer la recherche.`} />
      {envoye && (
        <div className="alert info" role="status">
          <b>« {envoye.intitule} » est envoyé.</b> Votre recruteur revient vers vous pour le valider. <Link to="/entreprise">Retour à mes recrutements</Link>
        </div>
      )}

      <div className="tableau-bord" style={{ gridTemplateColumns: 'minmax(0, 1fr) 380px' }}>
        <form className="bloc besoin" onSubmit={etape === 1 ? (e) => { e.preventDefault(); setEtape(2); } : soumettre}>
          <ol className="etapes-besoin" aria-label="Étapes">
            <li aria-current={etape === 1 ? 'step' : undefined}><button type="button" onClick={() => setEtape(1)}>1 · Le poste</button></li>
            <li aria-current={etape === 2 ? 'step' : undefined}><button type="button" disabled={!f.intitule.trim()} onClick={() => setEtape(2)}>2 · Les conditions</button></li>
          </ol>

          {etape === 1 && (
            <>
              <label className="field">Intitulé du poste
                <input required value={f.intitule} onChange={maj('intitule')} placeholder="Ex. : Développeur Java senior" />
              </label>

              <div className="field">
                <span id="mots-cles">Compétences recherchées</span>
                <div className="saisie-mots" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
                  {motsCles.map((m) => (
                    <span key={m.mot} className={`mot ${m.niveau}`}>
                      <button type="button" className="mot-libelle" onClick={() => basculer(m.mot)} title="Basculer indispensable / souhaitée">{m.mot}</button>
                      <button type="button" className="mot-retirer" aria-label={`Retirer ${m.mot}`} onClick={() => retirer(m.mot)}>×</button>
                    </span>
                  ))}
                  <input aria-labelledby="mots-cles" value={saisie} onChange={(e) => setSaisie(e.target.value)} onKeyDown={surTouche} onBlur={() => saisie && ajouter(saisie)}
                    placeholder={motsCles.length ? '+ ajouter' : 'Tapez une compétence puis Entrée'} />
                </div>
                <span className="aide">Cliquez sur une compétence pour la passer de <b>indispensable</b> (bleu) à <b>souhaitée</b> (contour).</span>
                <div className="filtres" aria-label="Suggestions">
                  {SUGGESTIONS.filter((s) => !motsCles.some((m) => m.mot === s)).slice(0, 6).map((s) => (
                    <button key={s} type="button" onClick={() => ajouter(s)}>+ {s}</button>
                  ))}
                </div>
              </div>

              <div className="proposition">
                <div className="ligne-entre">
                  <b className="moyen">Missions principales</b>
                  <button type="button" className="btn small" onClick={rediger} disabled={!f.intitule.trim() && motsCles.length === 0}>
                    <Icone nom="etincelle" taille={14} />{f.description ? 'Régénérer le brouillon' : 'Rédiger un brouillon'}
                  </button>
                </div>
                <label className="sr-only" htmlFor="description">Missions principales</label>
                <textarea id="description" rows={6} value={f.description} onChange={maj('description')}
                  placeholder="Décrivez le quotidien du poste, l'équipe, les projets. Le bouton « Rédiger un brouillon » propose un texte à partir de vos compétences, à modifier librement." />
                {(indisp.length > 0 || souh.length > 0) && (
                  <div className="deux-listes">
                    <div><span className="muted small">Indispensables</span><div className="tags">{indisp.map((x) => <span key={x} className="tag bleu">{x}</span>)}</div></div>
                    <div><span className="muted small">Souhaitées</span><div className="tags">{souh.length ? souh.map((x) => <span key={x} className="tag contour">{x}</span>) : <span className="muted small">—</span>}</div></div>
                  </div>
                )}
              </div>

              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn primary" disabled={!f.intitule.trim()}>Continuer <Icone nom="droite" taille={16} /></button>
              </div>
            </>
          )}

          {etape === 2 && (
            <>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <label className="field">Contrat<select value={f.typeContrat} onChange={maj('typeContrat')}><option>CDI</option><option>CDD</option><option>Freelance</option><option>Stage</option></select></label>
                <label className="field">Lieu<input value={f.ville} onChange={maj('ville')} placeholder="Casablanca" /></label>
                <label className="field">Mode de travail<select value={f.teletravail} onChange={maj('teletravail')}><option>Sur site</option><option>Hybride</option><option>Télétravail</option></select></label>
                <label className="field">Postes<input type="number" min={1} value={f.nbPostes} onChange={maj('nbPostes')} /></label>
                <label className="field">Expérience minimum (ans)<input type="number" min={0} value={f.experienceMin} onChange={maj('experienceMin')} /></label>
                <label className="field">Prise de poste souhaitée<input type="date" value={f.dateLimite} onChange={maj('dateLimite')} /></label>
              </div>
              <fieldset className="budget">
                <legend>Budget annuel brut (MAD)</legend>
                <div className="budget-champs">
                  <label><span className="sr-only">Minimum</span><input type="number" min={0} step={1000} placeholder="Min." value={f.salaireMin} onChange={maj('salaireMin')} /></label>
                  <div className="budget-piste" aria-hidden="true">
                    {f.salaireMin && f.salaireMax && budgetOk && <span style={pisteStyle(Number(f.salaireMin), Number(f.salaireMax))} />}
                  </div>
                  <label><span className="sr-only">Maximum</span><input type="number" min={0} step={1000} placeholder="Max." value={f.salaireMax} onChange={maj('salaireMax')} /></label>
                </div>
                {!budgetOk && <span className="aide" style={{ color: 'var(--bad)' }}>Le minimum dépasse le maximum.</span>}
              </fieldset>
              <div className="ligne-choix" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <span><b>Recrutement confidentiel</b><span>Votre recruteur ne cite pas le nom de votre entreprise aux candidats avant l'entretien.</span></span>
                <button type="button" role="switch" className="interrupteur" aria-checked={confidentiel} aria-label="Recrutement confidentiel" onClick={() => setConfidentiel((v) => !v)} />
              </div>
              {envoyer.error && <Erreur message={messageErreur(envoyer.error)} />}
              <div className="actions" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="lien-action" onClick={() => setEtape(1)}>← Revenir au poste</button>
                <button type="submit" className="btn primary" disabled={envoyer.isPending || !f.intitule.trim() || !budgetOk}>Envoyer à mon recruteur</button>
              </div>
            </>
          )}
        </form>

        <div className="colonne-droite">
          <section className="bloc reperes" aria-labelledby="reperes">
            <div className="bloc-tete"><h2 id="reperes">Repères de budget</h2>{comparables.length > 0 && <span className="etat-carte">{comparables.length} besoin(s) comparable(s)</span>}</div>
            <div className="bloc-corps">
              {bas != null && haut != null ? (
                <>
                  <div className="reperes-piste" aria-hidden="true"><span /></div>
                  <div className="ligne-entre small"><b>{n(bas)}</b><b>{n(haut)} MAD</b></div>
                  <p className="muted small" style={{ marginBottom: 0 }}>Fourchette de vos besoins précédents pour des postes proches.
                    {f.salaireMax && Number(f.salaireMax) < bas ? ' Votre budget est en dessous : la recherche risque d’être plus longue.' : ''}</p>
                </>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>Ajoutez l'intitulé et quelques compétences : nous comparons avec vos besoins précédents. Votre recruteur vous donnera aussi les salaires du marché lors de la validation.</p>
              )}
            </div>
          </section>

          <section className="bloc" aria-labelledby="mes-besoins">
            <div className="bloc-tete"><h2 id="mes-besoins">Mes besoins</h2></div>
            <div className="bloc-corps">
              {missions.data?.length === 0 && <p className="muted small" style={{ margin: 0 }}>Votre premier besoin apparaîtra ici.</p>}
              {missions.data?.slice(0, 6).map((m) => (
                <div key={m.id} className={`rdv ${m.statut === 'POURVUE' ? 'menthe' : ''}`}>
                  <span className="txt"><b>{m.intitule}</b></span>
                  <span className={`statut-texte ton-${toneMission(m.statut)}`}>{libelleStatutMission[m.statut]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/** Position de la fourchette sur une échelle de 0 à 2 fois le maximum. */
function pisteStyle(min: number, max: number) {
  const echelle = max * 1.6 || 1;
  return { left: `${(min / echelle) * 100}%`, width: `${Math.max(2, ((max - min) / echelle) * 100)}%` };
}
