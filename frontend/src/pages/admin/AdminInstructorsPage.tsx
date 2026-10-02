import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminInstructorResponse } from '@/api/admin';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchInput } from '@/components/admin/SearchInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { StatusBadge } from '@/components/instructor/StatusBadge';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';
import { Eye } from 'lucide-react';

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = useState<AdminInstructorResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getInstructors(statusFilter || undefined, search || undefined);
      setInstructors(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger la liste des formateurs.'));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const columns: DataTableColumn<AdminInstructorResponse>[] = [
    {
      key: 'instructor',
      header: 'Formateur',
      render: (inst) => (
        <div className="flex items-center gap-3">
          {inst.avatarUrl ? (
            <img src={inst.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-tint text-primary font-semibold text-sm">
              {inst.firstName?.[0]}{inst.lastName?.[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-text-primary">{inst.firstName} {inst.lastName}</p>
            <p className="text-xs text-text-muted">{inst.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Titre & Institution',
      render: (inst) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{inst.professionalTitle ?? 'Formateur'}</p>
          <p className="text-xs text-text-muted">{inst.institution ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'stats',
      header: 'Cours / Étudiants',
      render: (inst) => (
        <div className="text-sm text-text-secondary">
          <p className="font-medium text-text-primary">{inst.courseCount} cours</p>
          <p className="text-xs text-text-muted">{inst.totalStudents} étudiants</p>
        </div>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenus',
      render: (inst) => (
        <span className="font-semibold text-text-primary">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inst.totalRevenue ?? 0)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (inst) => <StatusBadge status={inst.status} />,
    },
    {
      key: 'registered',
      header: 'Inscrit le',
      render: (inst) => formatDate(inst.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inst) => (
        <Link
          to={`/admin/instructors/${inst.userId}`}
          className="inline-flex items-center gap-1.5 rounded-sm bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-tertiary transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Détails</span>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Gestion des formateurs"
        description="Consultez tous les formateurs de la plateforme, leurs cours et leurs performances."
      />
      <Notice type="error" message={errorMessage} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom ou email..." />
        <FormSelect
          id="instructor-status-filter"
          label=""
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Tous les statuts"
          options={[
            { value: 'approved', label: 'Approuvés' },
            { value: 'pending', label: 'En attente' },
            { value: 'rejected', label: 'Rejetés' },
            { value: 'suspended', label: 'Suspendus' },
          ]}
        />
      </div>

      {isLoading ? (
        <Loading label="Chargement des formateurs..." />
      ) : instructors.length === 0 ? (
        <EmptyState
          title="Aucun formateur trouvé"
          description="Aucun formateur ne correspond à vos critères de recherche."
        />
      ) : (
        <DataTable columns={columns} data={instructors} getRowKey={(inst) => inst.userId} />
      )}
    </div>
  );
}
