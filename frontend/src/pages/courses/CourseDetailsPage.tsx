import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock,
  Star, Lock, Unlock, Play, X, ShoppingCart, Award, Download, Volume2, Globe, ArrowUp
} from 'lucide-react';
import { adminApi, type CourseResponse } from '@/api/admin';
import { enrollmentsApi, type EnrollmentResponse } from '@/api/enrollments';
import { cartApi } from '@/api/cart';
import { lessonService, type LessonResponse } from '@/api/lessonService';
import { useAuth } from '@/auth/AuthContext';
import { normalizeRole } from '@/auth/roleRoutes';
import { useMyEnrollments, useMyCart } from '@/api/hooks';
import { CourseReviewsSection } from '@/components/courses/CourseReviewsSection';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { VideoPlayer } from '@/components/ui/VideoPlayer';

function currency(value: number, code?: string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: code ?? 'MAD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

export default function CourseDetailsPage() {
  const { id = '' } = useParams();
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'cours' | 'bande-annonce' | 'details' | 'professeur'>('cours');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const {
    data: course,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['courses', 'detail', id],
    queryFn: async (): Promise<CourseResponse> => {
      const response = await adminApi.getCourseById(id);
      return response.data;
    },
    enabled: Boolean(id),
  });

  const { data: enrollments } = useMyEnrollments();
  const { data: cart } = useMyCart();

  const isEnrolled = useMemo(
    () => (enrollments ?? []).some((e: EnrollmentResponse) => e.courseId === id),
    [enrollments, id]
  );

  const isInCart = useMemo(
    () => (cart?.items ?? []).some((item) => item.courseId === id),
    [cart, id]
  );

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentsApi.enroll(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', 'mine'] });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: () => cartApi.addItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', 'mine'] });
    },
  });

  const role = user ? normalizeRole(user.role) : null;
  const isStudent = role === 'STUDENT';
  const isFree = course ? course.price === 0 : false;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-8 bg-[#F7F7F6] min-h-screen">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div>
            <Skeleton className="aspect-video w-full rounded-xl" />
            <Skeleton className="mt-4 h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 bg-[#F7F7F6] min-h-screen flex items-center justify-center">
        <Card className="py-12 px-8 text-center max-w-md border border-[#E5E5E3]">
          <BookOpen className="mx-auto h-10 w-10 text-[#6B7280]" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-bold text-[#202124]">Cours introuvable</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Ce cours est introuvable ou n’est plus disponible.
          </p>
          <Link to="/courses" className="mt-6 inline-block">
            <Button variant="outline">Retour au catalogue</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const hasRating = course.averageRating != null && course.averageRating > 0;
  const hours = Math.floor(course.durationMinutes / 60);
  const minutes = course.durationMinutes % 60;
  const durationFormatted = hours > 0 ? `${hours} heures${minutes ? ` et ${minutes} minutes` : ''}` : `${course.durationMinutes} minutes`;

  return (
    <div className="min-h-screen bg-[#F7F7F6] text-[#202124] pb-24 selection:bg-[#F4571C]/20">
      {/* Top Metadata Chips Row */}
      <div className="bg-[#FFFFFF] border-b border-[#E5E5E3] py-3 px-6 shadow-sm">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-[#6B7280]">
          <div className="flex flex-wrap items-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#F4571C]" />
              CERTIFICAT D'ACHÈVEMENT
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[#F4571C]" />
              {durationFormatted}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-4 w-4 text-[#F4571C]" />
              Ressources incluses
            </span>
          </div>
          <div className="flex items-center gap-4 text-[#202124]">
            <span className="inline-flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5 text-[#6B7280]" />
              Audio : Français
            </span>
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-[#6B7280]" />
              Support multilingue
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Left / Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Title & Subtitle */}
            <div className="space-y-4">
              {course.categoryName && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#B9E4C9]/40 text-[#0F5132]">
                  {course.categoryName}
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#202124] leading-tight font-display">
                {course.title}
              </h1>
              {course.subtitle && (
                <p className="text-lg text-[#6B7280] leading-relaxed">
                  {course.subtitle}
                </p>
              )}
            </div>

            {/* Trailer / Hero Preview Box */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#101623] shadow-lg border border-[#E5E5E3] group">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="h-full w-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#9AA0A6]">
                  <BookOpen className="h-16 w-16" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <button
                  onClick={() => setShowTrailerModal(true)}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#202124] shadow-2xl hover:scale-110 transition-transform focus:outline-none focus:ring-4 focus:ring-white/50"
                  aria-label="Lire la bande-annonce"
                >
                  <Play className="h-8 w-8 fill-current ml-1 text-[#F4571C]" />
                </button>
              </div>
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-md text-white text-xs font-medium">
                  Bande-annonce du cours
                </span>
              </div>
            </div>

            {/* Spec Table */}
            <div className="overflow-hidden rounded-xl border border-[#E5E5E3] bg-[#FFFFFF] shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-5 text-center divide-x divide-y sm:divide-y-0 divide-[#E5E5E3] text-xs">
                <div className="p-4">
                  <span className="block text-[#6B7280] uppercase tracking-wider font-semibold">Catégorie</span>
                  <span className="mt-1 block font-bold text-[#202124] truncate">{course.categoryName ?? 'Général'}</span>
                </div>
                <div className="p-4">
                  <span className="block text-[#6B7280] uppercase tracking-wider font-semibold">Format</span>
                  <span className="mt-1 block font-bold text-[#202124]">En ligne</span>
                </div>
                <div className="p-4">
                  <span className="block text-[#6B7280] uppercase tracking-wider font-semibold">Langue</span>
                  <span className="mt-1 block font-bold text-[#202124]">Français</span>
                </div>
                <div className="p-4">
                  <span className="block text-[#6B7280] uppercase tracking-wider font-semibold">Durée</span>
                  <span className="mt-1 block font-bold text-[#202124]">{durationFormatted}</span>
                </div>
                <div className="p-4 col-span-2 sm:col-span-1">
                  <span className="block text-[#6B7280] uppercase tracking-wider font-semibold">Niveau</span>
                  <span className="mt-1 block font-bold text-[#202124]">{course.level ?? 'Tous niveaux'}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            {course.description && (
              <section id="details" className="space-y-4 scroll-mt-24">
                <h2 className="text-xl font-bold text-[#202124]">À propos de ce cours</h2>
                <div className="prose max-w-none text-[#5F6368] leading-relaxed text-sm whitespace-pre-wrap bg-[#FFFFFF] p-6 rounded-xl border border-[#E5E5E3]">
                  {course.description}
                </div>
              </section>
            )}

            {/* Learning Objectives */}
            {course.learningObjectives && course.learningObjectives.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-[#202124]">Ce que vous apprendrez</h2>
                <div className="grid gap-3 sm:grid-cols-2 bg-[#FFFFFF] p-6 rounded-xl border border-[#E5E5E3]">
                  {course.learningObjectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-[#5F6368]">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#188038] mt-0.5" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Curriculum Section */}
            <section id="cours" className="space-y-4 scroll-mt-24">
              <h2 className="text-xl font-bold text-[#202124]">Programme et Leçons</h2>
              <CurriculumAccordion courseId={course.id} isEnrolled={isEnrolled} />
            </section>

            {/* Instructor Section */}
            <section id="professeur" className="space-y-4 scroll-mt-24">
              <h2 className="text-xl font-bold text-[#202124]">Votre instructeur</h2>
              <div className="flex items-center gap-4 bg-[#FFFFFF] p-6 rounded-xl border border-[#E5E5E3]">
                <Avatar name={course.instructorName ?? 'Instructeur'} size="lg" className="ring-2 ring-[#F4571C]/20" />
                <div>
                  <h3 className="text-base font-bold text-[#202124]">{course.instructorName ?? 'Expert Awards Academy'}</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">Instructeur senior & formateur agréé</p>
                  <p className="text-xs text-[#5F6368] mt-2 leading-normal">
                    Passionné par la transmission des compétences professionnelles et le développement de projets de haute qualité.
                  </p>
                </div>
              </div>
            </section>

            {/* Reviews Section */}
            <CourseReviewsSection
              courseId={course.id}
              isEnrolled={isEnrolled}
              averageRating={course.averageRating}
              reviewsCount={course.reviewsCount}
            />
          </div>

          {/* Right Sidebar: Pricing & Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <Card padded={false} className="overflow-hidden border border-[#E5E5E3] bg-[#FFFFFF] shadow-lg rounded-2xl">
                <div className="p-6 space-y-6">
                  {/* Badge */}
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-md bg-[#F5D949] text-[#202124] text-xs font-bold uppercase tracking-wider">
                      Populaire
                    </span>
                    {hasRating && (
                      <div className="flex items-center gap-1 text-sm font-bold text-[#202124]">
                        <Star className="h-4 w-4 fill-[#F5D949] text-[#F5D949]" />
                        <span>{formatRating(course.averageRating as number)}</span>
                        <span className="text-xs text-[#6B7280] font-normal">({course.reviewsCount} avis)</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing */}
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-extrabold text-[#202124]">
                        {isFree ? 'Gratuit' : currency(course.discountPrice ?? course.price, course.currency ?? 'MAD')}
                      </span>
                      {course.discountPrice && course.discountPrice < course.price && (
                        <span className="text-sm text-[#9AA0A6] line-through">
                          {currency(course.price, course.currency ?? 'MAD')}
                        </span>
                      )}
                    </div>
                    {course.discountPrice && course.discountPrice < course.price && (
                      <p className="mt-1 text-xs font-bold text-[#F4571C]">
                        Économisez {Math.round((1 - course.discountPrice / course.price) * 100)} % de réduction
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <div>
                    {!isAuthenticated ? (
                      isFree ? (
                        <Link to={`/login?redirect=${encodeURIComponent(`/courses/${id}`)}`}>
                          <Button variant="primary" size="lg" className="w-full bg-[#F4571C] hover:bg-[#E8531B] text-white font-bold py-3.5 rounded-xl shadow-md">
                            Se connecter pour s'inscrire
                          </Button>
                        </Link>
                      ) : (
                        <Link to={`/checkout?course=${encodeURIComponent(id)}`}>
                          <Button variant="primary" size="lg" className="w-full bg-[#F4571C] hover:bg-[#E8531B] text-white font-bold py-3.5 rounded-xl shadow-md">
                            <ShoppingCart className="h-5 w-5" />
                            Acheter
                          </Button>
                        </Link>
                      )
                    ) : !isStudent ? (
                      <Button variant="secondary" size="lg" className="w-full" disabled>
                        Réservé aux étudiants
                      </Button>
                    ) : isEnrolled ? (
                      <Link to={`/learning/${id}`}>
                        <Button variant="primary" size="lg" className="w-full bg-[#188038] hover:bg-[#137333] text-white font-bold py-3.5 rounded-xl">
                          Accéder au cours
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    ) : isInCart ? (
                      <Link to="/cart">
                        <Button variant="outline" size="lg" className="w-full border-[#202124] text-[#202124] hover:bg-[#F4F6F8]">
                          Déjà dans le panier (Voir)
                        </Button>
                      </Link>
                    ) : isFree ? (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-[#188038] hover:bg-[#137333] text-white font-bold py-3.5 rounded-xl"
                        loading={enrollMutation.isPending}
                        onClick={() => enrollMutation.mutate()}
                      >
                        S'inscrire gratuitement
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full bg-[#F4571C] hover:bg-[#E8531B] text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2"
                        loading={addToCartMutation.isPending}
                        onClick={() => addToCartMutation.mutate()}
                      >
                        <ShoppingCart className="h-5 w-5" />
                        Acheter maintenant
                      </Button>
                    )}
                  </div>

                  <dl className="pt-2 border-t border-[#E5E5E3] space-y-2 text-sm text-[#5F6368]">
                    <div className="flex justify-between">
                      <dt>Étudiants inscrits</dt>
                      <dd className="font-semibold text-[#202124]">{course.enrollmentsCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Niveau requis</dt>
                      <dd className="font-semibold text-[#202124]">{course.level ?? 'Tous niveaux'}</dd>
                    </div>
                  </dl>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#101623]/95 backdrop-blur-md border-t border-white/10 text-white shadow-2xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#F4571C] text-white flex items-center justify-center font-bold text-sm shadow">
              W.
            </div>
            <span className="font-bold text-sm tracking-tight truncate hidden sm:inline max-w-xs">
              {course.title}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <a
              href="#cours"
              onClick={() => setActiveTab('cours')}
              className={`px-3 py-1.5 rounded-full transition-colors ${activeTab === 'cours' ? 'bg-[#B9E4C9] text-[#0F5132] font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Cours
            </a>
            <a
              href="#bande-annonce"
              onClick={() => setActiveTab('bande-annonce')}
              className={`px-3 py-1.5 rounded-full transition-colors ${activeTab === 'bande-annonce' ? 'bg-[#B9E4C9] text-[#0F5132] font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Bande-annonce
            </a>
            <a
              href="#details"
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1.5 rounded-full transition-colors ${activeTab === 'details' ? 'bg-[#B9E4C9] text-[#0F5132] font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Détails
            </a>
            <a
              href="#professeur"
              onClick={() => setActiveTab('professeur')}
              className={`px-3 py-1.5 rounded-full transition-colors ${activeTab === 'professeur' ? 'bg-[#B9E4C9] text-[#0F5132] font-bold' : 'text-white/80 hover:text-white'}`}
            >
              Professeur
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-[10px] text-white/60">Prix total</span>
              <span className="text-base font-bold text-white">
                {isFree ? 'Gratuit' : currency(course.discountPrice ?? course.price, course.currency ?? 'MAD')}
              </span>
            </div>
            {!isEnrolled && !isFree && (
              !isAuthenticated ? (
                <Link to={`/checkout?course=${encodeURIComponent(id)}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-[#B9E4C9] hover:bg-[#a3d8be] text-[#0F5132] font-bold px-5 py-2 rounded-full shadow"
                  >
                    Acheter — {currency(course.discountPrice ?? course.price, course.currency ?? 'MAD')}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#B9E4C9] hover:bg-[#a3d8be] text-[#0F5132] font-bold px-5 py-2 rounded-full shadow"
                  onClick={() => addToCartMutation.mutate()}
                  loading={addToCartMutation.isPending}
                >
                  Acheter — {currency(course.discountPrice ?? course.price, course.currency ?? 'MAD')}
                </Button>
              )
            )}
            {isEnrolled && (
              <Link to={`/learning/${id}`}>
                <Button variant="primary" size="sm" className="bg-[#188038] text-white font-bold rounded-full">
                  Accéder
                </Button>
              </Link>
            )}
            <Link
              to="/cart"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors relative"
              aria-label="Panier"
            >
              <ShoppingCart className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 left-6 z-40 p-3 rounded-full bg-[#202124] text-white shadow-xl hover:bg-[#F4571C] transition-colors focus:outline-none"
          aria-label="Remonter en haut"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* Trailer Video Modal */}
      {showTrailerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <button
              onClick={() => setShowTrailerModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
              aria-label="Fermer"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="aspect-video w-full">
              {course.promoVideoUrl ? (
                <VideoPlayer url={course.promoVideoUrl} title="Bande-annonce du cours" />
              ) : course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt="Bande-annonce" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-white">
                  Aucune bande-annonce vidéo disponible.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CurriculumAccordion({ courseId, isEnrolled }: { courseId: string; isEnrolled: boolean }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data: sections, isLoading: isSectionsLoading } = useQuery({
    queryKey: ['sections', 'course', courseId],
    queryFn: async () => {
      const response = await adminApi.getSectionsByCourse(courseId);
      return response.data;
    },
  });

  const { data: lessonsData, isLoading: isLessonsLoading } = useQuery({
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
  });

  const lessons = useMemo(() => lessonsData ?? [], [lessonsData]);

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

  const sortedSections = useMemo(
    () => [...(sections ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [sections]
  );

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const isLoading = isSectionsLoading || isLessonsLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (sortedSections.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-[#6B7280]">
        Aucune section disponible pour le moment.
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {sortedSections.map((section, sIndex) => {
        const secLessons = lessonsBySection[section.id] ?? [];
        const isCollapsed = collapsed[section.id] !== false;
        const totalSecDuration = secLessons.reduce((acc, l) => acc + (l.durationMinutes ?? 0), 0);

        return (
          <li key={section.id} className="bg-[#FFFFFF] rounded-xl border border-[#E5E5E3] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-md bg-[#B9E4C9]/40 text-[#0F5132] font-bold text-xs">
                  Leçon {sIndex + 1}
                </span>
                <span className="font-bold text-base text-[#202124]">{section.title}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block text-xs text-[#6B7280]">
                  <span>{secLessons.length} leçons</span>
                  {totalSecDuration > 0 && <span className="ml-2">· {totalSecDuration} min</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggle(section.id)}
                  className="text-xs font-semibold border-[#E5E5E3] text-[#202124] hover:bg-[#F4F6F8]"
                >
                  {isCollapsed ? 'Voir plus' : 'Voir moins'}
                  {isCollapsed ? <ChevronRight className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {!isCollapsed && secLessons.length > 0 && (
              <ul className="border-t border-[#E5E5E3] divide-y divide-[#E5E5E3] bg-[#FAFBFC]">
                {secLessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center justify-between px-6 py-3.5 text-sm">
                    <div className="flex items-center gap-3">
                      {isEnrolled ? (
                        <Unlock className="h-4 w-4 text-[#188038] shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-[#202124] shrink-0" />
                      )}
                      {isEnrolled ? (
                        <Link to={`/learning/${courseId}?lessonId=${lesson.id}`} className="font-medium text-[#202124] hover:text-[#F4571C] transition-colors">
                          {lesson.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-[#5F6368]">{lesson.title}</span>
                      )}
                      {!isEnrolled && lesson.isFreePreview && (
                        <span className="rounded bg-[#F5D949]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[#202124]">
                          Aperçu gratuit
                        </span>
                      )}
                    </div>
                    {lesson.durationMinutes > 0 && (
                      <span className="text-xs font-mono text-[#6B7280]">
                        {lesson.durationMinutes} minutes
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
