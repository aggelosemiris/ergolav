import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <EmptyState
      icon={<Compass />}
      title="We couldn't find that"
      body="It may have been deleted, made private by its owner, or the link is wrong."
      action={<ButtonLink href="/" variant="light">Back to Home</ButtonLink>}
    />
  );
}
