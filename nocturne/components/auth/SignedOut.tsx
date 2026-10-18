import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';

export function SignedOut({ icon, title, body, next }: { icon: ReactNode; title: string; body: string; next: string }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      body={body}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} variant="light">
            Log in
          </ButtonLink>
          <ButtonLink href={`/signup?next=${encodeURIComponent(next)}`} variant="secondary">
            Sign up free
          </ButtonLink>
        </div>
      }
    />
  );
}
