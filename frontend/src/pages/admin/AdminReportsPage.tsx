import { useState, useEffect, useCallback } from 'react';
import { adminApi, type RevenueSummary, type AdminInstructorEarnings, type CourseResponse, type CategoryResponse, type EnrollmentResponse } from '@/api/admin';
import { PageHeader } from '@/components/admin/PageHeader';
import { Loading } from '@/components/admin/Loading';
import { Notice } from '@/components/admin/Notice';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { DollarSign, Users, BookOpen, TrendingUp } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';

export default function AdminReportsPage() {
  const [revenue, setRevenue] = useState<RevenueSummary[]>([]);
  const [instructorEarnings, setInstructorEarnings] = useState<AdminInstructorEarnings[]>([]);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [, setCategories] = useState<CategoryResponse[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [revRes, earnRes, courseRes, catRes, enrRes] = await Promise.all([
        adminApi.getAdminRevenue(),
        adminApi.getAdminInstructorEarnings(),
        adminApi.getCourses(),
        adminApi.getCategories(),
        adminApi.getAllEnrollments(),
      ]);
      setRevenue(revRes.data);
      setInstructorEarnings(earnRes.data);
      setCourses(courseRes.data);
      setCategories(catRes.data);
      setEnrollments(enrRes.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage('Impossible de charger les rapports et statistiques.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalRevenueUSD = revenue.reduce((sum, r) => sum + (r.paidAmount ?? 0), 0);
  const totalOrders = revenue.reduce((sum, r) => sum + (r.totalCount ?? 0), 0);
  const totalStudents = new Set(enrollments.map((e) => e.userId)).size;

  const revenueColumns: DataTableColumn<RevenueSummary>[] = [
    { key: 'currency', header: 'Devise', render: (r) => <span className="font-semibold">{r.currency}</span> },
    { key: 'totalCount', header: 'Commandes totales', render: (r) => r.totalCount },
    { key: 'totalAmount', header: 'Montant total', render: (r) => `${r.totalAmount.toFixed(2)} ${r.currency}` },
    { key: 'paidCount', header: 'Payées', render: (r) => r.paidCount },
    { key: 'paidAmount', header: 'Montant payé', render: (r) => <span className="font-semibold text-success">{r.paidAmount.toFixed(2)} {r.currency}</span> },
    { key: 'pendingCount', header: 'En attente', render: (r) => r.pendingCount },
  ];

  const earningsColumns: DataTableColumn<AdminInstructorEarnings>[] = [
    { key: 'instructorName', header: 'Formateur', render: (e) => <span className="font-medium text-text-primary">{e.instructorName}</span> },
    { key: 'instructorEmail', header: 'Email', render: (e) => e.instructorEmail },
    { key: 'orderCount', header: 'Commandes', render: (e) => e.orderCount },
    { key: 'grossRevenue', header: 'Revenu brut', render: (e) => `${e.grossRevenue.toFixed(2)} ${e.currency}` },
    { key: 'earningsAmount', header: 'Gain formateur', render: (e) => `${e.earningsAmount.toFixed(2)} ${e.currency}` },
    { key: 'availableAmount', header: 'Disponible', render: (e) => <span className="font-semibold text-success">{e.availableAmount.toFixed(2)} {e.currency}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Rapports & Analyses"
        description="Vue d'ensemble financière, activité des formateurs et statistiques de la plateforme."
      />
      <Notice type="error" message={errorMessage} />

      {isLoading ? (
        <Loading label="Chargement des rapports..." />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              index={0}
              label="Revenu global payé"
              value={`${totalRevenueUSD.toFixed(2)}`}
              icon={DollarSign}
              tone="success"
              hint="Somme totale encaissée"
            />
            <KpiCard
              index={1}
              label="Étudiants actifs"
              value={totalStudents.toLocaleString()}
              icon={Users}
              tone="primary"
              hint="Nombre d'étudiants uniques inscrits"
            />
            <KpiCard
              index={2}
              label="Cours publiés"
              value={courses.filter((c) => c.status === 'published').length}
              icon={BookOpen}
              tone="warning"
              hint={`Sur ${courses.length} cours au total`}
            />
            <KpiCard
              index={3}
              label="Commandes"
              value={totalOrders}
              icon={TrendingUp}
              tone="accent"
              hint="Volume total de commandes"
            />
          </div>

          <div className="mt-8 space-y-8">
            <Card padded={false}>
              <div className="px-5 pt-5 pb-2">
                <h2 className="text-base font-semibold text-text-primary">Synthèse des revenus par devise</h2>
                <p className="text-xs text-text-muted">Répartition des commandes et des paiements</p>
              </div>
              <div className="mt-2">
                {revenue.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-text-secondary">Aucune donnée de revenu disponible.</p>
                ) : (
                  <DataTable columns={revenueColumns} data={revenue} getRowKey={(r) => r.currency} />
                )}
              </div>
            </Card>

            <Card padded={false}>
              <div className="px-5 pt-5 pb-2">
                <h2 className="text-base font-semibold text-text-primary">Gains des formateurs</h2>
                <p className="text-xs text-text-muted">Performance financière par formateur</p>
              </div>
              <div className="mt-2">
                {instructorEarnings.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-text-secondary">Aucun gain de formateur enregistré.</p>
                ) : (
                  <DataTable columns={earningsColumns} data={instructorEarnings} getRowKey={(e) => e.instructorId} />
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
