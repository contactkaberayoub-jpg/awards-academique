import { motion } from 'framer-motion';
import { Award, BookOpen, CalendarClock, PlayCircle, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTrendingCourses } from '@/api/hooks';
import { fetchMyCertificates } from '@/api/certificates';
import type { CourseResponse } from '@/api/admin';
import { useAuth } from '@/auth/AuthContext';
import { ringStyles, tint, toneFor } from '@/lib/tones';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MilestonePath, romanNumeral } from '@/components/ui/MilestonePath';
import { ParcoursHero } from '@/components/ui/ParcoursHero';
import { Skeleton } from '@/components/ui/Skeleton';

const ACCENT = '#0F766E';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function currency(value: number, code: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
  return formatter.format(value);
}

function CourseCard({ course, index }: { course: CourseResponse; index: number }) {
  const instructorName = course.instructorName ?? 'Awards Académique';
  const tone = toneFor(course.categoryName ?? instructorName ?? course.title);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all duration-normal hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: tone, opacity: 0.6 }} aria-hidden="true" />
      <div className="aspect-video w-full overflow-hidden bg-surface-tertiary">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="h-8 w-8" style={{ color: tint(tone, 0.5) }} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-text-primary">
          {course.title}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full" style={ringStyles(tone, 2)}>
            <Avatar name={instructorName} size="xs" />
          </span>
          <p className="truncate text-xs text-text-secondary">{instructorName}</p>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">
            {course.isFree ? 'Gratuit' : currency(course.price, course.currency ?? 'MAD')}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
            {Number(course.averageRating ?? 0).toFixed(1)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const trending = useTrendingCourses();
  const { data: certificates } = useQuery({
    queryKey: ['certificates', 'mine'],
    queryFn: fetchMyCertificates,
    staleTime: 60000,
  });
  const earnedCertificates = certificates ?? [];

  return (
    <div>
      <ParcoursHero
        accent={ACCENT}
        eyebrow="Votre parcours"
        badge={<Badge variant="success" size="sm" dot>En cours</Badge>}
        title={`${greeting()}, ${user?.firstName ?? 'Étudiant'}`}
        description="Là où vous vous êtes arrêté, et là où vous allez. Chaque cours est une étape sur un chemin — pas un pourcentage à remplir."
        numeral={romanNumeral(1)}
        numeralCaption="Étape actuelle"
        actions={
          <Link
            to="/courses"
            className="inline-flex h-10 items-center gap-2 rounded-sm px-5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-fast hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: ACCENT }}
          >
            <PlayCircle className="h-4 w-4" />
            Parcourir les cours
          </Link>
        }
      />

      <div className="mt-6">
        <SectionHeading
          title="Le Parcours"
          subtitle="Votre chemin, vu comme une suite d'étapes"
        />
        <Card className="p-5 sm:p-6">
          <MilestonePath
            size="md"
            milestones={[
              { label: 'Inscription', sublabel: 'Compte créé', state: 'complete', tone: ACCENT, numeral: romanNumeral(1) },
              { label: 'Premier cours', sublabel: 'À commencer', state: 'current', tone: ACCENT, numeral: romanNumeral(2) },
              { label: 'Compétences', sublabel: 'À venir', state: 'upcoming', tone: ACCENT, numeral: romanNumeral(3) },
              { label: 'Certificat', sublabel: 'Objectif final', state: 'upcoming', tone: ACCENT, numeral: romanNumeral(4) },
            ]}
          />
        </Card>
      </div>

      <div className="mt-6">
        <SectionHeading
          title="À apprendre ensuite"
          subtitle="Les parcours que les étudiants choisissent en ce moment"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trending.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} padded={false} className="overflow-hidden">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </Card>
              ))
            : (trending.data ?? []).map((course, index) => (
                <CourseCard key={course.id} course={course} index={index} />
              ))}
        </div>
      </div>

      <div className="mt-6">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: tint(ACCENT, 0.12), color: ACCENT }}>
              <Award className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Vos récompenses</h2>
              <p className="text-xs text-text-muted">Ce que vous avez gagné — et ce qui s'annonce</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {earnedCertificates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface-secondary/40 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Award className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  Certificats
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  Terminez un parcours (leçons, quiz et examen final) pour obtenir votre premier certificat.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface-secondary/40 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Award className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  Certificats
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-text-primary">
                  {earnedCertificates.length}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                  {earnedCertificates.slice(0, 2).map((certificate) => certificate.courseTitle).join(' · ')}
                  {earnedCertificates.length > 2 ? ' · …' : ''}
                </p>
                <Link
                  to="/student/certificates"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-text-primary underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-text-primary"
                >
                  Voir mes certificats
                </Link>
              </div>
            )}
            <div className="rounded-xl border border-dashed border-border bg-surface-secondary/40 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <CalendarClock className="h-4 w-4 text-text-muted" aria-hidden="true" />
                À venir
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                Aucune échéance pour le moment. Vos rappels apparaîtront ici.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/60 px-4 py-3">
            <TrendingUp className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <p className="text-sm text-text-secondary">
              Votre parcours commence par un premier pas. Chaque étape franchie est une étape de plus vers votre certificat.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
