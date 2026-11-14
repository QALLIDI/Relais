import { type ClipboardEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { messageErreur } from '../api/client';
import { estExpiree, inscription, reessayerDans, type EtatInscription, type TypeCompte } from '../api/inscription';
import { useTheme } from '../components/theme';
import { Icone } from '../components/ui';
import './inscription.css';
import { Logo } from '../components/Logo';

/**
 * Inscription publique en 5 étapes (maquette « EmberSignup ») : type de compte et e-mail, téléphone
 * et mot de passe, code SMS, e-mail d'activation, compte activé. L'identifiant de l'inscription est
 * gardé dans l'URL (?id=…) : le lien de l'e-mail d'activation ramène ici, à l'étape 5.
 */

const ETAPES: [string, string][] = [
  ['Type de compte et e-mail', 'Candidat ou entreprise'],
  ['Téléphone et mot de passe', 'Sécurisation du compte'],
  ['Code SMS', 'Vérification du numéro'],
  ["E-mail d'activation", 'Lien valable 24 h'],
  ['Compte activé', 'Accès à votre espace'],
];

const PAYS = [
  { code: '212', nom: 'Maroc' },
  { code: '33', nom: 'France' },
  { code: '32', nom: 'Belgique' },
  { code: '41', nom: 'Suisse' },
  { code: '34', nom: 'Espagne' },
  { code: '213', nom: 'Algérie' },
  { code: '216', nom: 'Tunisie' },
  { code: '221', nom: 'Sénégal' },
  { code: '1', nom: 'Canada / États-Unis' },
];

function lireId(): string | null {
  return new URLSearchParams(window.location.search).get('id');
}

function ecrireId(id: string | null) {
  const url = id ? `/inscription?id=${encodeURIComponent(id)}` : '/inscription';
  window.history.replaceState({}, document.title, url);
}

/** Compte à rebours en secondes, relancé à chaque nouvelle valeur. */
function useCompteARebours(initial: number) {
  const [reste, setReste] = useState(initial);
  useEffect(() => {
    if (reste <= 0) return;
    const t = window.setTimeout(() => setReste((r) => r - 1), 1000);
    return () => window.clearTimeout(t);
  }, [reste]);
  return [reste, setReste] as const;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Inscription() {
  const auth = useAuth();
  const { theme, basculer } = useTheme();
  const [etat, setEtat] = useState<EtatInscription | null>(null);
  const [etape, setEtape] = useState(1);
  // Type pré-choisi depuis la page d'accueil (?type=ENTREPRISE ou ?type=CANDIDAT).
  const [type, setType] = useState<TypeCompte>(() => (new URLSearchParams(window.location.search).get('type') === 'ENTREPRISE' ? 'ENTREPRISE' : 'CANDIDAT'));
  const [chargement, setChargement] = useState(() => lireId() !== null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Reprise d'une inscription en cours (rechargement, retour depuis l'e-mail d'activation).
  useEffect(() => {
    const id = lireId();
    if (!id) return;
    inscription
      .etat(id)
      .then((e) => {
        setEtat(e);
        setType(e.type);
        setEtape(e.etape);
      })
      .catch((e) => {
        ecrireId(null);
        setErreur(estExpiree(e) ? 'Cette inscription a expiré. Recommencez votre inscription.' : messageErreur(e));
      })
      .finally(() => setChargement(false));
  }, []);

  const avancer = (e: EtatInscription) => {
    setErreur(null);
    setEtat(e);
    setEtape(e.etape);
    ecrireId(e.id);
  };

  const echec = (e: unknown) => {
    if (estExpiree(e)) {
      ecrireId(null);
      setEtat(null);
      setEtape(1);
      setErreur('Cette inscription a expiré. Recommencez votre inscription.');
      return;
    }
    setErreur(messageErreur(e));
  };

  const entreprise = type === 'ENTREPRISE';
  const sombre = theme === 'dark';

  return (
    <div className="signup">
      <aside className="signup-aside">
        <div className="brand">
          <Logo taille={24} />
          Recrut
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>Créez votre compte en 2 minutes.</h1>
          <p>
            {entreprise
              ? 'Exprimez vos besoins, recevez des profils pré-sélectionnés et suivez vos recrutements.'
              : 'Déposez votre profil une fois, et soyez présenté aux entreprises qui vous correspondent.'}
          </p>
        </div>
        <ol className="signup-etapes" aria-label="Étapes de l'inscription">
          {ETAPES.map(([lib, sub], i) => {
            const n = i + 1;
            const classe = n < etape ? 'fait' : n === etape ? 'cur' : '';
            return (
              <li key={lib} className={classe} aria-current={n === etape ? 'step' : undefined}>
                <span className="rond" aria-hidden="true">{n < etape ? '✓' : n}</span>
                <span>
                  <span className="lib">{lib}</span>
                  <span className="sub">{sub}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </aside>

      <main className="signup-main">
        <div className="signup-top">
          <span className="pill-etape">Étape {etape} sur 5</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="muted">
              Déjà inscrit ?{' '}
              <button type="button" className="lien" style={{ color: 'var(--ink)' }} onClick={() => auth.signinRedirect()}>
                Se connecter
              </button>
            </span>
            <button type="button" className="ico" onClick={basculer} aria-pressed={sombre} aria-label="Mode sombre"
              title={sombre ? 'Passer en mode clair' : 'Passer en mode sombre'}>
              <Icone nom={sombre ? 'soleil' : 'lune'} />
            </button>
          </span>
        </div>

        <div className="signup-centre">
          <div className="signup-form" aria-live="polite">
            {erreur && <div className="alert error" role="alert">{erreur}</div>}
            {chargement ? (
              <p className="muted">Chargement…</p>
            ) : etape === 1 ? (
              <EtapeType type={type} setType={setType} onOk={avancer} onErreur={echec} />
            ) : etape === 2 && etat ? (
              <EtapeCompte etat={etat} onOk={avancer} onErreur={echec} onRetour={() => { setErreur(null); setEtape(1); }} />
            ) : etape === 3 && etat ? (
              <EtapeCode etat={etat} onOk={avancer} onErreur={echec} onModifier={() => { setErreur(null); setEtape(2); }} />
            ) : etape === 4 && etat ? (
              <EtapeEmail etat={etat} onOk={avancer} onErreur={echec} />
            ) : etat ? (
              <EtapeActive etat={etat} />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

type Props = { onOk: (e: EtatInscription) => void; onErreur: (e: unknown) => void };

function EtapeType({ type, setType, onOk, onErreur }: Props & { type: TypeCompte; setType: (t: TypeCompte) => void }) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const entreprise = type === 'ENTREPRISE';

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    setEnvoi(true);
    try {
      onOk(await inscription.commencer({ type, email, prenom, nom, raisonSociale: entreprise ? raisonSociale : undefined }));
    } catch (e) {
      onErreur(e);
    } finally {
      setEnvoi(false);
    }
  };

  const choix = (t: TypeCompte, titre: string, sous: string, icone: 'profil' | 'immeuble') => (
    <button type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}>
      <span className="choix-icone" aria-hidden="true"><Icone nom={icone} taille={20} /></span>
      <span className="t">{titre}</span>
      <span className="s">{sous}</span>
    </button>
  );

  return (
    <form className="stack" style={{ gap: 18 }} onSubmit={envoyer}>
      <div>
        <h2>Vous êtes…</h2>
        <p className="intro">Choisissez le type de compte, puis saisissez votre e-mail.</p>
      </div>
      <div role="radiogroup" aria-label="Type de compte" className="choix-type">
        {choix('CANDIDAT', 'Candidat', 'Je cherche un poste', 'profil')}
        {choix('ENTREPRISE', 'Entreprise', 'Je recrute', 'immeuble')}
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <label className="field">Prénom<input required autoComplete="given-name" maxLength={100} value={prenom} onChange={(e) => setPrenom(e.target.value)} /></label>
        <label className="field">Nom<input required autoComplete="family-name" maxLength={100} value={nom} onChange={(e) => setNom(e.target.value)} /></label>
      </div>
      {entreprise && (
        <label className="field">Raison sociale<input required autoComplete="organization" maxLength={255} value={raisonSociale} onChange={(e) => setRaisonSociale(e.target.value)} /></label>
      )}
      <label className="field">Adresse e-mail<input type="email" required autoComplete="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <button type="submit" className="btn primary bloc" disabled={envoi}>{envoi ? 'Vérification…' : 'Continuer'}</button>
      <p className="legal">En continuant, vous acceptez les conditions d'utilisation et la politique de protection des données (loi 09-08).</p>
    </form>
  );
}

const REGLES: { lib: string; test: (m: string) => boolean; requise: boolean }[] = [
  { lib: '8 caractères minimum', test: (m) => m.length >= 8, requise: true },
  { lib: 'Une majuscule ou un chiffre', test: (m) => /[A-Z0-9]/.test(m), requise: true },
  { lib: 'Un caractère spécial', test: (m) => /[^A-Za-z0-9]/.test(m), requise: true },
  { lib: '12 caractères conseillés', test: (m) => m.length >= 12, requise: false },
];

function EtapeCompte({ etat, onOk, onErreur, onRetour }: Props & { etat: EtatInscription; onRetour: () => void }) {
  const [pays, setPays] = useState('212');
  const [numero, setNumero] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const valides = REGLES.map((r) => r.test(motDePasse));
  const force = valides.filter(Boolean).length;
  const conforme = REGLES.every((r, i) => !r.requise || valides[i]);

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!conforme) return setMessage("Le mot de passe ne respecte pas encore toutes les règles.");
    if (motDePasse !== confirmation) return setMessage('Les deux mots de passe ne correspondent pas.');
    setMessage(null);
    setEnvoi(true);
    // Numéro national saisi avec ou sans le 0 initial : « 06 12 34 56 78 » ou « 6 12 34 56 78 ».
    const national = numero.replace(/[^\d]/g, '').replace(/^0/, '');
    const telephone = numero.trim().startsWith('+') ? numero.replace(/[^\d+]/g, '') : `+${pays}${national}`;
    try {
      onOk(await inscription.compte(etat.id, { telephone, motDePasse }));
    } catch (e) {
      const attente = reessayerDans(e);
      onErreur(e);
      if (attente) setMessage(`Nouvel essai possible dans ${mmss(attente)}.`);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={envoyer}>
      <div>
        <h2>Sécurisez votre compte</h2>
        <p className="intro">Nous vous enverrons un code par SMS pour vérifier votre numéro.</p>
      </div>
      <div className="field">
        <span id="tel-label">Numéro de téléphone</span>
        <div className="tel">
          <select aria-label="Indicatif du pays" value={pays} onChange={(e) => setPays(e.target.value)}>
            {PAYS.map((p) => <option key={p.code} value={p.code}>{p.nom} +{p.code}</option>)}
          </select>
          <input type="tel" required inputMode="tel" autoComplete="tel-national" aria-labelledby="tel-label"
            placeholder="6 12 34 56 78" value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
      </div>
      <label className="field">Mot de passe
        <input type="password" required autoComplete="new-password" maxLength={128} value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)} aria-describedby="regles-mdp" />
      </label>
      <div>
        <div className="force" role="img" aria-label={`Robustesse du mot de passe : ${['très faible', 'faible', 'moyenne', 'bonne', 'excellente'][force]}`}>
          {REGLES.map((r, i) => <span key={r.lib} className={i < force ? 'on' : ''} />)}
        </div>
        <ul className="regles" id="regles-mdp">
          {REGLES.map((r, i) => <li key={r.lib} className={valides[i] ? 'ok' : ''}>{valides[i] ? '✓' : '○'} {r.lib}</li>)}
        </ul>
      </div>
      <label className="field">Confirmer le mot de passe
        <input type="password" required autoComplete="new-password" maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      </label>
      {message && <div className="alert info">{message}</div>}
      <button type="submit" className="btn primary bloc" disabled={envoi}>{envoi ? 'Envoi du code…' : 'Recevoir le code par SMS'}</button>
      <button type="button" className="lien" onClick={onRetour}>Retour</button>
    </form>
  );
}

function EtapeCode({ etat, onOk, onErreur, onModifier }: Props & { etat: EtatInscription; onModifier: () => void }) {
  const [chiffres, setChiffres] = useState<string[]>(Array(6).fill(''));
  const [envoi, setEnvoi] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [reste, setReste] = useCompteARebours(etat.renvoiDans);
  const champs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => champs.current[0]?.focus(), []);

  const verifier = async (code: string) => {
    setEnvoi(true);
    setInfo(null);
    try {
      onOk(await inscription.verifierCode(etat.id, code));
    } catch (e) {
      onErreur(e);
      setChiffres(Array(6).fill(''));
      champs.current[0]?.focus();
    } finally {
      setEnvoi(false);
    }
  };

  const remplir = (depuis: number, saisie: string) => {
    const nouveaux = [...chiffres];
    const valeurs = saisie.replace(/\D/g, '').slice(0, 6 - depuis).split('');
    if (valeurs.length === 0) {
      nouveaux[depuis] = '';
      setChiffres(nouveaux);
      return;
    }
    valeurs.forEach((c, i) => { nouveaux[depuis + i] = c; });
    setChiffres(nouveaux);
    const suivant = Math.min(depuis + valeurs.length, 5);
    champs.current[suivant]?.focus();
    if (nouveaux.every((c) => c !== '') && !envoi) void verifier(nouveaux.join(''));
  };

  const touche = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chiffres[i] && i > 0) champs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) champs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) champs.current[i + 1]?.focus();
  };

  const coller = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    remplir(i, e.clipboardData.getData('text'));
  };

  const renvoyer = async () => {
    try {
      const e = await inscription.renvoyerCode(etat.id);
      setReste(e.renvoiDans);
      setInfo('Un nouveau code vient de vous être envoyé.');
    } catch (e) {
      const attente = reessayerDans(e);
      if (attente) setReste(attente);
      onErreur(e);
    }
  };

  const complet = chiffres.every((c) => c !== '');

  return (
    <form className="stack" style={{ gap: 18 }} onSubmit={(e) => { e.preventDefault(); if (complet) void verifier(chiffres.join('')); }}>
      <span className="pastille" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></svg>
      </span>
      <div>
        <h2>Code de vérification</h2>
        <p className="intro">Saisissez le code à 6 chiffres envoyé au <b style={{ color: 'var(--ink)' }}>{etat.telephoneMasque}</b>.</p>
      </div>
      <div role="group" aria-label="Code à 6 chiffres" className="otp">
        {chiffres.map((c, i) => (
          <input key={i} ref={(el) => { champs.current[i] = el; }} aria-label={`Chiffre ${i + 1}`} inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? 6 : 1} value={c} disabled={envoi}
            onChange={(e) => remplir(i, e.target.value)} onKeyDown={(e) => touche(i, e)} onPaste={(e) => coller(i, e)} />
        ))}
      </div>
      <div className="otp-bas">
        {reste > 0 ? (
          <span>Renvoyer le code dans <b style={{ color: 'var(--ink)' }}>{mmss(reste)}</b></span>
        ) : (
          <button type="button" className="lien accent" onClick={renvoyer}>Renvoyer le code</button>
        )}
        <button type="button" className="lien" onClick={onModifier}>Modifier le numéro</button>
      </div>
      {info && <div className="alert info">{info}</div>}
      <button type="submit" className="btn primary bloc" disabled={!complet || envoi}>{envoi ? 'Vérification…' : 'Vérifier'}</button>
      <p className="muted small" style={{ margin: 0 }}>Le code expire au bout de 10 minutes. Après 5 essais erronés, un nouveau code est nécessaire.</p>
    </form>
  );
}

function EtapeEmail({ etat, onOk, onErreur }: Props & { etat: EtatInscription }) {
  const [reste, setReste] = useCompteARebours(etat.renvoiDans);
  const [info, setInfo] = useState<string | null>(null);

  // Le clic sur le lien se fait souvent dans un autre onglet : l'état est relu toutes les 5 s.
  useEffect(() => {
    const t = window.setInterval(() => {
      inscription.etat(etat.id).then((e) => { if (e.etape === 5) onOk(e); }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(t);
  }, [etat.id, onOk]);

  const verifier = async () => {
    try {
      const e = await inscription.etat(etat.id);
      if (e.etape === 5) onOk(e);
      else setInfo("Votre adresse n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail.");
    } catch (e) {
      onErreur(e);
    }
  };

  const renvoyer = async () => {
    try {
      const e = await inscription.renvoyerEmail(etat.id);
      if (e.etape === 5) return onOk(e);
      setReste(e.renvoiDans);
      setInfo("L'e-mail d'activation vient de vous être renvoyé.");
    } catch (e) {
      const attente = reessayerDans(e);
      if (attente) setReste(attente);
      onErreur(e);
    }
  };

  return (
    <div className="stack centre-txt" style={{ gap: 18 }}>
      <div className="boite" aria-hidden="true">
        <span className="fond">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 7l9 6 9-6" /></svg>
        </span>
        <span className="num">1</span>
      </div>
      <div>
        <h2>Vérifiez votre boîte mail</h2>
        <p className="intro">Numéro vérifié. Nous avons envoyé un lien d'activation à<br /><b style={{ color: 'var(--ink)' }}>{etat.email}</b></p>
      </div>
      <div className="encart">
        Le lien est valable <b>24 heures</b>. Rien reçu ? Vérifiez les courriers indésirables ou{' '}
        {reste > 0 ? (
          <span>renvoyez l'e-mail dans {mmss(reste)}</span>
        ) : (
          <button type="button" className="lien accent" style={{ padding: 0 }} onClick={renvoyer}>renvoyez l'e-mail</button>
        )}.
      </div>
      {info && <div className="alert info" style={{ width: '100%' }}>{info}</div>}
      <button type="button" className="btn primary bloc" onClick={verifier}>J'ai cliqué sur le lien</button>
    </div>
  );
}

function EtapeActive({ etat }: { etat: EtatInscription }) {
  const auth = useAuth();
  const entreprise = etat.type === 'ENTREPRISE';
  const connecter = () => {
    // Le candidat arrive directement sur son profil, à compléter depuis son CV.
    void auth.signinRedirect({
      login_hint: etat.email,
      ...(entreprise ? {} : { redirect_uri: window.location.origin + '/candidat/profil' }),
    });
  };
  return (
    <div className="stack centre-txt" style={{ gap: 18 }}>
      <span className="coche" aria-hidden="true">
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12l5 5 9-10" /></svg>
      </span>
      <div>
        <h2>Compte activé</h2>
        <p className="intro">
          {entreprise
            ? 'Votre compte entreprise est prêt. Votre recruteur le rattachera à votre société.'
            : "Votre compte est prêt. Il ne reste qu'à compléter votre profil à partir de votre CV."}
        </p>
      </div>
      <button type="button" className="btn primary bloc" onClick={connecter}>
        {entreprise ? 'Accéder à mon espace' : 'Compléter mon profil'}
      </button>
    </div>
  );
}
