interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-muted ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, rgb(var(--color-muted)) 0%, rgb(var(--color-surface-hover)) 50%, rgb(var(--color-muted)) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer-bg 1.5s linear infinite',
      }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}
