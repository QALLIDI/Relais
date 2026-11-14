import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api/client';
import type { Notification } from '../api/types';
import { Chargement, Icone, Segments, TetePage, Vide, type NomIcone } from '../components/ui';

const LIEN = /\s*:?\s*(https?:\/\/\S+?)([.,;)]?)(?=\s|$)/;
const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

/** Sépare le texte et le lien d'une notification (les messages se terminent souvent par l'adresse de la page à ouvrir). */
function decouper(message?: string): { texte: string; lien?: string } {
  if (!message) return { texte: '' };
  const m = message.match(LIEN);
  if (!m || m.index == null) return { texte: message };
  const texte = (message.slice(0, m.index) + (m[2] ?? '') + message.slice(m.index + m[0].length)).trim();
  return { texte, lien: m[1] };
}

/** Adresse interne à l'application quand le lien pointe vers une de ses pages. */
function versInterne(lien?: string): string | undefined {
  if (!lien) return undefined;
  try {
    const u = new URL(lien);
    if (u.origin === window.location.origin || /^\/(recruteur|entreprise|candidat)(\/|$)/.test(u.pathname)) return u.pathname + u.search;
  } catch { /* lien invalide */ }
  return undefined;
}

function icone(type?: string): NomIcone {
  const t = (type ?? '').toLowerCase();
  if (t.startsWith('reunion') || t.startsWith('entretien')) return 'agenda';
  if (t.startsWith('facture') || t.startsWith('proposition') || t.includes('place')) return 'facture';
  if (t.startsWith('message')) return 'bulle';
  if (t.startsWith('shortlist') || t.startsWith('retour') || t.startsWith('candidat') || t.startsWith('reference') || t.startsWith('test')) return 'groupe';
  if (t.startsWith('mission')) return 'mallette';
  if (t.startsWith('rattachement') || t.startsWith('compte')) return 'immeuble';
  return 'cloche';
}

function groupe(d: Date, maintenant: Date) {
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86400000);
  if (ecart <= 0) return "Aujourd'hui";
  if (ecart === 1) return 'Hier';
  if (ecart < 7) return 'Cette semaine';
  return 'Plus ancien';
}

type Filtre = 'toutes' | 'non-lues';

export default function Notifications() {
  const qc = useQueryClient();
  const naviguer = useNavigate();
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/api/notifications')).data,
  });
  const rafraichir = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  const lire = useMutation({ mutationFn: (id: string) => api.patch(`/api/notifications/${id}/lu`), onSuccess: rafraichir });
  const toutLire = useMutation({ mutationFn: () => api.patch('/api/notifications/lu'), onSuccess: rafraichir });

  const toutes = data ?? [];
  const nonLues = toutes.filter((n) => !n.lu).length;
  const visibles = filtre === 'non-lues' ? toutes.filter((n) => !n.lu) : toutes;
  const maintenant = new Date();
  const groupes: { titre: string; items: Notification[] }[] = [];
  visibles.forEach((n) => {
    const titre = groupe(new Date(n.createdAt), maintenant);
    const g = groupes.find((x) => x.titre === titre);
    if (g) g.items.push(n); else groupes.push({ titre, items: [n] });
  });

  const ouvrir = (n: Notification, interne?: string, externe?: string) => {
    if (!n.lu) lire.mutate(n.id);
    if (interne) naviguer(interne);
    else if (externe) window.open(externe, '_blank', 'noopener');
  };

  return (
    <>
      <TetePage titre="Notifications" sous={nonLues ? `${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Vous êtes à jour.'}>
        <Segments label="Afficher" options={[{ v: 'toutes', l: 'Toutes' }, { v: 'non-lues', l: `Non lues${nonLues ? ` (${nonLues})` : ''}` }]} valeur={filtre} onChange={setFiltre} />
        <button type="button" className="btn" disabled={!nonLues || toutLire.isPending} onClick={() => toutLire.mutate()}>
          <Icone nom="check" taille={16} />Tout marquer comme lu
        </button>
      </TetePage>

      {isLoading && <Chargement />}
      {!isLoading && visibles.length === 0 && (
        <section className="bloc"><div className="bloc-corps" style={{ paddingTop: 16 }}>
          <Vide>{filtre === 'non-lues' ? 'Aucune notification non lue.' : 'Aucune notification pour l’instant. Vous serez prévenu ici et par e-mail.'}</Vide>
        </div></section>
      )}
      {groupes.map((g) => (
        <section key={g.titre} className="bloc" aria-labelledby={`notif-${g.titre}`}>
          <div className="bloc-tete"><h2 id={`notif-${g.titre}`}>{g.titre}</h2></div>
          <ul className="notif-liste">
            {g.items.map((n) => {
              const { texte, lien } = decouper(n.message);
              const interne = versInterne(lien);
              const cliquable = !!(interne || lien);
              const d = new Date(n.createdAt);
              const quand = g.titre === "Aujourd'hui" || g.titre === 'Hier' ? heure.format(d) : `${date.format(d)} · ${heure.format(d)}`;
              const contenu = (
                <>
                  <span className={`notif-icone ${n.lu ? '' : 'non-lue'}`} aria-hidden="true"><Icone nom={icone(n.type)} taille={18} /></span>
                  <span className="txt">
                    <span className="ligne"><b>{n.titre}</b><time dateTime={n.createdAt}>{quand}</time></span>
                    {texte && <span className="message">{texte}</span>}
                  </span>
                </>
              );
              return (
                <li key={n.id} className={n.lu ? '' : 'non-lue'}>
                  {cliquable
                    ? <button type="button" className="notif-ligne" onClick={() => ouvrir(n, interne, lien)}>{contenu}<Icone nom="droite" taille={16} /></button>
                    : <div className="notif-ligne">{contenu}</div>}
                  {!n.lu && (
                    <button type="button" className="ico petit notif-lu" aria-label={`Marquer « ${n.titre} » comme lue`} title="Marquer comme lue" onClick={() => lire.mutate(n.id)}>
                      <Icone nom="check" taille={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
