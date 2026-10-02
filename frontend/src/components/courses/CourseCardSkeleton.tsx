import { Skeleton } from '@/components/ui/Skeleton';

export function CourseCardSkeleton() {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <Skeleton className="h-40 w-full max-w-full rounded-none sm:h-52 md:h-[230px]" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="w-3/4 space-y-1">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        <Skeleton className="mt-3 h-3 w-1/3" />

        <div className="mt-4 border-b border-border pb-3">
          <Skeleton className="h-3 w-1/4" />
          <div className="mt-1.5 flex items-end justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3">
          <div className="w-2/5 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-1.5 w-full" />
          </div>
          <Skeleton variant="circle" className="h-9 w-9" />
        </div>
      </div>
    </div>
  );
}
