import { useQuery } from '@tanstack/react-query';
import { api, telecharger } from '../../api/client';
import { dateFr, libelleStatutFacture, n } from '../../api/format';
import type { Facture } from '../../api/types';
import { Chargement, Pill, toneFacture, Vide } from '../../components/ui';

export default function FacturesClient() {
  const factures = useQuery({ queryKey: ['factures'], queryFn: async () => (await api.get<Facture[]>('/api/factures')).data });
  return (
    <main className="page">
      <h1>Factures</h1>
      <section className="card">
        {factures.isLoading && <Chargement />}
        {factures.data?.length === 0 && <Vide>Aucune facture pour l'instant.</Vide>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>Objet</th><th className="num">Montant TTC (MAD)</th><th>Émise le</th><th>Échéance</th><th>Statut</th><th /></tr></thead>
            <tbody>
              {factures.data?.map((f) => (
                <tr key={f.id}>
                  <td className="mono small">{f.numero}</td>
                  <td>{f.objet}</td>
                  <td className="num">{n(f.montantTtc)}</td>
                  <td>{dateFr(f.dateEmission)}</td>
                  <td>{dateFr(f.echeance)}</td>
                  <td><Pill tone={toneFacture(f.statut)}>{libelleStatutFacture[f.statut]}</Pill></td>
                  <td><button className="btn small" onClick={() => telecharger(`/api/factures/${f.id}/pdf`, `${f.numero}.pdf`)}>Télécharger</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
