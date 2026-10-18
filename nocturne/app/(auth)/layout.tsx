import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface-2 to-bg px-4 py-8">
      <header className="mx-auto mb-8 flex max-w-5xl">
        <Link href="/" aria-label="Nocturne home">
          <Logo />
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-md rounded-lg bg-bg/60 p-6 shadow-pop sm:p-10">
        {children}
      </main>
    </div>
  );
}
