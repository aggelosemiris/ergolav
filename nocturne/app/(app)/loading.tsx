import { Skeleton } from '@/components/ui/Feedback';

export default function Loading() {
  return (
    <div className="pt-2" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="mb-10 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      {Array.from({ length: 2 }, (_, s) => (
        <div key={s} className="mb-10">
          <Skeleton className="mb-4 h-6 w-48" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="w-[180px] shrink-0 space-y-2 p-3">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
