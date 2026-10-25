import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { dateHeureFr } from '../api/format';
import type { Notification } from '../api/types';
import { Chargement, Vide } from '../components/ui';

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Notification[]>('/api/notifications')).data,
  });
  const lire = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/lu`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <>
      <h1>Notifications</h1>
      <section className="card">
        {isLoading && <Chargement />}
        {data?.length === 0 && <Vide>Aucune notification pour l'instant.</Vide>}
        {data?.map((n) => (
          <div key={n.id} className="list-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: n.lu ? 500 : 700 }}>{n.titre}</div>
              <div className="muted">{n.message}</div>
              <div className="small muted">{dateHeureFr(n.createdAt)}</div>
            </div>
            {!n.lu ? (
              <button className="btn small" onClick={() => lire.mutate(n.id)}>Marquer comme lue</button>
            ) : <span className="pill neutral">Lue</span>}
          </div>
        ))}
      </section>
    </>
  );
}
