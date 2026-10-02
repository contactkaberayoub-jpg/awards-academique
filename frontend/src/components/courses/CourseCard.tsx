import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { CourseResponse } from '@/api/admin';

function formatPrice(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatRating(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

interface CourseCardProps {
  course: CourseResponse;
  index?: number;
}

export function CourseCard({ course, index = 0 }: CourseCardProps) {
  const hasRating = course.averageRating != null && course.averageRating > 0;
  const hasInstructor = Boolean(course.instructorName);
  const hasDiscount =
    course.discountPrice != null &&
    course.discountPrice < course.price &&
    !course.isFree;
  const showOffer = hasDiscount || course.isFree;
  const ratingPct = hasRating
    ? Math.max(0, Math.min(100, ((course.averageRating as number) / 5) * 100))
    : 0;
  const finalPrice = hasDiscount ? (course.discountPrice as number) : course.price;
  const currency = course.currency ?? 'MAD';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      className="h-full w-full min-w-0 max-w-none"
    >
      <Card
        variant="interactive"
        padded={false}
        className="group flex h-full w-full min-w-0 max-w-none flex-col overflow-hidden rounded-xl"
      >
        <Link to={`/courses/${course.id}`} className="flex h-full w-full flex-col">
          {/* Cover image: fixed consistent height, full-bleed, flush to card edges */}
          <div className="relative h-40 w-full shrink-0 overflow-hidden bg-surface-tertiary sm:h-52 md:h-[230px]">
            {course.thumbnailUrl ? (
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-secondary to-surface-tertiary text-text-muted">
                <BookOpen className="h-12 w-12" aria-hidden="true" />
              </div>
            )}

            {/* Technology / company logo overlay */}
            {course.logoUrl && (
              <div className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/40 bg-white/90 p-1.5 shadow-md backdrop-blur-sm">
                <img
                  src={course.logoUrl}
                  alt={`${course.title} logo`}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            {showOffer && (
              <Badge
                variant="warning"
                size="sm"
                className="absolute left-3 top-3 shadow-sm"
              >
                Special offer
              </Badge>
            )}
          </div>

          {/* Card body */}
          <div className="flex flex-1 flex-col gap-3 p-5">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 min-h-[3.25rem] text-lg font-semibold leading-tight text-text-primary">
                {course.title}
              </h3>
              {showOffer && (
                <Badge variant="warning" size="sm" className="shrink-0">
                  Offer
                </Badge>
              )}
            </div>

            {/* Author */}
            {hasInstructor && (
              <p className="text-sm text-text-muted">
                Par{' '}
                <span className="font-semibold text-text-secondary">
                  {course.instructorName}
                </span>
              </p>
            )}

            {/* Price + rating band, pinned to the bottom */}
            <div className="mt-auto">
              {/* Price row */}
              <div className="flex items-end gap-2 border-b border-border pb-3">
                {course.isFree ? (
                  <Badge variant="success" size="sm">
                    Gratuit
                  </Badge>
                ) : hasDiscount ? (
                  <span className="text-sm text-text-muted line-through">
                    {formatPrice(course.price)} {currency}
                  </span>
                ) : null}

                {!course.isFree && (
                  <span className="ml-auto text-2xl font-bold leading-none text-text-primary">
                    {formatPrice(finalPrice)}
                    <sup className="ml-1 text-sm font-medium text-text-muted">
                      {currency}
                    </sup>
                  </span>
                )}
              </div>

              {/* Footer: rating + arrow */}
              <div className="flex items-center justify-between gap-3 pt-3">
                <div className="min-w-0 flex-1">
                  {hasRating ? (
                    <>
                      <p className="text-xs font-medium text-text-secondary">
                        Note : {formatRating(course.averageRating as number)}/5
                      </p>
                      <div className="mt-1.5 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-surface-tertiary">
                        <div
                          className="h-full rounded-full bg-warning"
                          style={{ width: `${ratingPct}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted">Aucune note</p>
                  )}
                </div>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors duration-fast group-hover:bg-primary group-hover:text-white">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </Card>
    </motion.div>
  );
}
