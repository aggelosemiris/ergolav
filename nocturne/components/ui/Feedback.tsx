import type { ReactNode } from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center animate-rise">
      {icon && <div className="mb-1 flex size-16 items-center justify-center rounded-full bg-surface-2 text-muted [&_svg]:size-7">{icon}</div>}
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {body && <p className="max-w-md text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Equalizer({ paused = false }: { paused?: boolean }) {
  return (
    <span className="eq" data-paused={paused} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
