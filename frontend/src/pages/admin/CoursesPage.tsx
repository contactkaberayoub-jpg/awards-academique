import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, CheckCircle, Pencil, Plus, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  adminApi,
  type CategoryResponse,
  type CourseResponse,
  type CourseStatus,
  type CreateCourseRequest,
  type UpdateCourseRequest,
} from '@/api/admin';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormInput } from '@/components/admin/FormInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchInput } from '@/components/admin/SearchInput';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

const courseSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire').max(255, 'Le titre ne doit pas dépasser 255 caractères'),
  description: z.string(),
  price: z.number().min(0, 'Le prix ne peut pas être négatif'),
  categoryId: z.string().uuid('Sélectionnez une catégorie'),
  thumbnailUrl: z.union([z.literal(''), z.string().url('Saisissez une URL valide')]),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']),
  currency: z.enum(['MAD', 'EUR', 'USD']),
  durationMinutes: z.number().int('La durée doit être un nombre entier').min(1, 'La durée doit être d\'au moins une minute'),
  isFree: z.boolean(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

const emptyCourse: CourseFormValues = {
  title: '',
  description: '',
  price: 0,
  categoryId: '',
  thumbnailUrl: '',
  level: 'beginner',
  currency: 'USD',
  durationMinutes: 60,
  isFree: false,
};

function statusClass(status: CourseStatus) {
  if (status === 'published') return 'bg-success-tint text-success';
  if (status === 'pending') return 'bg-primary-tint text-primary';
  if (status === 'rejected') return 'bg-error-tint text-error';
  if (status === 'archived') return 'bg-surface-tertiary text-text-secondary';
  return 'bg-warning-tint text-warning';
}

function statusLabel(status: CourseStatus) {
  const labels: Record<CourseStatus, string> = {
    draft: 'Brouillon',
    pending: 'En attente',
    rejected: 'Rejeté',
    published: 'Publié',
    archived: 'Archivé',
  };
  return labels[status];
}

const WORKFLOW_LABELS: Record<string, string> = {
  publish: 'publier',
  reject: 'rejeter',
  archive: 'archiver',
  restore: 'restaurer',
};

function formatPrice(course: CourseResponse) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: course.currency,
  }).format(course.price);
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [editingCourse, setEditingCourse] = useState<CourseResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseResponse | null>(null);
  const [workflowCourseId, setWorkflowCourseId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: emptyCourse,
  });

  const isFreeChecked = watch('isFree');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [coursesResponse, categoriesResponse] = await Promise.all([
        adminApi.getCourses(),
        adminApi.getCategories(),
      ]);
      setCourses(coursesResponse.data);
      setCategories(categoriesResponse.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les cours.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) =>
      [course.title, course.categoryName ?? '', course.instructorName ?? '']
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [courses, search]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories]
  );

  function openCreateForm() {
    setEditingCourse(null);
    reset(emptyCourse);
    setIsFormOpen(true);
  }

  function openEditForm(course: CourseResponse) {
    setEditingCourse(course);
    reset({
      title: course.title,
      description: course.description ?? '',
      price: course.price,
      categoryId: course.categoryId,
      thumbnailUrl: course.thumbnailUrl ?? '',
      level: course.level,
      currency: course.currency,
      durationMinutes: course.durationMinutes,
      isFree: course.isFree,
    });
    setIsFormOpen(true);
  }

  async function saveCourse(values: CourseFormValues) {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload: CreateCourseRequest = {
      title: values.title,
      description: values.description || undefined,
      price: values.isFree ? 0 : values.price,
      categoryId: values.categoryId,
      thumbnailUrl: values.thumbnailUrl || undefined,
      level: values.level,
      currency: values.currency,
      durationMinutes: values.durationMinutes,
      isFree: values.isFree,
    };

    try {
      if (editingCourse) {
        const updatePayload: UpdateCourseRequest = {
          ...payload,
          description: values.description,
          thumbnailUrl: values.thumbnailUrl,
        };
        await adminApi.updateCourse(editingCourse.id, updatePayload);
      } else {
        await adminApi.createCourse(payload);
      }

      setIsFormOpen(false);
      setSuccessMessage(`Cours ${editingCourse ? 'modifié' : 'créé'} avec succès.`);
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, `Impossible de ${editingCourse ? 'modifier' : 'créer'} le cours.`));
    } finally {
      setIsSaving(false);
    }
  }

  async function runWorkflow(course: CourseResponse, action: 'publish' | 'reject' | 'archive' | 'restore') {
    setWorkflowCourseId(course.id);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const verbs: Record<string, string> = {
        publish: 'publié',
        reject: 'rejeté',
        archive: 'archivé',
        restore: 'restauré',
      };
      switch (action) {
        case 'publish':
          await adminApi.publishCourse(course.id);
          break;
        case 'reject':
          await adminApi.rejectCourse(course.id);
          break;
        case 'archive':
          await adminApi.archiveCourse(course.id);
          break;
        case 'restore':
          await adminApi.restoreCourse(course.id);
          break;
      }
      setSuccessMessage(`Cours ${verbs[action]} avec succès.`);
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, `Impossible de ${WORKFLOW_LABELS[action] ?? action} le cours.`));
    } finally {
      setWorkflowCourseId(null);
    }
  }

  async function deleteCourse() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await adminApi.deleteCourse(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage('Cours supprimé avec succès.');
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer le cours.'));
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<CourseResponse>[] = [
    {
      key: 'thumbnail',
      header: 'Aperçu',
      className: 'w-24',
      render: (course) => course.thumbnailUrl ? (
        <img src={course.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover ring-1 ring-border" />
      ) : <div className="flex h-10 w-16 items-center justify-center rounded bg-surface-tertiary text-xs text-text-muted">Aucune</div>,
    },
    { key: 'title', header: 'Titre', render: (course) => <span className="font-medium text-text-primary">{course.title}</span> },
    { key: 'category', header: 'Catégorie', render: (course) => course.categoryName ?? '—' },
    { key: 'instructor', header: 'Formateur', render: (course) => course.instructorName ?? '—' },
    { key: 'price', header: 'Prix', render: formatPrice },
    {
      key: 'status',
      header: 'Statut',
      render: (course) => <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClass(course.status)}`}>{statusLabel(course.status)}</span>,
    },
    { key: 'createdAt', header: 'Créé le', render: (course) => formatDate(course.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-28',
      render: (course) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => openEditForm(course)} className="rounded-sm p-1.5 text-primary hover:bg-primary-tint" aria-label={`Modifier ${course.title}`}>
            <Pencil className="h-4 w-4" />
          </button>
          {course.status === 'pending' && (
            <>
              <button type="button" onClick={() => void runWorkflow(course, 'publish')} disabled={workflowCourseId === course.id} className="rounded-sm p-1.5 text-success hover:bg-success-tint" aria-label={`Publier ${course.title}`} title="Publier">
                <CheckCircle className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => void runWorkflow(course, 'reject')} disabled={workflowCourseId === course.id} className="rounded-sm p-1.5 text-error hover:bg-error-tint" aria-label={`Rejeter ${course.title}`} title="Rejeter">
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {course.status === 'published' && (
            <button type="button" onClick={() => void runWorkflow(course, 'archive')} disabled={workflowCourseId === course.id} className="rounded-sm p-1.5 text-text-secondary hover:bg-surface-tertiary" aria-label={`Archiver ${course.title}`} title="Archiver">
              <Archive className="h-4 w-4" />
            </button>
          )}
          {course.status === 'archived' && (
            <button type="button" onClick={() => void runWorkflow(course, 'restore')} disabled={workflowCourseId === course.id} className="rounded-sm p-1.5 text-primary hover:bg-primary-tint" aria-label={`Restaurer ${course.title}`} title="Restaurer">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => setDeleteTarget(course)} className="rounded-sm p-1.5 text-error hover:bg-error-tint" aria-label={`Supprimer ${course.title}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Cours"
        description="Créez et gérez les cours de la plateforme."
        action={
          <button type="button" onClick={openCreateForm} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
            <Plus className="h-4 w-4" />
            Créer un cours
          </button>
        }
      />
      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />
      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un cours..." />
      </div>
      {isLoading ? (
        <Loading label="Chargement des cours..." />
      ) : filteredCourses.length === 0 ? (
        <EmptyState title={search ? 'Aucun cours trouvé' : 'Aucun cours pour le moment'} description={search ? 'Essayez une autre recherche.' : 'Créez votre premier cours pour commencer.'} />
      ) : (
        <DataTable columns={columns} data={filteredCourses} getRowKey={(course) => course.id} />
      )}

      {isFormOpen && (
        <Modal title={editingCourse ? 'Modifier le cours' : 'Nouveau cours'} onClose={() => setIsFormOpen(false)}>
          <form className="space-y-4" noValidate onSubmit={handleSubmit(saveCourse)}>
            <FormInput id="course-title" label="Titre" error={errors.title?.message} {...register('title')} />
            <div>
              <label htmlFor="course-description" className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
              <textarea id="course-description" rows={4} className={`w-full rounded-sm border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-focus-ring-subtle ${errors.description ? 'border-error focus:border-error' : 'border-border focus:border-primary'}`} {...register('description')} />
              {errors.description && <p className="mt-1 text-xs text-error">{errors.description.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect id="course-category" label="Catégorie" placeholder="Sélectionnez une catégorie" options={categoryOptions} error={errors.categoryId?.message} {...register('categoryId')} />
              <FormInput id="course-price" label="Prix" type="number" min="0" step="0.01" error={errors.price?.message} disabled={isFreeChecked} {...register('price', { valueAsNumber: true })} />
            </div>
            <FormInput id="course-thumbnail" label="URL de la miniature" type="url" error={errors.thumbnailUrl?.message} {...register('thumbnailUrl')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect id="course-level" label="Niveau" options={[{ value: 'beginner', label: 'Débutant' }, { value: 'intermediate', label: 'Intermédiaire' }, { value: 'advanced', label: 'Avancé' }, { value: 'all_levels', label: 'Tous les niveaux' }]} error={errors.level?.message} {...register('level')} />
              <FormSelect id="course-currency" label="Devise" options={[{ value: 'MAD', label: 'MAD' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }]} error={errors.currency?.message} {...register('currency')} />
              <FormInput id="course-duration" label="Durée (minutes)" type="number" min="1" error={errors.durationMinutes?.message} {...register('durationMinutes', { valueAsNumber: true })} />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20" {...register('isFree')} />
              Ce cours est gratuit
            </label>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60">Annuler</button>
              <button type="submit" disabled={isSaving} className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Enregistrement...' : 'Enregistrer le cours'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && <DeleteModal itemName={deleteTarget.title} isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteCourse()} />}
    </div>
  );
}
