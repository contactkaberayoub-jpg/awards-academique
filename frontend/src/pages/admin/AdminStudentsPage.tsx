import { useState, useMemo, useEffect, useCallback } from 'react';
import { adminApi, type EnrollmentResponse, type EnrollmentStatus } from '@/api/admin';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchInput } from '@/components/admin/SearchInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

function statusClass(status: EnrollmentStatus) {
  if (status === 'completed') return 'bg-success-tint text-success';
  if (status === 'active') return 'bg-primary-tint text-primary';
  if (status === 'paused') return 'bg-warning-tint text-warning';
  return 'bg-surface-tertiary text-text-secondary';
}

function statusLabel(status: EnrollmentStatus) {
  const labels: Record<EnrollmentStatus, string> = {
    active: 'Actif',
    completed: 'Terminé',
    paused: 'En pause',
    cancelled: 'Annulé',
  };
  return labels[status] ?? status;
}

export default function AdminStudentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getAllEnrollments();
      setEnrollments(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger la liste des étudiants.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enr) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        [enr.studentName ?? '', enr.studentEmail ?? '', enr.courseTitle ?? '']
          .some((val) => val.toLowerCase().includes(query));

      const matchesStatus = !statusFilter || enr.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [enrollments, search, statusFilter]);

  const columns: DataTableColumn<EnrollmentResponse>[] = [
    {
      key: 'student',
      header: 'Étudiant',
      render: (enr) => (
        <div>
          <p className="font-medium text-text-primary">{enr.studentName ?? 'Étudiant inconnu'}</p>
          <p className="text-xs text-text-secondary">{enr.studentEmail ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Cours inscrit',
      render: (enr) => <span className="text-sm font-medium text-text-primary">{enr.courseTitle ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (enr) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(enr.status)}`}>
          {statusLabel(enr.status)}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progression',
      render: (enr) => {
        const pct = enr.completionPercentage ?? 0;
        return (
          <div className="w-32">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
              <div className="h-full bg-primary transition-all duration-normal" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: 'enrolledAt',
      header: 'Inscrit le',
      render: (enr) => formatDate(enr.enrolledAt),
    },
    {
      key: 'lastActivityAt',
      header: 'Dernière activité',
      render: (enr) => formatDate(enr.lastActivityAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Étudiants & Inscriptions"
        description="Gérez et suivez tous les étudiants inscrits aux cours de la plateforme."
      />
      <Notice type="error" message={errorMessage} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, email ou cours..." />
        <FormSelect
          id="status-filter"
          label=""
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          placeholder="Tous les statuts"
          options={[
            { value: 'active', label: 'Actif' },
            { value: 'completed', label: 'Terminé' },
            { value: 'paused', label: 'En pause' },
            { value: 'cancelled', label: 'Annulé' },
          ]}
        />
      </div>

      {isLoading ? (
        <Loading label="Chargement des étudiants..." />
      ) : filteredEnrollments.length === 0 ? (
        <EmptyState
          title={search || statusFilter ? 'Aucun résultat trouvé' : 'Aucun étudiant inscrit'}
          description={search || statusFilter ? 'Essayez de modifier vos filtres de recherche.' : 'Les inscriptions apparaîtront ici.'}
        />
      ) : (
        <DataTable columns={columns} data={filteredEnrollments} getRowKey={(enr) => enr.id} />
      )}
    </div>
  );
}
