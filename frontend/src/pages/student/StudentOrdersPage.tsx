import { useQuery } from '@tanstack/react-query';
import { ordersApi, type OrderResponse } from '@/api/orders';
import { PageHeader } from '@/components/admin/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { Receipt, ShoppingBag } from 'lucide-react';
import { formatDate } from '@/lib/formatDate';

function orderStatusVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'refunded':
      return 'error';
    default:
      return 'default';
  }
}

function orderStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'Payée';
    case 'pending':
      return 'En attente';
    case 'cancelled':
      return 'Annulée';
    case 'refunded':
      return 'Remboursée';
    default:
      return status;
  }
}

export default function StudentOrdersPage() {
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: async () => {
      const res = await ordersApi.getMyOrders();
      return res.data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return <Loading label="Chargement de vos commandes..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Commandes"
        description="Historique de vos achats et paiements sur la plateforme."
      />

      {error && (
        <Notice
          type="error"
          message="Impossible de charger l'historique de vos commandes. Veuillez réessayer."
        />
      )}

      {orders.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary text-text-muted">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Aucune commande</h3>
            <p className="mt-1 text-xs text-text-muted">
              Vous n'avez pas encore passé de commande. Explorez notre catalogue pour vous inscrire à un cours.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order: OrderResponse) => (
            <Card key={order.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {order.courseThumbnailUrl ? (
                  <img
                    src={order.courseThumbnailUrl}
                    alt={order.courseTitle}
                    className="w-16 h-12 rounded-lg object-cover shrink-0 border border-border"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-surface-secondary flex items-center justify-center shrink-0 text-text-muted border border-border">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-text-primary truncate">{order.courseTitle}</h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Commandé le {formatDate(order.createdAt)} · Réf: <span className="font-mono">{order.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">
                    {order.totalAmount.toFixed(2)} {order.currency}
                  </p>
                </div>
                <Badge variant={orderStatusVariant(order.status)} size="sm">
                  {orderStatusLabel(order.status)}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
