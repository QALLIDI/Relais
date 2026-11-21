import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useTheme } from '../components/theme';
import { Icone } from '../components/ui';
import { Logo } from '../components/Logo';
import { gererCookies } from '../components/Cookies';
import { animerAccueil } from './accueilAnimations';
import './accueil.css';

type Public = 'entreprise' | 'candidat';

const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? '';

const ETAPES = [
  { titre: 'Vous décrivez le besoin', texte: 'Une fiche guidée : compétences indispensables et souhaitées, budget, mode de travail.', tags: ['Fiche guidée', '5 minutes'] },
  { titre: 'Nous présélectionnons', texte: 'Recherche dans notre vivier, critères vérifiés, test technique et références avant tout envoi.', tags: ['Test technique', 'Références'] },
  { titre: 'Vous comparez et rencontrez', texte: 'Une shortlist argumentée, un comparateur, et des entretiens planifiés en ligne avec rappels.', tags: ['Comparateur', 'Visio'], ton: 'lavande' },
  { titre: 'Vous recrutez, garanti', texte: 'Si la personne part pendant la période de garantie, nous relançons la recherche sans frais.', tags: ['Garantie', 'Sans frais'], ton: 'bleu' },
];

const FAQ = [
  ['En combien de temps recevons-nous des profils ?', 'Nous visons une shortlist de trois profils qualifiés sous 10 jours ouvrés après validation de votre besoin. Vous suivez l’avancement en direct dans votre espace.'],
  ['Comment les candidats sont-ils sélectionnés ?', 'Chaque profil est vérifié sur les critères de votre fiche (prétentions, ville, expérience, compétences), passe un test technique et fait l’objet d’au moins une prise de références, avec son accord.'],
  ['Que se passe-t-il si le candidat recruté part ?', 'Pendant la période de garantie prévue au contrat, nous relançons la recherche et vous présentons de nouveaux profils sans frais supplémentaires.'],
  ['Le service est-il payant pour les candidats ?', 'Non. Le service est entièrement gratuit pour les candidats : ce sont les entreprises qui rémunèrent le cabinet.'],
  ['Comment sont protégées les données personnelles ?', 'Vos données ne sont partagées avec une entreprise qu’avec votre accord. Depuis votre espace, vous pouvez modifier vos consentements, télécharger vos données ou supprimer votre profil à tout moment, conformément à la loi 09-08.'],
] as const;

/** Page d'accueil publique (maquette « Page d'accueil ») : présentation du service aux entreprises et aux candidats. */
export default function Accueil() {
  const auth = useAuth();
  const { theme, basculer } = useTheme();
  const [pour, setPour] = useState<Public>('entreprise');
  const racine = useRef<HTMLDivElement>(null);

  // Animations GSAP chargées à la demande ; si le chargement échoue, la page reste simplement statique.
  useEffect(() => {
    const controle = new AbortController();
    let arreter: (() => void) | undefined;
    if (racine.current) {
      animerAccueil(racine.current, controle.signal)
        .then((f) => { arreter = f; })
        .catch(() => { /* page statique */ });
    }
    return () => { controle.abort(); arreter?.(); };
  }, []);
  const connexion = () => void auth.signinRedirect();
  const inscription = (type: Public) => window.location.assign(`/inscription?type=${type === 'entreprise' ? 'ENTREPRISE' : 'CANDIDAT'}`);

  return (
    <div className="accueil" ref={racine}>
      <a href="#contenu" className="evitement">Aller au contenu</a>
      <header className="acc-entete">
        <a href="/" className="acc-marque" aria-label="Relais, accueil">
          <Logo taille={28} />
          <b>Relais</b>
        </a>
        <nav className="acc-nav" aria-label="Sections">
          <a href="#etapes">Comment ça marche</a>
          <a href="#entreprises">Entreprises</a>
          <a href="#candidats">Candidats</a>
          <a href="#formules">Formules</a>
          <a href="#questions">Questions</a>
        </nav>
        <div className="acc-outils">
          <button type="button" className="acc-rond" onClick={basculer} aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}>
            <Icone nom={theme === 'dark' ? 'soleil' : 'lune'} taille={18} />
          </button>
          <button type="button" className="acc-btn" onClick={connexion}>Se connecter</button>
          <button type="button" className="acc-btn plein" onClick={() => inscription(pour)}>Créer un compte</button>
        </div>
      </header>

      <main id="contenu">
        <section className="acc-hero">
          <div className="acc-hero-texte">
            <div className="acc-bascule" role="group" aria-label="Vous êtes">
              <button type="button" aria-pressed={pour === 'entreprise'} onClick={() => setPour('entreprise')}>Je recrute</button>
              <button type="button" aria-pressed={pour === 'candidat'} onClick={() => setPour('candidat')}>Je cherche un poste</button>
            </div>
            {pour === 'entreprise' ? (
              <div key="entreprise" className="acc-bascule-contenu">
                <h1><span>Les bons profils,</span> <span className="accent">déjà présélectionnés.</span></h1>
                <p className="acc-chapeau">Nous trouvons, qualifions et testons les candidats pour vous. Vous ne rencontrez que ceux qui correspondent vraiment, et vous suivez tout depuis votre espace.</p>
                <div className="acc-actions">
                  <button type="button" className="acc-btn plein grand" onClick={() => inscription('entreprise')}>Publier un besoin <Icone nom="droite" taille={16} /></button>
                  <a className="acc-btn grand" href="#etapes">Voir comment ça marche</a>
                </div>
                <div className="acc-chiffres">
                  <div><b><span data-compte="10">10</span> jours</b><span>notre objectif pour une shortlist</span></div>
                  <div><b><span data-compte="3">3</span> profils</b><span>argumentés et testés par poste</span></div>
                  <div><b>Garantie</b><span>de remplacement incluse</span></div>
                </div>
              </div>
            ) : (
              <div key="candidat" className="acc-bascule-contenu">
                <h1><span>Un profil,</span> <span className="accent">et les bonnes offres viennent à vous.</span></h1>
                <p className="acc-chapeau">Créez votre profil une fois. Votre recruteur vous propose les postes qui vous correspondent, vous prépare aux entretiens et vous répond toujours.</p>
                <div className="acc-actions">
                  <button type="button" className="acc-btn plein grand" onClick={() => inscription('candidat')}>Créer mon profil <Icone nom="droite" taille={16} /></button>
                  <a className="acc-btn grand" href="#candidats">Ce que vous y gagnez</a>
                </div>
                <div className="acc-chiffres">
                  <div><b>Gratuit</b><span>pour les candidats, toujours</span></div>
                  <div><b>Suivi</b><span>de chaque candidature, en direct</span></div>
                  <div><b>Vos données</b><span>protégées, loi 09-08</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="acc-visuel" aria-hidden="true">
            <div className="acc-carte shortlist">
              <div className="ligne"><span><small>Shortlist · Atlas Digital</small><b>Développeur Java senior</b></span><em className="acc-pastille vert">3 profils</em></div>
              {[['YB', 'Yassine B.', 'Java · 7 ans · Casablanca', 92], ['RM', 'Rania M.', 'Java · 6 ans · Mohammedia', 88], ['MS', 'Mehdi S.', 'Back-end · 5 ans · Rabat', 79]].map(([i, n, d, s]) => (
                <div key={i as string} className="profil">
                  <span className="av">{i}</span><span className="t"><b>{n}</b><small>{d}</small></span>
                  <span className="score"><b><span data-compte={s}>{s}</span> %</b><i><i style={{ width: `${s}%` }} /></i></span>
                </div>
              ))}
            </div>
            <div className="acc-carte entretien"><em className="acc-pastille bleu">Entretien confirmé</em><b>Ven. 23 oct. · 11:00</b><small>Visio · invitation envoyée à tous</small></div>
            <div className="acc-carte verif">
              <small>Profil vérifié avant envoi</small>
              {['Critères : 5 / 5', 'Test technique : 82 / 100', 'Référence reçue'].map((x) => <span key={x}><i>✓</i>{x}</span>)}
            </div>
          </div>
        </section>

        <div className="acc-bandeau" aria-label="Métiers">
          <span className="muted">Nous recrutons</span>
          {['Développeurs Java & React', 'Data & IA', 'DevOps & cloud', 'Chefs de projet', 'Finance & banque', 'Commerciaux B2B'].map((m) => <span key={m}>{m}</span>)}
        </div>

        <section id="etapes" className="acc-section">
          <div className="acc-titre-section">
            <div><p className="surtitre">Comment ça marche</p><h2>Du besoin à l'embauche, en quatre étapes.</h2></div>
            <p>Un seul interlocuteur, un espace partagé. Vous ne rencontrez que des profils qualifiés, testés et disponibles.</p>
          </div>
          <ol className="acc-etapes">
            {ETAPES.map((e, i) => (
              <li key={e.titre} className={e.ton ?? ''}>
                <span className="num">{i + 1}</span>
                <h3>{e.titre}</h3>
                <p>{e.texte}</p>
                <span className="tags">{e.tags.map((t) => <span key={t}>{t}</span>)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="acc-deux">
          <article id="entreprises" className="acc-public bleu">
            <em className="acc-pastille plein">Pour les entreprises</em>
            <h2>Recrutez sans passer vos journées à trier des CV.</h2>
            <ul>
              <li><b>Shortlist sous 10 jours.</b> Trois profils qualifiés, pas une pile de CV.</li>
              <li><b>Chaque profil est argumenté.</b> Note du recruteur, points forts, points de vigilance.</li>
              <li><b>Testé et vérifié.</b> Critères, test technique et références avant envoi.</li>
              <li><b>Entretiens planifiés pour vous.</b> Créneaux, invitation, lien visio et rappels.</li>
              <li><b>Garantie de remplacement.</b> Un départ pendant la garantie ? On recommence, sans frais.</li>
            </ul>
            <button type="button" className="acc-btn" onClick={() => inscription('entreprise')}>Publier un besoin</button>
          </article>
          <article id="candidats" className="acc-public lavande">
            <em className="acc-pastille">Pour les candidats</em>
            <h2>Un profil, et les bonnes offres viennent à vous.</h2>
            <ul>
              <li><b>Un profil complet en quelques minutes.</b> Vos expériences, vos compétences, votre CV.</li>
              <li><b>Des postes qui vous correspondent.</b> Selon vos compétences, votre ville et votre disponibilité.</li>
              <li><b>Suivi de chaque candidature.</b> Vous savez toujours où vous en êtes.</li>
              <li><b>Toujours une réponse.</b> Même en cas de refus, avec un mot de votre recruteur.</li>
              <li><b>Gratuit, et vos données protégées.</b> Conformément à la loi 09-08.</li>
            </ul>
            <button type="button" className="acc-btn plein" onClick={() => inscription('candidat')}>Créer mon profil</button>
          </article>
        </section>

        <section className="acc-section">
          <p className="surtitre">La plateforme</p>
          <h2>Tout le recrutement, au même endroit.</h2>
          <div className="acc-grille">
            <article className="acc-tuile large">
              <h3>Comparez les profils côte à côte</h3>
              <p>Note du recruteur, test, références, prétentions : chaque shortlist est argumentée, pour décider vite.</p>
              <div className="acc-tableau" aria-hidden="true">
                {[['Matching', '92 %', '88 %', '79 %'], ['Test', '82', '87', '71'], ['Prétentions', '250 k', '240 k', '220 k'], ['Dispo', '1 mois', '1 mois', 'Immédiate']].map(([l, ...v], r) => (
                  <div key={l}><span>{l}</span>{v.map((x, c) => <b key={c} className={[0, 1, 2, 2][r] === c ? 'top' : ''}>{x}</b>)}</div>
                ))}
              </div>
            </article>
            <article className="acc-tuile">
              <h3>Entretiens planifiés en ligne</h3>
              <p>Le candidat choisit son créneau, l'invitation et le lien visio partent tout seuls, les rappels aussi.</p>
              <div className="acc-creneaux" aria-hidden="true"><span>Jeu. 10:00</span><span className="on">Ven. 11:00</span><span>Lun. 15:00</span></div>
            </article>
            <article className="acc-tuile">
              <h3>Suivi en temps réel</h3>
              <p>Entreprise comme candidat, chacun voit où en est le recrutement, sans relancer personne.</p>
              <div className="acc-progres" aria-hidden="true">{[1, 1, 1, 1, 0].map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</div>
            </article>
            <article className="acc-tuile">
              <h3>Matching des profils</h3>
              <p>Compétences, expérience, ville et disponibilité : chaque profil reçoit un score face à votre besoin.</p>
              <p className="acc-gros"><b>92 %</b> de correspondance</p>
            </article>
            <article className="acc-tuile bleu">
              <h3>Votre bilan, chiffré</h3>
              <p>Délai de recrutement, profils présentés, taux de transformation : vous voyez ce que la prestation vous apporte.</p>
            </article>
          </div>
        </section>

        <section id="formules" className="acc-section acc-centre">
          <p className="surtitre">Formules</p>
          <h2>Payez comme vous recrutez.</h2>
          <p className="acc-intro">Toutes les formules incluent la présélection complète et la garantie de remplacement. Prix hors taxes, détaillés dans la proposition que vous acceptez en ligne.</p>
          <div className="acc-formules">
            {[
              { t: 'Au succès', s: 'Un pourcentage du salaire annuel', d: 'Vous ne payez qu’à l’embauche. Idéal pour un premier recrutement.', l: ['Présélection complète', 'Facturation à l’embauche', 'Garantie de remplacement'] },
              { t: 'Forfait', s: 'Un prix fixe par poste', d: 'Simple à budgéter, quel que soit le salaire. Un acompte au lancement, le solde à l’embauche.', l: ['Présélection complète', 'Budget connu d’avance', 'Garantie de remplacement'], mis: true },
              { t: 'Abonnement', s: 'Un montant mensuel', d: 'Plusieurs postes ouverts en même temps, sans frais au placement. Pour les équipes qui grandissent.', l: ['Plusieurs missions en parallèle', 'Aucun frais au placement', 'Bilan mensuel chiffré'] },
            ].map((f) => (
              <article key={f.t} className={`acc-formule ${f.mis ? 'mise' : ''}`}>
                <div className="ligne"><h3>{f.t}</h3>{f.mis && <em className="acc-pastille plein">Le plus choisi</em>}</div>
                <p className="sous">{f.s}</p>
                <p>{f.d}</p>
                <ul>{f.l.map((x) => <li key={x}>{x}</li>)}</ul>
                <button type="button" className={`acc-btn ${f.mis ? '' : 'plein'}`} onClick={() => inscription('entreprise')}>Demander une proposition</button>
              </article>
            ))}
          </div>
        </section>

        <section id="questions" className="acc-section acc-faq">
          <div><p className="surtitre">Questions</p><h2>Ce qu'on nous demande souvent.</h2></div>
          <div className="acc-questions">
            {FAQ.map(([q, r], i) => (
              <details key={q} open={i === 0}>
                <summary>{q}<span aria-hidden="true" /></summary>
                <p>{r}</p>
              </details>
            ))}
          </div>
        </section>

        <Contact />
      </main>

      <footer className="acc-pied">
        <div className="ligne"><span className="acc-marque petit"><b>Relais</b></span><span className="muted">Cabinet de présélection, Casablanca</span></div>
        <nav aria-label="Liens"><a href="#etapes">Comment ça marche</a><a href="#formules">Formules</a><a href="#questions">Questions</a>
          <button type="button" onClick={connexion}>Se connecter</button></nav>
        <nav aria-label="Informations légales" className="acc-legal">
          <a href="/mentions-legales">Mentions légales</a><a href="/confidentialite">Confidentialité</a><a href="/cgu">CGU</a>
          <a href="/conditions-commerciales">Conditions commerciales</a><a href="/cookies">Cookies</a>
          <button type="button" onClick={gererCookies}>Gérer les cookies</button>
        </nav>
      </footer>
    </div>
  );
}

/**
 * Appel à l'action final. Si une adresse de contact est configurée (VITE_CONTACT_EMAIL), le formulaire
 * prépare un e-mail au cabinet ; sinon, il propose directement de créer un compte.
 */
function Contact() {
  const [f, setF] = useState({ entreprise: '', email: '', poste: '', accord: false });
  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    const corps = `Entreprise : ${f.entreprise}\nE-mail : ${f.email}\nPoste à pourvoir : ${f.poste}\n\nMerci de me recontacter au sujet de ce besoin.`;
    window.location.href = `mailto:${CONTACT}?subject=${encodeURIComponent(`Besoin de recrutement : ${f.poste || f.entreprise}`)}&body=${encodeURIComponent(corps)}`;
  };
  return (
    <section className="acc-contact" aria-labelledby="contact">
      <div>
        <h2 id="contact">Votre prochain recrutement commence ici.</h2>
        <p>Décrivez votre besoin en quelques minutes. Nous visons une réponse sous 24 h ouvrées.</p>
      </div>
      {CONTACT ? (
        <form onSubmit={soumettre}>
          <label>Entreprise<input required value={f.entreprise} onChange={(e) => setF({ ...f, entreprise: e.target.value })} placeholder="Nom de l'entreprise" /></label>
          <label>E-mail professionnel<input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="vous@entreprise.ma" /></label>
          <label>Poste à pourvoir<input value={f.poste} onChange={(e) => setF({ ...f, poste: e.target.value })} placeholder="Ex. : développeur Java senior" /></label>
          <label className="accord"><input type="checkbox" required checked={f.accord} onChange={(e) => setF({ ...f, accord: e.target.checked })} />J'accepte que Relais utilise ces informations pour me recontacter au sujet de mon besoin.</label>
          <button type="submit" className="acc-btn plein grand">Être rappelé</button>
        </form>
      ) : (
        <div className="acc-contact-actions">
          <b>Créez votre espace entreprise</b>
          <p>Votre recruteur valide votre compte, puis vous décrivez votre premier besoin.</p>
          <a className="acc-btn plein grand" href="/inscription?type=ENTREPRISE">Créer mon espace entreprise</a>
          <a className="acc-btn grand" href="/inscription?type=CANDIDAT">Je suis candidat</a>
        </div>
      )}
    </section>
  );
}
