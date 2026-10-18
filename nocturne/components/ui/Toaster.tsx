'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useUi } from '@/store/ui';

export function Toaster() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--player-h)+12px)] z-[60] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-md px-4 py-2.5 text-sm font-semibold shadow-pop animate-rise ${
            t.tone === 'error' ? 'bg-danger text-bg' : 'bg-text text-bg'
          }`}
        >
          <span>{t.message}</span>
          {t.action && (
            <Link href={t.action.href} onClick={() => dismiss(t.id)} className="underline underline-offset-2 hover:no-underline">
              {t.action.label}
            </Link>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="-mr-1 rounded-full p-0.5 opacity-70 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
