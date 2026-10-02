import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import { fetchAdminParametres, updateRevenueSplit } from '@/api/parametres';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { Loading } from '@/components/admin/Loading';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const PLATFORM_KEY = 'platform_percentage';
const INSTRUCTOR_KEY = 'instructor_percentage';

export default function AdminPlatformParametresPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'parametres'],
    queryFn: fetchAdminParametres,
  });

  const platformParam = data?.find((p) => p.key === PLATFORM_KEY);
  const instructorParam = data?.find((p) => p.key === INSTRUCTOR_KEY);

  const [platform, setPlatform] = useState('');
  const [instructor, setInstructor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (platformParam) setPlatform(platformParam.value);
    if (instructorParam) setInstructor(instructorParam.value);
  }, [platformParam, instructorParam]);

  const platformNum = Number(platform);
  const instructorNum = Number(instructor);
  const total = platformNum + instructorNum;
  const isValid =
    Number.isFinite(platformNum) &&
    Number.isFinite(instructorNum) &&
    platformNum >= 0 &&
    instructorNum >= 0 &&
    total === 100;
  const isDirty =
    platformParam !== undefined &&
    instructorParam !== undefined &&
    (platform !== platformParam.value || instructor !== instructorParam.value);

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateRevenueSplit({
        platformPercentage: platformNum,
        instructorPercentage: instructorNum,
      });
      setSuccessMessage('Répartition des revenus mise à jour avec succès.');
      await refetch();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Impossible d’enregistrer la configuration.');
    } finally {
      setIsSaving(false);
    }
  }

  const others = (data ?? []).filter((p) => p.key !== PLATFORM_KEY && p.key !== INSTRUCTOR_KEY);

  return (
    <div>
      <PageHeader
        title="Paramètres de la plateforme"
        description="Répartition des revenus et configuration globale. La plateforme et les instructeurs sont mis à jour immédiatement."
        eyebrow="Administration"
      />

      {errorMessage && <Notice type="error" message={errorMessage} />}
      {successMessage && <Notice type="success" message={successMessage} />}

      {isLoading ? (
        <Loading label="Chargement des paramètres..." />
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-tint text-primary">
                <Settings2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-text-primary">Répartition des revenus</h2>
                <p className="text-xs text-text-secondary">
                  Part de chaque vente payée reversée à la plateforme et à l'instructeur. La somme doit être exactement 100%.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-primary">Part plateforme (%)</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="h-10 w-full rounded-sm border border-border bg-surface px-3.5 text-sm text-text-primary outline-none transition-all duration-normal hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-focus-ring-subtle"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-text-primary">Part instructeur (%)</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="h-10 w-full rounded-sm border border-border bg-surface px-3.5 text-sm text-text-primary outline-none transition-all duration-normal hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-focus-ring-subtle"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Total</span>
                <Badge variant={isValid ? 'success' : 'error'}>{Number.isFinite(total) ? `${total}%` : '—'}</Badge>
              </div>
              {!isValid && Number.isFinite(total) && total !== 100 && (
                <p className="text-xs text-error">La répartition doit totaliser exactement 100% (actuellement {total}%).</p>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isValid || !isDirty}
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </Card>

          {others.length > 0 && (
            <Card padded={false}>
              <div className="px-5 pt-5">
                <h2 className="text-base font-semibold text-text-primary">Autres paramètres</h2>
                <p className="mt-1 text-xs text-text-muted">Lus par le backend, affichés en lecture seule.</p>
              </div>
              <ul className="mt-4 divide-y divide-border">
                {others.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium text-text-primary">{p.key}</p>
                      {p.description && <p className="truncate text-xs text-text-muted">{p.description}</p>}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-text-primary">{p.value}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}