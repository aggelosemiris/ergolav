import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { buttonClass } from '@/components/ui/Button';

export default function RootNotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <h1 className="text-4xl font-black tracking-tight">This page is off the record</h1>
      <p className="max-w-md text-muted">The link may be broken, or the page has moved.</p>
      <Link href="/" className={buttonClass('light', 'md')}>
        Back to Home
      </Link>
    </main>
  );
}
