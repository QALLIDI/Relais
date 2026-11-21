import { Fragment, type ReactNode, useEffect } from 'react';
import { Logo } from '../../components/Logo';
import { gererCookies } from '../../components/Cookies';
import { PAGES_LEGALES, pageLegale, type Bloc } from './contenus';
import './legal.css';

/** Texte enrichi : **gras**, et [passages à compléter] surlignés (crochets imbriqués compris). */
function enrichir(texte: string): ReactNode[] {
  const morceaux: ReactNode[] = [];
  let i = 0;
  let tampon = '';
  const pousser = () => {
    if (!tampon) return;
    tampon.split(/(\*\*[^*]+\*\*)/g).forEach((p, k) => {
      if (!p) return;
      morceaux.push(p.startsWith('**') ? <strong key={`${morceaux.length}-${k}`}>{p.slice(2, -2)}</strong> : <Fragment key={`${morceaux.length}-${k}`}>{p}</Fragment>);
    });
    tampon = '';
  };
  while (i < texte.length) {
    if (texte[i] === '[') {
      let profondeur = 0;
      let j = i;
      for (; j < texte.length; j++) {
        if (texte[j] === '[') profondeur++;
        if (texte[j] === ']' && --profondeur === 0) break;
      }
      pousser();
      morceaux.push(<mark key={`m${i}`} className="leg-a-completer" title="À compléter avant publication">{texte.slice(i, j + 1)}</mark>);
      i = j + 1;
    } else {
      tampon += texte[i++];
    }
  }
  pousser();
  return morceaux;
}

function rendu(b: Bloc, k: number) {
  switch (b.t) {
    case 'p': return <p key={k}>{enrichir(b.x)}</p>;
    case 'note': return <p key={k} className="leg-note">{enrichir(b.x)}</p>;
    case 'h': return <h2 key={k}>{b.x}</h2>;
    case 'ul': return <ul key={k}>{b.items.map((it, n) => <li key={n}>{enrichir(it)}</li>)}</ul>;
    case 'table':
      return (
        <div key={k} className="leg-table">
          <table>
            <thead><tr>{b.tete.map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{b.lignes.map((l, n) => <tr key={n}>{l.map((c, m) => <td key={m}>{enrichir(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
  }
}

/** Pages légales publiques (/mentions-legales, /confidentialite, /cgu, /conditions-commerciales, /cookies). */
export default function PageLegaleVue({ slug }: { slug: string }) {
  const page = pageLegale(slug) ?? PAGES_LEGALES[0];
  useEffect(() => { document.title = `${page.titre} · Relais`; window.scrollTo(0, 0); }, [page]);
  return (
    <div className="leg">
      <a href="#leg-contenu" className="leg-evitement">Aller au contenu</a>
      <header className="leg-entete">
        <a href="/" className="leg-marque" aria-label="Relais, accueil"><Logo taille={28} /><b>Relais</b></a>
        <a href="/" className="btn small">Retour à l'accueil</a>
      </header>
      <div className="leg-corps">
        <nav className="leg-nav" aria-label="Informations légales">
          <span className="leg-nav-titre">Informations légales</span>
          {PAGES_LEGALES.map((p) => (
            <a key={p.slug} href={`/${p.slug}`} aria-current={p.slug === page.slug ? 'page' : undefined}>{p.court}</a>
          ))}
        </nav>
        <main id="leg-contenu" className="leg-contenu">
          <h1>{page.titre}</h1>
          <p className="leg-resume">{page.resume}</p>
          {page.maj && <p className="leg-maj">Dernière mise à jour : {enrichir(page.maj)}</p>}
          {page.blocs.map(rendu)}
          <p className="leg-contact">Une question sur ces informations ? Écrivez-nous : {enrichir('[e-mail de contact]')}.</p>
        </main>
      </div>
      <footer className="leg-pied">
        <span>© {new Date().getFullYear()} Relais · Casablanca</span>
        <nav aria-label="Liens légaux">
          {PAGES_LEGALES.map((p) => <a key={p.slug} href={`/${p.slug}`}>{p.court}</a>)}
          <button type="button" onClick={gererCookies}>Gérer les cookies</button>
        </nav>
      </footer>
    </div>
  );
}
