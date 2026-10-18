'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Pencil } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useLibrary } from '@/store/library';
import { toast } from '@/store/ui';
import { signOut } from '@/components/shell/TopBar';

const nameSchema = z.string().trim().min(1, 'Your name cannot be empty.').max(60, 'Names can be up to 60 characters.');

export function ProfileActions({ displayName, email }: { displayName: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = nameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your name.');
      return;
    }
    const user = useLibrary.getState().user;
    if (!user) return;
    setSaving(true);
    const { error: dbError } = await getBrowserSupabase().from('profiles').update({ display_name: parsed.data }).eq('id', user.id);
    setSaving(false);
    if (dbError) {
      setError('Could not save your name. Try again.');
      return;
    }
    useLibrary.getState().setUser({ ...user, displayName: parsed.data });
    setOpen(false);
    toast('Profile updated');
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-6">
      <Button
        variant="secondary"
        size="sm"
        icon={<Pencil className="size-4" aria-hidden="true" />}
        onClick={() => {
          setName(displayName);
          setError(null);
          setOpen(true);
        }}
      >
        Edit profile
      </Button>
      <Button
        variant="secondary"
        size="sm"
        icon={<LogOut className="size-4" aria-hidden="true" />}
        onClick={async () => {
          await signOut();
          router.push('/');
        }}
      >
        Log out
      </Button>
      <span className="text-sm text-subtle">Signed in as {email}</span>
      <Dialog open={open} onClose={() => setOpen(false)} title="Profile details">
        <form onSubmit={save} noValidate className="space-y-4">
          <div>
            <label htmlFor="display-name" className="mb-1.5 block text-sm font-semibold">
              Display name
            </label>
            <input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              aria-invalid={!!error}
              aria-describedby={error ? 'name-error' : undefined}
              className="h-11 w-full rounded-md border border-border-input bg-surface-3 px-3 text-text focus:border-text focus:outline-none"
            />
          </div>
          {error && (
            <p id="name-error" role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" variant="light" loading={saving}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
