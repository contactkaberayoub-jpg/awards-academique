import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { adminApi, type CourseResponse, type SectionResponse } from '@/api/admin';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormInput } from '@/components/admin/FormInput';
import { FormSelect } from '@/components/admin/FormSelect';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

const sectionSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire').max(255, 'Le titre ne doit pas dépasser 255 caractères'),
  displayOrder: z.number().int('L\'ordre doit être un nombre entier').min(0, 'L\'ordre ne peut pas être négatif'),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

const emptySection: SectionFormValues = { title: '', displayOrder: 0 };

export default function SectionsPage() {
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [isSectionsLoading, setIsSectionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SectionResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: emptySection,
  });

  const loadCourses = useCallback(async () => {
    setIsCoursesLoading(true);
    try {
      const response = await adminApi.getCourses();
      setCourses(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les cours.'));
    } finally {
      setIsCoursesLoading(false);
    }
  }, []);

  const loadSections = useCallback(async (courseId: string) => {
    if (!courseId) {
      setSections([]);
      return;
    }

    setIsSectionsLoading(true);
    try {
      const response = await adminApi.getSectionsByCourse(courseId);
      setSections(response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les sections de ce cours.'));
    } finally {
      setIsSectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    void loadSections(selectedCourseId);
  }, [loadSections, selectedCourseId]);

  const courseOptions = useMemo(
    () => courses.map((course) => ({ value: course.id, label: course.title })),
    [courses]
  );

  function openCreateForm() {
    setEditingSection(null);
    reset(emptySection);
    setIsFormOpen(true);
  }

  function openEditForm(section: SectionResponse) {
    setEditingSection(section);
    reset({ title: section.title, displayOrder: section.displayOrder ?? 0 });
    setIsFormOpen(true);
  }

  async function saveSection(values: SectionFormValues) {
    if (!selectedCourseId) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      if (editingSection) {
        await adminApi.updateSection(editingSection.id, values);
      } else {
        await adminApi.createSection({ ...values, courseId: selectedCourseId });
      }
      setIsFormOpen(false);
      setSuccessMessage(`Section ${editingSection ? 'modifiée' : 'créée'} avec succès.`);
      await loadSections(selectedCourseId);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, `Impossible de ${editingSection ? 'modifier' : 'créer'} la section.`));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSection() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await adminApi.deleteSection(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage('Section supprimée avec succès.');
      await loadSections(selectedCourseId);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer la section.'));
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<SectionResponse>[] = [
    { key: 'order', header: 'Ordre', render: (section) => section.displayOrder ?? '—' },
    { key: 'title', header: 'Titre', render: (section) => <span className="font-medium text-text-primary">{section.title}</span> },
    { key: 'createdAt', header: 'Créée le', render: (section) => formatDate(section.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-28',
      render: (section) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => openEditForm(section)} className="rounded-sm p-1.5 text-primary hover:bg-primary-tint" aria-label={`Modifier ${section.title}`}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setDeleteTarget(section)} className="rounded-sm p-1.5 text-error hover:bg-error-tint" aria-label={`Supprimer ${section.title}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sections"
        description="Choisissez un cours, puis créez et gérez ses sections."
        action={
          <button type="button" onClick={openCreateForm} disabled={!selectedCourseId} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" />
            Ajouter une section
          </button>
        }
      />
      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />
      {isCoursesLoading ? (
        <Loading label="Chargement des cours..." />
      ) : (
        <div className="mb-6 max-w-xl">
          <FormSelect id="section-course" label="Cours" placeholder="Choisissez un cours" options={courseOptions} value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)} />
        </div>
      )}
      {!isCoursesLoading && !selectedCourseId && <EmptyState title="Choisissez un cours" description="Sélectionnez un cours pour voir et gérer ses sections." />}
      {selectedCourseId && (isSectionsLoading ? (
        <Loading label="Chargement des sections..." />
      ) : sections.length === 0 ? (
        <EmptyState title="Aucune section pour le moment" description="Ajoutez la première section de ce cours." />
      ) : (
        <DataTable columns={columns} data={sections} getRowKey={(section) => section.id} />
      ))}

      {isFormOpen && (
        <Modal title={editingSection ? 'Modifier la section' : 'Ajouter une section'} onClose={() => setIsFormOpen(false)}>
          <form className="space-y-4" noValidate onSubmit={handleSubmit(saveSection)}>
            <FormInput id="section-title" label="Titre" error={errors.title?.message} {...register('title')} />
            <FormInput id="section-order" label="Ordre" type="number" min="0" error={errors.displayOrder?.message} {...register('displayOrder', { valueAsNumber: true })} />
            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60">Annuler</button>
              <button type="submit" disabled={isSaving} className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Enregistrement...' : 'Enregistrer la section'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && <DeleteModal itemName={deleteTarget.title} isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteSection()} />}
    </div>
  );
}
