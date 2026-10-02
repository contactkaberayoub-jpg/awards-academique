import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, ChevronRight,
  FileText, Video, Download, AlertCircle, Menu, X, PlayCircle, Bot, Lock, GraduationCap,
} from 'lucide-react';
import { adminApi, type CourseResponse, type SectionResponse } from '@/api/admin';
import { lessonService, type LessonResponse } from '@/api/lessonService';
import { progressApi, type CourseProgressResponse } from '@/api/progress';
import { lessonResourcesApi, type LessonResourceResponse } from '@/api/resources';
import { getApiErrorMessage } from '@/lib/apiError';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import LessonRichContentView from '@/components/editor/LessonRichContentView';
import { useAuth } from '@/auth/AuthContext';
import { AITutorPanel } from '@/components/student/AITutorPanel';
import { LessonQuizGate } from '@/components/student/LessonQuizGate';
import { FinalExamGate } from '@/components/student/FinalExamGate';

export default function LearningPage() {
  const { courseId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const urlLessonId = searchParams.get('lessonId');

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLessonResolved, setInitialLessonResolved] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [finalExamOpen, setFinalExamOpen] = useState(false);

  // 1. Fetch course details
  const {
    data: course,
    isLoading: isCourseLoading,
    error: courseError,
  } = useQuery({
    queryKey: ['courses', 'detail', courseId],
    queryFn: async (): Promise<CourseResponse> => {
      const res = await adminApi.getCourseById(courseId);
      return res.data;
    },
    enabled: Boolean(courseId),
  });

  // 2. Fetch course sections
  const {
    data: sections = [],
    isLoading: isSectionsLoading,
  } = useQuery({
    queryKey: ['sections', 'course', courseId],
    queryFn: async (): Promise<SectionResponse[]> => {
      const res = await adminApi.getSectionsByCourse(courseId);
      return res.data;
    },
    enabled: Boolean(courseId),
  });

  // 3. Fetch lessons for course
  const {
    data: lessonsData,
    isLoading: isLessonsLoading,
    error: lessonsError,
  } = useQuery({
    queryKey: ['lessons', 'course', courseId],
    queryFn: async () => {
      const res = await lessonService.getPage({
        courseId,
        size: 100,
        sortBy: 'displayOrder',
        direction: 'ASC',
      });
      return res.data.content;
    },
    enabled: Boolean(courseId),
  });

  // 4. Fetch course progress
  const {
    data: progress,
    refetch: refetchProgress,
  } = useQuery({
    queryKey: ['progress', 'course', courseId],
    queryFn: async (): Promise<CourseProgressResponse> => {
      const res = await progressApi.getCourseProgress(courseId);
      return res.data;
    },
    enabled: Boolean(courseId),
  });

  const lessons = useMemo(() => lessonsData ?? [], [lessonsData]);

  // 5. Fetch per-lesson progress for all lessons (batch)
  const lessonProgressQueries = useQuery({
    queryKey: ['progress', 'lessons', 'batch', courseId],
    queryFn: async (): Promise<Record<string, boolean>> => {
      if (lessons.length === 0) return {};
      const results = await Promise.allSettled(
        lessons.map(async (lesson) => {
          const res = await progressApi.getLessonProgress(lesson.id);
          return { id: lesson.id, completed: res.data.isCompleted };
        })
      );
      const map: Record<string, boolean> = {};
      for (const r of results) {
        if (r.status === 'fulfilled') {
          map[r.value.id] = r.value.completed;
        }
      }
      return map;
    },
    enabled: lessons.length > 0,
  });

  const completedLessonsMap = useMemo(
    () => lessonProgressQueries.data ?? {},
    [lessonProgressQueries.data]
  );

  // Resume logic: URL lessonId > first incomplete lesson > first lesson
  useEffect(() => {
    if (lessons.length === 0 || initialLessonResolved) return;

    if (urlLessonId && lessons.some((l) => l.id === urlLessonId)) {
      setSelectedLessonId(urlLessonId);
    } else {
      const unlockedLessons = lessons.filter((l) => l.unlocked !== false);
      if (Object.keys(completedLessonsMap).length > 0) {
        const firstIncomplete =
          unlockedLessons.find((l) => !completedLessonsMap[l.id]) ??
          unlockedLessons[0] ??
          lessons[0];
        setSelectedLessonId(firstIncomplete?.id ?? lessons[0].id);
      } else {
        setSelectedLessonId(unlockedLessons[0]?.id ?? lessons[0].id);
      }
    }
    setInitialLessonResolved(true);
  }, [lessons, completedLessonsMap, initialLessonResolved, urlLessonId]);

  // 6. Fetch selected lesson full details
  const {
    data: currentLesson,
    isLoading: isLessonLoading,
  } = useQuery({
    queryKey: ['lessons', 'detail', selectedLessonId],
    queryFn: async (): Promise<LessonResponse> => {
      const res = await lessonService.getById(selectedLessonId as string);
      return res.data;
    },
    enabled: Boolean(selectedLessonId),
  });

  // 7. Fetch resources for selected lesson
  const {
    data: resources = [],
  } = useQuery({
    queryKey: ['resources', 'lesson', selectedLessonId],
    queryFn: async (): Promise<LessonResourceResponse[]> => {
      const res = await lessonResourcesApi.getByLesson(selectedLessonId as string);
      return res.data;
    },
    enabled: Boolean(selectedLessonId),
  });

  // Mark lesson completed mutation
  const completeMutation = useMutation({
    mutationFn: (lessonId: string) => progressApi.markLessonCompleted(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progress', 'course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['progress', 'lessons', 'batch', courseId] });
      queryClient.invalidateQueries({ queryKey: ['lessons', 'course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['lessons', 'detail', selectedLessonId] });
      refetchProgress();
    },
  });

  const initialPlaybackTime = useMemo(() => {
    if (!currentLesson || !user) return 0;
    try {
      const saved = localStorage.getItem(`awards_video_pos_${user.userId}_${currentLesson.id}`);
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  }, [currentLesson, user]);

  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (!currentLesson || !user) return;
    const progressPercent = (currentTime / duration) * 100;

    try {
      localStorage.setItem(`awards_video_pos_${user.userId}_${currentLesson.id}`, currentTime.toString());
    } catch {}

    if (progressPercent >= 90 && !completedLessonsMap[currentLesson.id] && !completeMutation.isPending) {
      completeMutation.mutate(currentLesson.id);
    }
  }, [currentLesson, user, completedLessonsMap, completeMutation]);

  const handleVideoPause = useCallback((currentTime: number) => {
    if (!currentLesson || !user) return;
    try {
      localStorage.setItem(`awards_video_pos_${user.userId}_${currentLesson.id}`, currentTime.toString());
    } catch {}
  }, [currentLesson, user]);

  const handleVideoEnded = useCallback(() => {
    if (!currentLesson) return;
    if (!completedLessonsMap[currentLesson.id] && !completeMutation.isPending) {
      completeMutation.mutate(currentLesson.id);
    }
    if (user) {
      try {
        localStorage.removeItem(`awards_video_pos_${user.userId}_${currentLesson.id}`);
      } catch {}
    }
  }, [currentLesson, user, completedLessonsMap, completeMutation]);

  // Group lessons by section ID
  const lessonsBySection = useMemo(() => {
    const map: Record<string, LessonResponse[]> = {};
    for (const lesson of lessons) {
      if (!map[lesson.sectionId]) {
        map[lesson.sectionId] = [];
      }
      map[lesson.sectionId].push(lesson);
    }
    for (const secId of Object.keys(map)) {
      map[secId].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }
    return map;
  }, [lessons]);

  // Sorted sections
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [sections]);

  // Find previous and next lessons across all sections
  const { prevLesson, nextLesson, currentLessonIndex, totalLessons } = useMemo(() => {
    if (!selectedLessonId || lessons.length === 0) {
      return { prevLesson: null, nextLesson: null, currentLessonIndex: 0, totalLessons: lessons.length };
    }
    const idx = lessons.findIndex((l) => l.id === selectedLessonId);
    return {
      prevLesson: idx > 0 ? lessons[idx - 1] : null,
      nextLesson: idx >= 0 && idx < lessons.length - 1 ? lessons[idx + 1] : null,
      currentLessonIndex: idx >= 0 ? idx + 1 : 1,
      totalLessons: lessons.length,
    };
  }, [lessons, selectedLessonId]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Ensure a section is expanded when selecting a lesson inside it
  const expandSectionForLesson = useCallback(
    (lesson: LessonResponse) => {
      setCollapsedSections((prev) => {
        if (prev[lesson.sectionId] !== false) {
          return { ...prev, [lesson.sectionId]: false };
        }
        return prev;
      });
    },
    []
  );

  const handleSelectLesson = useCallback(
    (lesson: LessonResponse) => {
      setSelectedLessonId(lesson.id);
      setFinalExamOpen(false);
      expandSectionForLesson(lesson);
      setSidebarOpen(false);
    },
    [expandSectionForLesson]
  );

  const handlePrevLesson = useCallback(() => {
    if (prevLesson) {
      setSelectedLessonId(prevLesson.id);
      setFinalExamOpen(false);
      expandSectionForLesson(prevLesson);
    }
  }, [prevLesson, expandSectionForLesson]);

  const handleNextLesson = useCallback(() => {
    if (nextLesson && nextLesson.unlocked !== false) {
      setSelectedLessonId(nextLesson.id);
      setFinalExamOpen(false);
      expandSectionForLesson(nextLesson);
    }
  }, [nextLesson, expandSectionForLesson]);

  const isLoading = isCourseLoading || isSectionsLoading || isLessonsLoading;
  const hasAccessError = courseError || lessonsError;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-tertiary">
        <div className="space-y-4 text-center">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <p className="text-sm font-medium text-text-secondary">Chargement de votre espace d'apprentissage...</p>
        </div>
      </div>
    );
  }

  if (hasAccessError) {
    const errorMsg = getApiErrorMessage(hasAccessError, '');
    const isForbidden =
      errorMsg.includes('enrollment') ||
      errorMsg.includes('permission') ||
      errorMsg.includes('403') ||
      errorMsg.includes('accès') ||
      errorMsg.includes('not enrolled');

    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <Card className="p-8">
          <AlertCircle className="mx-auto h-12 w-12 text-error" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-text-primary">Accès restreint ou non autorisé</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {isForbidden
              ? 'Vous devez posséder une inscription active pour accéder au contenu de ce cours.'
              : 'Une erreur est survenue lors du chargement du cours. Veuillez vérifier que vous y êtes bien inscrit.'}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link to={`/courses/${courseId}`}>
              <Button variant="primary">Retour au cours</Button>
            </Link>
            <Link to="/courses">
              <Button variant="outline">Catalogue des cours</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const totalCompleted = Object.values(completedLessonsMap).filter(Boolean).length;
  const courseProgressPercent = progress?.completionPercentage
    ? Number(progress.completionPercentage)
    : totalLessons > 0
      ? Math.round((totalCompleted / totalLessons) * 100)
      : 0;

  const isCurrentLessonCompleted = currentLesson
    ? Boolean(completedLessonsMap[currentLesson.id])
    : false;

  // With a final exam configured, lesson steps are capped at 70% of the course progress:
  // reaching 70% means every lesson step is satisfied, which unlocks the final exam.
  const finalExamUnlocked =
    progress?.finalQuizConfigured === true && Number(progress.completionPercentage) >= 70;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-tertiary">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar: Curriculum */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-border bg-surface
          transition-transform duration-200 lg:relative lg:translate-x-0 lg:w-96 shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-6">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au cours
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-text-muted hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Course Progress Summary */}
        <div className="border-b border-border p-4 bg-surface-secondary/50">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary mb-1.5">
            <span>Progression du cours</span>
            <span>{courseProgressPercent}%</span>
          </div>
          <Progress value={courseProgressPercent} className="h-2" />
          <p className="mt-2 text-xs text-text-muted">
            {totalCompleted} sur {totalLessons} leçons terminées
          </p>
        </div>

        {/* Sections & Lessons Tree */}
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {sortedSections.length === 0 ? (
            <div className="p-6 text-center text-sm text-text-muted">Aucune section disponible.</div>
          ) : (
            sortedSections.map((section, sIndex) => {
              const secLessons = lessonsBySection[section.id] ?? [];
              const isCollapsed = collapsedSections[section.id];
              const completedInSection = secLessons.filter(
                (l) => completedLessonsMap[l.id]
              ).length;

              return (
                <div key={section.id} className="bg-surface">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2 font-medium text-text-primary text-sm">
                      <span className="text-xs text-text-muted font-semibold">Section {sIndex + 1}</span>
                      <span className="truncate">{section.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {completedInSection}/{secLessons.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-text-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-text-muted" />
                      )}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <ul className="pb-2">
                      {secLessons.length === 0 ? (
                        <li className="px-6 py-2 text-xs text-text-muted italic">
                          Aucune leçon dans cette section.
                        </li>
                      ) : (
                        secLessons.map((lesson) => {
                          const isSelected = lesson.id === selectedLessonId;
                          const isCompleted = Boolean(completedLessonsMap[lesson.id]);
                          const isLocked = lesson.unlocked === false;
                          const icon = isCompleted ? (
                            <Check className="h-4 w-4 shrink-0 text-success" />
                          ) : isLocked ? (
                            <Lock className="h-4 w-4 shrink-0 text-text-muted" />
                          ) : lesson.lessonType === 'video' ? (
                            <Video className="h-4 w-4 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0" />
                          );
                          return (
                            <li key={lesson.id}>
                              <button
                                onClick={() => handleSelectLesson(lesson)}
                                disabled={isLocked}
                                className={`flex w-full items-center gap-3 px-6 py-2.5 text-left text-sm transition-colors ${
                                  isLocked
                                    ? 'cursor-not-allowed text-text-muted'
                                    : isSelected
                                      ? 'bg-primary/10 text-primary font-medium border-l-4 border-primary'
                                      : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
                                }`}
                                aria-disabled={isLocked}
                              >
                                {icon}
                                <span className="flex-1 truncate">{lesson.title}</span>
                                {isLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-text-muted" />}
                                {!isLocked && lesson.durationMinutes > 0 && (
                                  <span className="text-xs text-text-muted shrink-0">
                                    {lesson.durationMinutes} min
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Final exam entry (course-level quiz, lesson_id IS NULL) */}
        {progress?.finalQuizConfigured && progress.finalQuizId && (
          <div className="border-t border-border p-3">
            <button
              onClick={() => { setFinalExamOpen(true); setSidebarOpen(false); }}
              disabled={!finalExamUnlocked}
              aria-disabled={!finalExamUnlocked}
              className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors ${
                !finalExamUnlocked
                  ? 'cursor-not-allowed text-text-muted'
                  : finalExamOpen
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              }`}
            >
              <GraduationCap
                className={`h-4 w-4 shrink-0 ${
                  progress.finalQuizPassed ? 'text-success' : finalExamUnlocked ? 'text-primary' : 'text-text-muted'
                }`}
              />
              <span className="flex-1 truncate">Examen final</span>
              {progress.finalQuizPassed ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                  <Check className="h-4 w-4" />Validé
                </span>
              ) : finalExamUnlocked ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
              ) : (
                <Lock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              )}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden bg-surface">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-text-secondary hover:text-text-primary rounded-md hover:bg-surface-secondary"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Badge variant="primary" size="sm">{course?.title}</Badge>
            <span className="text-sm text-text-muted hidden sm:inline">
              {finalExamOpen ? 'Examen final' : `Leçon ${currentLessonIndex} sur ${totalLessons}`}
            </span>
          </div>

          {currentLesson && !finalExamOpen && (
            <Button
              variant={isCurrentLessonCompleted ? 'soft' : 'secondary'}
              size="sm"
              onClick={() => {
                if (!isCurrentLessonCompleted) {
                  completeMutation.mutate(currentLesson.id);
                }
              }}
              loading={completeMutation.isPending}
              disabled={isCurrentLessonCompleted}
            >
              {isCurrentLessonCompleted ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  Terminée
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Marquer comme terminée
                </>
              )}
            </Button>
          )}
        </header>

        {/* Lesson Viewport */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {finalExamOpen && progress?.finalQuizId ? (
            <div className="mx-auto max-w-4xl space-y-6 pb-12">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Examen final du cours
                </div>
                <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Examen final</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Complété à la fin du parcours, il vaut 30 % de la progression du cours
                  (les leçons comptent pour 70 %).
                </p>
              </div>

              {!finalExamUnlocked ? (
                <Card className="p-6">
                  <div className="flex items-start gap-3">
                    <Lock className="h-6 w-6 shrink-0 text-text-muted" aria-hidden="true" />
                    <div>
                      <h2 className="text-lg font-semibold text-text-primary">Examen verrouillé</h2>
                      <p className="mt-1 text-sm text-text-secondary">
                        Terminez toutes les leçons et réussissez les QCM obligatoires pour débloquer
                        l'examen final.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <FinalExamGate
                  courseId={courseId}
                  quizId={progress.finalQuizId}
                  onBackToCourse={() => setFinalExamOpen(false)}
                  onCompleted={() => {
                    queryClient.invalidateQueries({ queryKey: ['progress', 'course', courseId] });
                    refetchProgress();
                  }}
                />
              )}

              <div className="flex items-center justify-between border-t border-border pt-6">
                <Button variant="outline" onClick={() => setFinalExamOpen(false)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la leçon
                </Button>
              </div>
            </div>
          ) : isLessonLoading ? (
            <div className="mx-auto max-w-4xl space-y-6">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !currentLesson ? (
            <div className="flex h-full items-center justify-center text-text-muted">
              Sélectionnez une leçon dans le menu de gauche pour commencer.
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-6 pb-12">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  {currentLesson.lessonType === 'video' && <PlayCircle className="h-3.5 w-3.5" />}
                  {currentLesson.lessonType}
                  {currentLesson.durationMinutes > 0 && (
                    <span>• {currentLesson.durationMinutes} minutes</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{currentLesson.title}</h1>
              </div>

              {/* Video Player */}
              {currentLesson.lessonType === 'video' && currentLesson.videoUrl && (
                <VideoPlayer
                  key={currentLesson.id}
                  url={currentLesson.videoUrl}
                  title={currentLesson.title}
                  initialTime={initialPlaybackTime}
                  onTimeUpdate={handleTimeUpdate}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnded}
                />
              )}

              {/* No video placeholder for video lessons */}
              {currentLesson.lessonType === 'video' && !currentLesson.videoUrl && (
                <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-surface-tertiary border border-border">
                  <div className="text-center space-y-2">
                    <PlayCircle className="mx-auto h-12 w-12 text-text-muted" />
                    <p className="text-sm text-text-muted">Aucune vidéo disponible pour cette leçon.</p>
                  </div>
                </div>
              )}

              {/* Lesson Text Content */}
              {currentLesson.content && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-3">Contenu de la leçon</h2>
                  <LessonRichContentView content={currentLesson.content} />
                </Card>
              )}

              {/* Resources & Downloads */}
              {resources.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-3">Ressources associées</h2>
                  <ul className="divide-y divide-border">
                    {resources.map((res) => (
                      <li key={res.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{res.title}</p>
                            <span className="text-xs text-text-muted uppercase">{res.resourceType}</span>
                          </div>
                        </div>
                        {res.fileUrl && (
                          <a
                            href={res.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                          >
                            <Download className="h-4 w-4" />
                            Télécharger
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Mandatory Lesson -> Quiz Gate. Only unlocked after the lesson itself is
                  completed: hidden before completion, visible immediately after completion. */}
              {isCurrentLessonCompleted && currentLesson.mandatoryQuizId && (
                <LessonQuizGate
                  courseId={courseId}
                  quizId={currentLesson.mandatoryQuizId}
                  onGatePassed={() => {
                    queryClient.invalidateQueries({ queryKey: ['lessons', 'course', courseId] });
                    refetchProgress();
                  }}
                />
              )}

              {/* Previous / Next Lesson Footer Navigation */}
              <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={handlePrevLesson}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Leçon précédente
                </Button>

                <div className="flex items-center gap-3">
                  {nextLesson && nextLesson.unlocked === false && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                      <Lock className="h-3.5 w-3.5" />
                      Terminez la leçon et réussissez son QCM pour débloquer
                    </span>
                  )}
                  <Button
                    variant="primary"
                    disabled={!nextLesson || nextLesson.unlocked === false}
                    onClick={handleNextLesson}
                  >
                    Leçon suivante
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* AI Tutor floating action */}
      {currentLesson && !tutorOpen && (
        <button
          onClick={() => setTutorOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-fast hover:bg-primary-hover"
        >
          <Bot className="h-5 w-5" aria-hidden="true" />
          Tuteur IA
        </button>
      )}

      {tutorOpen && currentLesson && (
        <AITutorPanel
          courseId={courseId}
          lesson={currentLesson}
          onClose={() => setTutorOpen(false)}
        />
      )}
    </div>
  );
}
