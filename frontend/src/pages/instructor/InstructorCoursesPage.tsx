import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  adminApi,
  type CategoryResponse,
  type CourseResponse,
  type CreateCourseRequest,
  type UpdateCourseRequest,
} from '@/api/admin';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { FormInput } from '@/components/admin/FormInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchInput } from '@/components/admin/SearchInput';
import { instructorApi } from '@/api/instructor';
import { CourseCard } from '@/components/instructor/CourseCard';
import { EmptyState } from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthContext';
import { getApiErrorMessage } from '@/lib/apiError';

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
  currency: 'MAD',
  durationMinutes: 60,
  isFree: false,
};

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
  { value: 'all_levels', label: 'Tous les niveaux' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'pending', label: 'En attente' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
];

function canModify(status: CourseResponse['status']) {
  return status === 'pending' || status === 'rejected';
}

export default function InstructorCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingCourse, setEditingCourse] = useState<CourseResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CourseResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: emptyCourse,
  });

  const isFreeChecked = watch('isFree');

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [coursesResponse, categoriesResponse] = await Promise.all([
        instructorApi.getMyCourses(),
        adminApi.getCategories(),
      ]);
      setCourses(coursesResponse);
      setCategories(categoriesResponse.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger vos cours.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      if (statusFilter !== 'all' && course.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && course.categoryId !== categoryFilter) return false;
      if (!query) return true;
      return [course.title, course.categoryName ?? ''].some((value) => value.toLowerCase().includes(query));
    });
  }, [courses, search, statusFilter, categoryFilter]);

  const categoryOptions = useMemo(() => {
    const options = categories.map((category) => ({ value: category.id, label: category.name }));
    return [{ value: 'all', label: 'Toutes les catégories' }, ...options];
  }, [categories]);

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

  const hasDraft = courses.some((course) => course.status === 'draft');
  const canCreateAnywhere = courses.length < 1 || hasDraft || courses.some((course) => canModify(course.status));

  return (
    <div>
      <PageHeader
        title="Mes cours"
        description="Gérez votre catalogue de formations."
        action={
          <Button onClick={openCreateForm} size="lg">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Créer un cours
          </Button>
        }
      />
      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="sm:w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un cours…" />
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:flex-none sm:justify-end">
          <FormSelect
            id="dashboard-status-filter"
            label=""
            aria-label="Filtrer par statut"
            options={[{ value: 'all', label: 'Tous les statuts' }, ...STATUS_OPTIONS]}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          />
          <FormSelect
            id="dashboard-category-filter"
            label=""
            aria-label="Filtrer par catégorie"
            options={categoryOptions}
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6">
          <Loading label="Chargement de vos cours..." />
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={search || statusFilter !== 'all' || categoryFilter !== 'all' ? 'Aucun cours trouvé' : 'Aucun cours pour le moment'}
            description={search || statusFilter !== 'all' || categoryFilter !== 'all' ? 'Essayez d\'ajuster vos filtres.' : 'Créez votre premier cours pour commencer à produire du contenu.'}
            icon={Plus}
            action={
              !search && statusFilter === 'all' && categoryFilter === 'all' ? (
                <Button onClick={openCreateForm}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Créer un cours
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              onEdit={canModify(course.status) ? openEditForm : undefined}
              onDelete={canModify(course.status) ? (target) => setDeleteTarget(target) : undefined}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-text-muted">
        {canCreateAnywhere
          ? 'Cliquez sur un cours pour accéder à sa gestion complète (curriculum, quiz, étudiants).'
          : 'Les cours publiés ou archivés ne peuvent plus être modifiés ici.'}
      </p>

      {isFormOpen && (
        <Modal title={editingCourse ? 'Modifier le cours' : 'Nouveau cours'} onClose={() => setIsFormOpen(false)}>
          <form className="space-y-4" noValidate onSubmit={handleSubmit(saveCourse)}>
            <FormInput id="course-title" label="Titre" error={errors.title?.message} placeholder="Ex. Introduction à la programmation" {...register('title')} />
            <div>
              <label htmlFor="course-description" className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label>
              <textarea
                id="course-description"
                rows={4}
                className={`w-full rounded-md border px-3 py-2 text-sm text-text-primary outline-none transition-all duration-fast focus:ring-4 focus:ring-focus-ring-subtle ${errors.description ? 'border-error focus:border-error' : 'border-border focus:border-primary'}`}
                placeholder="Décrivez le contenu et les objectifs du cours…"
                {...register('description')}
              />
              {errors.description && <p className="mt-1 text-xs text-error">{errors.description.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect id="course-category" label="Catégorie" placeholder="Sélectionnez une catégorie" options={categoryOptions.filter((option) => option.value !== 'all')} error={errors.categoryId?.message} {...register('categoryId')} />
              <FormInput id="course-price" label="Prix" type="number" min="0" step="0.01" error={errors.price?.message} disabled={isFreeChecked} {...register('price', { valueAsNumber: true })} />
            </div>
            <FormInput id="course-thumbnail" label="URL de la miniature" type="url" error={errors.thumbnailUrl?.message} placeholder="https://…" {...register('thumbnailUrl')} />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormSelect id="course-level" label="Niveau" options={LEVEL_OPTIONS} error={errors.level?.message} {...register('level')} />
              <FormSelect id="course-currency" label="Devise" options={[{ value: 'MAD', label: 'MAD' }, { value: 'EUR', label: 'EUR' }, { value: 'USD', label: 'USD' }]} error={errors.currency?.message} {...register('currency')} />
              <FormInput id="course-duration" label="Durée (minutes)" type="number" min="1" error={errors.durationMinutes?.message} {...register('durationMinutes', { valueAsNumber: true })} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input type="checkbox" className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20" {...register('isFree')} />
              Ce cours est gratuit
            </label>
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="submit" loading={isSaving}>
                {isSaving ? 'Enregistrement…' : 'Enregistrer le cours'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && <DeleteModal itemName={deleteTarget.title} isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteCourse()} />}
    </div>
  );
}