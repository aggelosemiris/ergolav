'use client';

import { useEffect } from 'react';
import { CloudOff, RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      icon={<CloudOff />}
      title="This page didn't load"
      body="Something went wrong on our side or the connection dropped. Your music keeps playing."
      action={
        <Button variant="light" icon={<RotateCcw className="size-4" aria-hidden="true" />} onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
