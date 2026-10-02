import { ShoppingCart, CheckCircle2, Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchInstructorOrders, type InstructorOrder, type InstructorOrdersData } from '@/api/orders';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/instructor/StatCard';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/formatDate';

function orderBadgeVariant(status: InstructorOrder['status']) {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'warning';
    case 'refunded':
      return 'error';
    default:
      return 'default';
  }
}

function orderStatusLabel(status: InstructorOrder['status']) {
  switch (status) {
    case 'paid':
      return 'Payé';
    case 'pending':
      return 'En attente';
    case 'refunded':
      return 'Remboursé';
    default:
      return 'Annulé';
  }
}

const columns: DataTableColumn<InstructorOrder>[] = [
  {
    key: 'course',
    header: 'Cours',
    render: (order) => <span className="font-medium text-text-primary">{order.courseTitle}</span>,
  },
  {
    key: 'student',
    header: 'Étudiant',
    render: (order) => (
      <div>
        <p className="text-text-primary">{order.studentName}</p>
        <p className="text-xs text-text-secondary">{order.studentEmail}</p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Statut',
    render: (order) => (
      <Badge variant={orderBadgeVariant(order.status)} size="sm">
        {orderStatusLabel(order.status)}
      </Badge>
    ),
  },
  {
    key: 'amount',
    header: 'Montant',
    render: (order) => (
      <span className="font-semibold text-text-primary">
        {order.totalAmount.toFixed(2)} {order.currency}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Date',
    render: (order) => <span className="text-text-secondary">{formatDate(order.createdAt)}</span>,
  },
];

export default function InstructorOrdersPage() {
  const [data, setData] = useState<InstructorOrdersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      setData(await fetchInstructorOrders());
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger vos commandes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return <Loading label="Chargement de vos commandes..." />;
  }

  if (errorMessage) {
    return (
      <div>
        <PageHeader title="Commandes" description="Suivez les achats effectués par vos étudiants." />
        <Notice type="error" message={errorMessage} />
      </div>
    );
  }

  const orders = data?.orders ?? [];
  const hasOrders = orders.length > 0;

  return (
    <div>
      <PageHeader title="Commandes" description="Revenus et historique des commandes sur vos cours." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Revenu total"
          value={`${(data?.totalRevenue ?? 0).toFixed(2)} MAD`}
          icon={ShoppingCart}
          color="green"
          hint="Issu des commandes payées"
        />
        <StatCard label="Commandes payées" value={data?.paidOrders ?? 0} icon={CheckCircle2} color="blue" hint="Achats effectués" />
        <StatCard label="En attente de paiement" value={data?.pendingOrders ?? 0} icon={Clock} color="amber" hint="En attente du paiement" />
      </div>

      {!hasOrders ? (
        <div className="mt-6">
          <EmptyState title="Aucune commande pour le moment" description="Quand des étudiants achèteront vos cours, leurs commandes apparaîtront ici." />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable columns={columns} data={orders} getRowKey={(order) => order.id} />
        </div>
      )}
    </div>
  );
}
