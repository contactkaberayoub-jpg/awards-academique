import { zodResolver } from '@hookform/resolvers/zod';
import { FileVideo, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { adminApi, type CourseResponse, type SectionResponse } from '@/api/admin';
import {
  lessonService,
  type LessonResponse,
  type LessonStatus,
  type LessonType,
} from '@/api/lessonService';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DeleteModal } from '@/components/admin/DeleteModal';
import { EmptyState } from '@/components/admin/EmptyState';
import { FormInput } from '@/components/admin/FormInput';
import { FormSelect } from '@/components/admin/FormSelect';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { Loading } from '@/components/admin/Loading';
import { Modal } from '@/components/admin/Modal';
import { Notice } from '@/components/admin/Notice';
import { PageHeader } from '@/components/admin/PageHeader';
import { SearchInput } from '@/components/admin/SearchInput';
import { useAuth } from '@/auth/AuthContext';
import { instructorApi } from '@/api/instructor';
import { useLessons } from '@/hooks/useLessons';
import { getApiErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/formatDate';

/** Removes HTML tags/entities so only real text remains (for validation only). */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const lessonSchema = z.object({
  sectionId: z.string().uuid('Sélectionnez une section'),
  title: z.string().trim().min(1, 'Le titre est obligatoire').max(255, 'Le titre ne doit pas dépasser 255 caractères'),
  content: z.string(),
  lessonType: z.enum(['video', 'text', 'pdf', 'quiz', 'assignment']),
  videoUrl: z.string().refine(
    (value) => value === '' || z.string().url().safeParse(value).success || /^\/api\/lessons\/videos\/[^/]+$/.test(value),
    'Saisissez une URL valide',
  ),
  displayOrder: z.number().int('L\'ordre doit être un nombre entier').min(0, 'L\'ordre ne peut pas être négatif'),
  durationMinutes: z.number().int('La durée doit être un nombre entier').min(0, 'La durée ne peut pas être négative'),
  isFreePreview: z.boolean(),
  status: z.enum(['draft', 'archived']),
}).superRefine((values, context) => {
  if (values.lessonType !== 'video' && !stripHtml(values.content)) {
    context.addIssue({ code: 'custom', path: ['content'], message: 'La description est obligatoire pour ce type de leçon' });
  }
});

type LessonFormValues = z.infer<typeof lessonSchema>;

const emptyLesson: LessonFormValues = {
  sectionId: '',
  title: '',
  content: '',
  lessonType: 'text',
  videoUrl: '',
  displayOrder: 0,
  durationMinutes: 0,
  isFreePreview: false,
  status: 'draft',
};

const statusFilterOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
];

const editableStatusOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'archived', label: 'Archivé' },
];

const lessonTypeOptions = [
  { value: 'text', label: 'Texte' },
  { value: 'video', label: 'Vidéo' },
  { value: 'pdf', label: 'PDF' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'assignment', label: 'Exercice' },
];

function statusClass(status: LessonStatus) {
  if (status === 'published') return 'bg-success-tint text-success';
  if (status === 'archived') return 'bg-surface-tertiary text-text-secondary';
  return 'bg-warning-tint text-warning';
}

function statusLabel(status: LessonStatus) {
  const labels: Record<LessonStatus, string> = {
    draft: 'Brouillon',
    published: 'Publié',
    archived: 'Archivé',
  };
  return labels[status];
}

function lessonTypeLabel(type: LessonType) {
  const labels: Record<LessonType, string> = {
    text: 'Texte',
    video: 'Vidéo',
    pdf: 'PDF',
    quiz: 'Quiz',
    assignment: 'Exercice',
  };
  return labels[type];
}

export default function InstructorLessonsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseResponse[]>([]);
  const [sections, setSections] = useState<SectionResponse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(searchParams.get('course') ?? '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [statusFilter, setStatusFilter] = useState<LessonStatus | ''>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'displayOrder' | 'title' | 'createdAt' | 'durationMinutes' | 'status'>('displayOrder');
  const [direction, setDirection] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(0);
  const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LessonResponse | null>(null);
  const [videoTarget, setVideoTarget] = useState<LessonResponse | null>(null);
  const [videoDeleteTarget, setVideoDeleteTarget] = useState<LessonResponse | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoSaving, setIsVideoSaving] = useState(false);
  const [isCoursesLoading, setIsCoursesLoading] = useState(true);
  const [isSectionsLoading, setIsSectionsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: lessonPage, isLoading, error: loadError, invalidate } = useLessons({
    courseId: selectedCourseId || undefined,
    sectionId: selectedSectionId || undefined,
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    size: 10,
    sortBy,
    direction,
  });

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: emptyLesson,
  });
  const lessonType = watch('lessonType');

  const loadCourses = useCallback(async () => {
    if (!user) return;
    setIsCoursesLoading(true);
    try {
      const response = await instructorApi.getMyCourses();
      setCourses(response);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les cours.'));
    } finally {
      setIsCoursesLoading(false);
    }
  }, [user]);

  const loadSections = useCallback(async (courseId: string) => {
    if (!courseId) {
      setSections([]);
      setIsSectionsLoading(false);
      return;
    }

    setIsSectionsLoading(true);
    try {
      const response = await adminApi.getSectionsByCourse(courseId);
      setSections(response.data);
      setErrorMessage(null);
    } catch (error) {
      setSections([]);
      setErrorMessage(getApiErrorMessage(error, 'Impossible de charger les sections de ce cours.'));
    } finally {
      setIsSectionsLoading(false);
    }
  }, []);

  useEffect(() => { void loadCourses(); }, [loadCourses]);
  useEffect(() => { void loadSections(selectedCourseId); }, [loadSections, selectedCourseId]);
  useEffect(() => {
    setErrorMessage(loadError ? getApiErrorMessage(loadError, 'Impossible de charger les leçons.') : null);
  }, [loadError]);

  const courseOptions = useMemo(() => courses.map((course) => ({ value: course.id, label: course.title })), [courses]);
  const sectionOptions = useMemo(() => sections.map((section) => ({ value: section.id, label: section.title })), [sections]);
  const selectedCourse = useMemo(() => courses.find((course) => course.id === selectedCourseId) ?? null, [courses, selectedCourseId]);
  const isModifiableCourse = selectedCourse ? selectedCourse.status === 'pending' || selectedCourse.status === 'rejected' : false;

  function changeCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setSelectedSectionId('');
    setPage(0);
    if (courseId) {
      setSearchParams({ course: courseId });
    } else {
      setSearchParams({});
    }
  }

  function openCreateForm() {
    setEditingLesson(null);
    reset({ ...emptyLesson, sectionId: selectedSectionId });
    setIsFormOpen(true);
  }

  async function openEditForm(lesson: LessonResponse) {
    setSelectedCourseId(lesson.courseId);
    setSelectedSectionId(lesson.sectionId);
    await loadSections(lesson.courseId);
    setEditingLesson(lesson);
    reset({
      sectionId: lesson.sectionId,
      title: lesson.title,
      content: lesson.content ?? '',
      lessonType: lesson.lessonType,
      videoUrl: lesson.videoUrl ?? '',
      displayOrder: lesson.displayOrder,
      durationMinutes: lesson.durationMinutes,
      isFreePreview: lesson.isFreePreview,
      status: lesson.status === 'published' ? 'draft' : lesson.status,
    });

    setIsFormOpen(true);
  }

  async function saveLesson(values: LessonFormValues) {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    const payload = {
      title: values.title,
      content: values.content || undefined,
      lessonType: values.lessonType as LessonType,
      videoUrl: values.videoUrl || undefined,
      displayOrder: values.displayOrder,
      durationMinutes: values.durationMinutes,
      isFreePreview: values.isFreePreview,
      status: values.status,
    };

    try {
      if (editingLesson) {
        await lessonService.update(editingLesson.id, { ...payload, sectionId: values.sectionId });
      } else {
        await lessonService.create(values.sectionId, payload);
      }
      setIsFormOpen(false);
      setSuccessMessage(`Leçon ${editingLesson ? 'modifiée' : 'créée'} avec succès.`);
      await invalidate();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, `Impossible de ${editingLesson ? 'modifier' : 'créer'} la leçon.`));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteLesson() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await lessonService.remove(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMessage('Leçon supprimée avec succès.');
      if (lessonPage.content.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        await invalidate();
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer la leçon.'));
    } finally {
      setIsDeleting(false);
    }
  }

  function openVideoManager(lesson: LessonResponse) {
    setVideoFile(null);
    setVideoTarget(lesson);
  }

  async function saveVideo() {
    if (!videoTarget || !videoFile) {
      setErrorMessage('Choisissez d\'abord un fichier vidéo.');
      return;
    }
    setIsVideoSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      if (videoTarget.videoUrl) {
        await lessonService.replaceVideo(videoTarget.id, videoFile);
      } else {
        await lessonService.uploadVideo(videoTarget.id, videoFile);
      }
      setVideoTarget(null);
      setVideoFile(null);
      setSuccessMessage('Vidéo de la leçon enregistrée avec succès.');
      await invalidate();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible d\'enregistrer la vidéo de la leçon.'));
    } finally {
      setIsVideoSaving(false);
    }
  }

  async function deleteVideo() {
    if (!videoDeleteTarget) return;
    setIsDeleting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await lessonService.deleteVideo(videoDeleteTarget.id);
      setVideoDeleteTarget(null);
      setVideoTarget(null);
      setSuccessMessage('Vidéo de la leçon supprimée. La leçon est maintenant un brouillon.');
      await invalidate();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Impossible de supprimer la vidéo de la leçon.'));
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: DataTableColumn<LessonResponse>[] = [
    {
      key: 'title',
      header: 'Titre',
      render: (lesson) => <div><p className="font-medium text-text-primary">{lesson.title}</p><p className="text-xs capitalize text-text-secondary">{lessonTypeLabel(lesson.lessonType)}</p></div>,
    },
    { key: 'course', header: 'Cours', render: (lesson) => lesson.courseTitle },
    { key: 'section', header: 'Section', render: (lesson) => lesson.sectionTitle },
    { key: 'order', header: 'Ordre', render: (lesson) => lesson.displayOrder },
    {
      key: 'preview',
      header: 'Aperçu gratuit',
      render: (lesson) => <span className={`rounded-full px-2 py-1 text-xs font-medium ${lesson.isFreePreview ? 'bg-primary-tint text-primary' : 'bg-surface-tertiary text-text-secondary'}`}>{lesson.isFreePreview ? 'Oui' : 'Non'}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (lesson) => <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClass(lesson.status)}`}>{statusLabel(lesson.status)}</span>,
    },
    { key: 'createdAt', header: 'Créée le', render: (lesson) => formatDate(lesson.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-36',
      render: (lesson) => (
        <div className="flex items-center gap-1">
          {isModifiableCourse && lesson.lessonType === 'video' && <button type="button" onClick={() => openVideoManager(lesson)} className="rounded-sm p-1.5 text-accent hover:bg-accent-tint" aria-label={`Gérer la vidéo de ${lesson.title}`}><FileVideo className="h-4 w-4" /></button>}
          {isModifiableCourse && <button type="button" onClick={() => void openEditForm(lesson)} className="rounded-sm p-1.5 text-primary hover:bg-primary-tint" aria-label={`Modifier ${lesson.title}`}><Pencil className="h-4 w-4" /></button>}
          {isModifiableCourse && <button type="button" onClick={() => setDeleteTarget(lesson)} className="rounded-sm p-1.5 text-error hover:bg-error-tint" aria-label={`Supprimer ${lesson.title}`}><Trash2 className="h-4 w-4" /></button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Leçons"
        description="Créez et gérez les leçons des sections de vos cours."
        action={<button type="button" onClick={openCreateForm} disabled={!selectedCourseId || !isModifiableCourse || isSectionsLoading} className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-4 w-4" />Ajouter une leçon</button>}
      />
      <Notice type="success" message={successMessage} />
      <Notice type="error" message={errorMessage} />
      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <FormSelect id="lesson-course-filter" label="Cours" placeholder="Tous les cours" options={courseOptions} value={selectedCourseId} onChange={(event) => changeCourse(event.target.value)} />
        <FormSelect id="lesson-section-filter" label="Section" placeholder="Toutes les sections" options={sectionOptions} value={selectedSectionId} onChange={(event) => { setSelectedSectionId(event.target.value); setPage(0); }} disabled={!selectedCourseId || isSectionsLoading} />
        <FormSelect id="lesson-status-filter" label="Statut" placeholder="Tous les statuts" options={statusFilterOptions} value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as LessonStatus | ''); setPage(0); }} />
        <FormSelect id="lesson-sort" label="Trier par" options={[{ value: 'displayOrder', label: 'Ordre' }, { value: 'title', label: 'Titre' }, { value: 'createdAt', label: 'Date de création' }, { value: 'durationMinutes', label: 'Durée' }, { value: 'status', label: 'Statut' }]} value={sortBy} onChange={(event) => { setSortBy(event.target.value as typeof sortBy); setPage(0); }} />
        <FormSelect id="lesson-direction" label="Direction" options={[{ value: 'ASC', label: 'Croissant' }, { value: 'DESC', label: 'Décroissant' }]} value={direction} onChange={(event) => { setDirection(event.target.value as typeof direction); setPage(0); }} />
      </div>
      <div className="mb-4"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(0); }} placeholder="Rechercher une leçon..." /></div>
      {isCoursesLoading || isLoading ? <Loading label="Chargement des leçons..." /> : lessonPage.content.length === 0 ? <EmptyState title={search ? 'Aucune leçon trouvée' : 'Aucune leçon pour le moment'} description={search ? 'Essayez une autre recherche.' : 'Choisissez un cours, puis ajoutez la première leçon.'} /> : <><DataTable columns={columns} data={lessonPage.content} getRowKey={(lesson) => lesson.id} /><div className="mt-4 flex items-center justify-between text-sm text-text-secondary"><span>{lessonPage.totalElements} leçon{lessonPage.totalElements > 1 ? 's' : ''}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={lessonPage.first} className="rounded-sm border border-border px-3 py-1.5 hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50">Précédent</button><span>Page {lessonPage.number + 1} sur {Math.max(lessonPage.totalPages, 1)}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={lessonPage.last} className="rounded-sm border border-border px-3 py-1.5 hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50">Suivant</button></div></div></>}

      {isFormOpen && <Modal title={editingLesson ? 'Modifier la leçon' : 'Ajouter une leçon'} onClose={() => setIsFormOpen(false)}><form className="space-y-4" noValidate onSubmit={handleSubmit(saveLesson)}><FormSelect id="lesson-section" label="Section" placeholder="Sélectionnez une section" options={sectionOptions} error={errors.sectionId?.message} {...register('sectionId')} disabled={!selectedCourseId || isSectionsLoading} /><FormInput id="lesson-title" label="Titre" error={errors.title?.message} {...register('title')} />{lessonType === 'text' ? <div><label htmlFor="lesson-content" className="mb-1.5 block text-sm font-medium text-text-secondary">Contenu de la leçon</label><Controller control={control} name="content" render={({ field }) => <RichTextEditor value={field.value ?? ''} onChange={(html) => field.onChange(html)} />} />{errors.content && <p className="mt-1 text-xs text-error">{errors.content.message}</p>}</div> : <div><label htmlFor="lesson-content" className="mb-1.5 block text-sm font-medium text-text-secondary">Description</label><textarea id="lesson-content" rows={4} className={`w-full rounded-sm border px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-focus-ring-subtle ${errors.content ? 'border-error focus:border-error' : 'border-border focus:border-primary'}`} {...register('content')} />{errors.content && <p className="mt-1 text-xs text-error">{errors.content.message}</p>}</div>}{!editingLesson && <p className="rounded-lg bg-primary-tint px-3 py-2 text-xs text-primary">La publication des leçons est gérée par un administrateur.</p>}<div className="grid gap-4 sm:grid-cols-2"><FormSelect id="lesson-type" label="Type de leçon" options={lessonTypeOptions} error={errors.lessonType?.message} {...register('lessonType')} /><FormSelect id="lesson-status" label="Statut" options={editableStatusOptions} error={errors.status?.message} {...register('status')} /></div>{lessonType === 'video' && <FormInput id="lesson-video-url" label="URL vidéo (facultatif pour les brouillons)" type="url" error={errors.videoUrl?.message} {...register('videoUrl')} />}<div className="grid gap-4 sm:grid-cols-2"><FormInput id="lesson-order" label="Ordre" type="number" min="0" error={errors.displayOrder?.message} {...register('displayOrder', { valueAsNumber: true })} /><FormInput id="lesson-duration" label="Durée (minutes)" type="number" min="0" error={errors.durationMinutes?.message} {...register('durationMinutes', { valueAsNumber: true })} /></div><label className="flex items-center gap-2 text-sm text-text-secondary"><input type="checkbox" className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/20" {...register('isFreePreview')} />Aperçu gratuit</label><div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60">Annuler</button><button type="submit" disabled={isSaving} className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Enregistrement...' : 'Enregistrer la leçon'}</button></div></form></Modal>}
      {videoTarget && <Modal title={`Gérer la vidéo : ${videoTarget.title}`} onClose={() => setVideoTarget(null)}><div className="space-y-4"><p className="text-sm text-text-secondary">{videoTarget.videoUrl ? 'Une vidéo est déjà attachée. Un nouvel envoi la remplacera.' : 'Aucune vidéo attachée pour le moment.'}</p><div><label htmlFor="lesson-video-file" className="mb-1.5 block text-sm font-medium text-text-secondary">Fichier vidéo</label><input id="lesson-video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary-tint file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary-tint" /></div><p className="text-xs text-text-secondary">MP4, WebM, MOV ou AVI, jusqu'à 500 Mo.</p><div className="flex justify-between gap-3 border-t border-border pt-4">{videoTarget.videoUrl ? <button type="button" onClick={() => setVideoDeleteTarget(videoTarget)} disabled={isVideoSaving} className="rounded-sm px-4 py-2 text-sm font-medium text-error hover:bg-error-tint disabled:cursor-not-allowed disabled:opacity-60">Supprimer la vidéo</button> : <span />}<div className="flex gap-3"><button type="button" onClick={() => setVideoTarget(null)} disabled={isVideoSaving} className="rounded-sm border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-60">Annuler</button><button type="button" onClick={() => void saveVideo()} disabled={isVideoSaving || !videoFile} className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{isVideoSaving ? 'Enregistrement...' : videoTarget.videoUrl ? 'Remplacer la vidéo' : 'Importer la vidéo'}</button></div></div></div></Modal>}
      {deleteTarget && <DeleteModal itemName={deleteTarget.title} isDeleting={isDeleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteLesson()} />}
      {videoDeleteTarget && <DeleteModal itemName={`la vidéo de ${videoDeleteTarget.title}`} isDeleting={isDeleting} onCancel={() => setVideoDeleteTarget(null)} onConfirm={() => void deleteVideo()} />}
    </div>
  );
}
