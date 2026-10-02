import { FolderOpen, Video, FileText, Link2, Plus, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchInstructorResources,
  lessonResourcesApi,
  type InstructorResource,
  type InstructorResourcesData,
  type LessonResourceType,
} from '@/api/resources';
import { adminApi, type CourseResponse, type SectionResponse } from '@/api/admin';
import { lessonService, type LessonResponse } from '@/api/lessonService';
import { instructorApi } from '@/api/instructor';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormInput } from '@/components/admin/FormInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatCard } from '@/components/instructor/StatCard';
import { Badge } from '@/components/ui/Badge';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) {
    return '—';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resourceTypeLabel(type: LessonResourceType): string {
  switch (type) {
    case 'video':
      return 'Vidéo';
    case 'pdf':
      return 'PDF';
    case 'link':
      return 'Lien';
    default:
      return 'Fichier';
  }
}

type ResourceMode = 'link' | 'file';

interface ResourceFormState {
  courseId: string;
  sectionId: string;
  lessonId: string;
  title: string;
  mode: ResourceMode;
  resourceType: LessonResourceType;
  url: string;
}

const emptyForm: ResourceFormState = {
  courseId: '',
  sectionId: '',
  lessonId: '',
  title: '',
  mode: 'link',
  resourceType: 'link',
  url: '',
};

const linkTypeOptions = [
  { value: 'link', label: 'Lien externe' },
  { value: 'pdf', label: 'PDF (URL)' },
  { value: 'video', label: 'Vidéo (URL)' },
];

export default function InstructorResourcesPage() {
  const [data, setData] = useState<InstructorResourcesData | null>(null);
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<InstructorResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstructorResource | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState<ResourceFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [lessons, setLessons] = useState<LessonResponse[]>([]);
  const [isSectionsLoading, setIsSectionsLoading] = useState(false);
  const [isLessonsLoading, setIsLessonsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resourcesData, coursesResponse] = await Promise.all([
        fetchInstructorResources(),
        instructorApi.getMyCourses(),
      ]);
      setData(resourcesData);
      setCourses(coursesResponse);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger vos ressources.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadSections = useCallback(async (courseId: string) => {
    if (!courseId) {
      setSections([]);
      return;
    }
    setIsSectionsLoading(true);
    try {
      const response = await adminApi.getSectionsByCourse(courseId);
      setSections(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les sections de ce cours.'));
    } finally {
      setIsSectionsLoading(false);
    }
  }, []);

  const loadLessons = useCallback(async (sectionId: string) => {
    if (!sectionId) {
      setLessons([]);
      return;
    }
    setIsLessonsLoading(true);
    try {
      const response = await lessonService.getBySection(sectionId);
      setLessons(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les leçons de cette section.'));
    } finally {
      setIsLessonsLoading(false);
    }
  }, []);

  const courseOptions = useMemo(() => courses.map((course) => ({ value: course.id, label: course.title })), [courses]);
  const sectionOptions = useMemo(() => sections.map((section) => ({ value: section.id, label: section.title })), [sections]);
  const lessonOptions = useMemo(() => lessons.map((lesson) => ({ value: lesson.id, label: lesson.title })), [lessons]);

  function openCreateForm() {
    setEditingResource(null);
    setForm(emptyForm);
    setFile(null);
    setFormError(null);
    setSections([]);
    setLessons([]);
    setIsFormOpen(true);
  }

  function openEditForm(resource: InstructorResource) {
    setEditingResource(resource);
    setForm({
      ...emptyForm,
      courseId: resource.courseId,
      sectionId: '',
      lessonId: resource.lessonId,
      title: resource.title,
      mode: resource.resourceType === 'file' ? 'file' : 'link',
      resourceType: resource.resourceType,
      url: resource.resourceType === 'file' ? '' : resource.fileUrl ?? '',
    });
    setFile(null);
    setFormError(null);
    setSections([]);
    setLessons([]);
    setIsFormOpen(true);
  }

  function changeFormCourse(courseId: string) {
    setForm((current) => ({ ...current, courseId, sectionId: '', lessonId: '' }));
    setLessons([]);
    void loadSections(courseId);
  }

  function changeFormSection(sectionId: string) {
    setForm((current) => ({ ...current, sectionId, lessonId: '' }));
    void loadLessons(sectionId);
  }

  async function saveResource() {
    setFormError(null);
    setSuccessMessage(null);

    if (!form.title.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }
    if (editingResource) {
      setIsSaving(true);
      try {
        await lessonResourcesApi.update(editingResource.id, {
          title: form.title.trim(),
          ...(form.mode === 'link' ? { url: form.url.trim() } : {}),
        });
        setIsFormOpen(false);
        setSuccessMessage('Ressource modifiée avec succès.');
        await loadData();
      } catch (error) {
        setFormError(getApiErrorMessage(error, 'Impossible de modifier la ressource.'));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!form.lessonId) {
      setFormError('Sélectionnez une leçon.');
      return;
    }
    if (form.mode === 'file') {
      if (!file) {
        setFormError('Choisissez un fichier à importer.');
        return;
      }
    } else if (!form.url.trim()) {
      setFormError('Saisissez une URL.');
      return;
    }

    setIsSaving(true);
    try {
      if (form.mode === 'file') {
        await lessonResourcesApi.upload(form.lessonId, form.title.trim(), file as File);
      } else {
        await lessonResourcesApi.create({
          lessonId: form.lessonId,
          title: form.title.trim(),
          resourceType: form.resourceType,
          url: form.url.trim(),
        });
      }
      setIsFormOpen(false);
      setSuccessMessage('Ressource ajoutée avec succès.');
      await loadData();
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Impossible d\'ajouter la ressource.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteResource() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await lessonResourcesApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage('Ressource supprimée avec succès.');
      await loadData();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer la ressource.'));
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<InstructorResource>[] = [
    {
      key: 'title',
      header: 'Ressource',
      render: (resource) => <span className="font-medium text-text-primary">{resource.title}</span>,
    },
    {
      key: 'lesson',
      header: 'Leçon',
      render: (resource) => <span className="text-text-secondary">{resource.lessonTitle}</span>,
    },
    {
      key: 'course',
      header: 'Cours',
      render: (resource) => <span className="text-text-secondary">{resource.courseTitle}</span>,
    },
    {
      key: 'resourceType',
      header: 'Type',
      render: (resource) => (
        <Badge variant={resource.resourceType === 'video' ? 'accent' : 'default'} size="sm">
          {resourceTypeLabel(resource.resourceType)}
        </Badge>
      ),
    },
    {
      key: 'fileSizeBytes',
      header: 'Taille',
      render: (resource) => <span className="text-text-secondary">{formatBytes(resource.fileSizeBytes)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Ajoutée le',
      render: (resource) => <span className="text-text-secondary">{formatDate(resource.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-28',
      render: (resource) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEditForm(resource)}
            className="rounded-sm p-1.5 text-primary hover:bg-primary-tint"
            aria-label={`Modifier ${resource.title}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(resource)}
            className="rounded-sm p-1.5 text-error hover:bg-error-tint"
            aria-label={`Supprimer ${resource.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <Loading label="Chargement de vos ressources..." />;
  }

  const resources = data?.resources ?? [];
  const hasResources = resources.length > 0;

  return (
    <div>
      <PageHeader
        title="Ressources"
        description="Gérez les PDF, vidéos et liens partagés avec vos étudiants."
        action={
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Ajouter une ressource
          </button>
        }
      />

      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Ressources au total" value={data?.totalResources ?? 0} icon={FolderOpen} color="blue" hint="Sur toutes les leçons" />
        <StatCard label="Vidéos" value={data?.videoResources ?? 0} icon={Video} color="violet" hint="Ressources vidéo" />
        <StatCard label="PDF" value={data?.pdfResources ?? 0} icon={FileText} color="green" hint="Ressources documentaires" />
      </div>

      {!hasResources ? (
        <div className="mt-6">
          <EmptyState title="Aucune ressource pour le moment" description="Joignez des fichiers et des liens à vos leçons pour enrichir l'apprentissage." />
        </div>
      ) : (
        <div className="mt-6">
          <DataTable columns={columns} data={resources} getRowKey={(resource) => resource.id} />
        </div>
      )}

      {isFormOpen && (
        <Modal
          title={editingResource ? 'Modifier la ressource' : 'Ajouter une ressource'}
          onClose={() => setIsFormOpen(false)}
        >
          <div className="space-y-4">
            {formError && <p className="rounded-sm bg-error-tint px-3 py-2 text-sm text-error">{formError}</p>}

            {!editingResource && (
              <>
                <FormSelect
                  id="resource-course"
                  label="Cours"
                  placeholder="Sélectionnez un cours"
                  options={courseOptions}
                  value={form.courseId}
                  onChange={(event) => changeFormCourse(event.target.value)}
                />
                <FormSelect
                  id="resource-section"
                  label="Section"
                  placeholder={form.courseId ? 'Sélectionnez une section' : 'Choisissez d\'abord un cours'}
                  options={sectionOptions}
                  value={form.sectionId}
                  disabled={!form.courseId || isSectionsLoading}
                  onChange={(event) => changeFormSection(event.target.value)}
                />
                <FormSelect
                  id="resource-lesson"
                  label="Leçon"
                  placeholder={form.sectionId ? 'Sélectionnez une leçon' : 'Choisissez d\'abord une section'}
                  options={lessonOptions}
                  value={form.lessonId}
                  disabled={!form.sectionId || isLessonsLoading}
                  onChange={(event) => setForm((current) => ({ ...current, lessonId: event.target.value }))}
                />
              </>
            )}

            <FormInput
              id="resource-title"
              label="Titre"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />

            {!editingResource && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-text-primary">Type de ressource</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, mode: 'link', resourceType: 'link' }))}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium ${form.mode === 'link' ? 'border-primary bg-primary-tint text-primary' : 'border-border text-text-secondary hover:bg-surface-secondary'}`}
                  >
                    <Link2 className="h-4 w-4" /> Lien / URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, mode: 'file', resourceType: 'file' }))}
                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium ${form.mode === 'file' ? 'border-primary bg-primary-tint text-primary' : 'border-border text-text-secondary hover:bg-surface-secondary'}`}
                  >
                    <FolderOpen className="h-4 w-4" /> Fichier
                  </button>
                </div>
              </div>
            )}

            {form.mode === 'link' ? (
              <>
                {!editingResource && (
                  <FormSelect
                    id="resource-type"
                    label="Nature du lien"
                    options={linkTypeOptions}
                    value={form.resourceType}
                    onChange={(event) => setForm((current) => ({ ...current, resourceType: event.target.value as LessonResourceType }))}
                  />
                )}
                <FormInput
                  id="resource-url"
                  label="URL"
                  placeholder="https://..."
                  value={form.url}
                  onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                />
              </>
            ) : editingResource ? (
              <p className="text-sm text-text-secondary">
                Le fichier importé ne peut pas être remplacé. Supprimez la ressource puis ajoutez-en une nouvelle si nécessaire.
              </p>
            ) : (
              <div>
                <label htmlFor="resource-file" className="mb-1.5 block text-sm font-medium text-text-primary">
                  Fichier
                </label>
                <input
                  id="resource-file"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary-tint file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary-tint"
                />
                <p className="mt-1.5 text-xs text-text-muted">PDF, document, image ou vidéo.</p>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
                className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveResource()}
                disabled={isSaving}
                className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Enregistrement...' : editingResource ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <DeleteModal
          itemName={deleteTarget.title}
          isDeleting={isDeleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteResource()}
        />
      )}
    </div>
  );
}
