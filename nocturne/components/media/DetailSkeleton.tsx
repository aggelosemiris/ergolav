import { Skeleton } from '@/components/ui/Feedback';

/** Loading state for album, playlist, artist and collection pages. */
export function DetailSkeleton({ round = false }: { round?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex flex-col items-center gap-6 pt-6 pb-6 sm:flex-row sm:items-end">
        <Skeleton className={`size-48 shrink-0 sm:size-52 lg:size-56 ${round ? 'rounded-full' : ''}`} />
        <div className="w-full max-w-lg space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="flex gap-4 py-5">
        <Skeleton className="size-14 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="size-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
