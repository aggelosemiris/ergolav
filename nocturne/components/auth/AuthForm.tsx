'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { useLibrary } from '@/store/library';

const email = z.string().trim().email('Enter a valid email address.');
const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password.') });
const signupSchema = z.object({
  displayName: z.string().trim().min(1, 'Tell us what to call you.').max(60, 'Names can be up to 60 characters.'),
  email,
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(72, 'Passwords can be up to 72 characters.'),
});

/** Only same-site paths are allowed as a redirect target. */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return "That email and password don't match. Try again.";
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Log in instead.';
  if (m.includes('email not confirmed')) return 'Confirm your email first. Check your inbox for the link.';
  if (m.includes('password')) return message;
  if (m.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('fetch')) return 'Could not reach the server. Check your connection and try again.';
  return 'Something went wrong. Try again.';
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = 'h-12 w-full rounded-md border border-border-input bg-surface px-3.5 text-text placeholder:text-subtle transition focus:border-text focus:outline-none aria-[invalid=true]:border-danger';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [values, setValues] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const parsed = (mode === 'login' ? loginSchema : signupSchema).safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] ??= issue.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const sb = getBrowserSupabase();
    try {
      if (mode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({ email: values.email.trim(), password: values.password });
        if (error) throw error;
        const meta = data.user.user_metadata as { display_name?: string };
        useLibrary.getState().setUser({ id: data.user.id, email: data.user.email ?? null, displayName: meta.display_name || values.email.split('@')[0] });
      } else {
        const { data, error } = await sb.auth.signUp({
          email: values.email.trim(),
          password: values.password,
          options: { data: { display_name: values.displayName.trim() }, emailRedirectTo: `${window.location.origin}${next}` },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice(`We sent a confirmation link to ${values.email.trim()}. Open it to finish signing up.`);
          setBusy(false);
          return;
        }
        useLibrary.getState().setUser({ id: data.user!.id, email: data.user!.email ?? null, displayName: values.displayName.trim() });
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setFormError(friendly((err as Error).message ?? ''));
      setBusy(false);
    }
  };

  if (notice) {
    return (
      <div role="status" className="space-y-4 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Check your inbox</h1>
        <p className="text-muted">{notice}</p>
        <Link href="/login" className="font-bold underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight [text-wrap:balance]">{mode === 'login' ? 'Welcome back' : 'Sign up to start listening'}</h1>
      {formError && (
        <p role="alert" className="rounded-md bg-danger/15 px-4 py-3 text-sm font-semibold text-danger">
          {formError}
        </p>
      )}
      {mode === 'signup' && (
        <Field id="displayName" label="What should we call you?" error={errors.displayName}>
          <input id="displayName" autoComplete="nickname" value={values.displayName} onChange={set('displayName')} maxLength={60} aria-invalid={!!errors.displayName} aria-describedby={errors.displayName ? 'displayName-error' : undefined} className={inputClass} placeholder="Your name on playlists" />
        </Field>
      )}
      <Field id="email" label="Email" error={errors.email}>
        <input id="email" type="email" autoComplete="email" inputMode="email" value={values.email} onChange={set('email')} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className={inputClass} placeholder="you@example.com" />
      </Field>
      <Field id="password" label="Password" error={errors.password}>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={values.password}
            onChange={set('password')}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : mode === 'signup' ? 'password-hint' : undefined}
            className={`${inputClass} pr-12`}
          />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-2 text-muted hover:text-text">
            {show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
          </button>
        </div>
        {mode === 'signup' && !errors.password && (
          <p id="password-hint" className="mt-1.5 text-sm text-subtle">
            At least 8 characters.
          </p>
        )}
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full">
        {mode === 'login' ? 'Log in' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === 'login' ? (
          <>
            New to Nocturne?{' '}
            <Link href={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-text underline-offset-2 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-bold text-text underline-offset-2 hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
