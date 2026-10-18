import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong hover:scale-[1.02]',
  light: 'bg-text text-bg hover:scale-[1.02] hover:bg-white',
  secondary: 'border border-border-input text-text hover:border-text hover:scale-[1.02]',
  ghost: 'text-muted hover:text-text',
  danger: 'bg-danger text-bg hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-4 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-8 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant = 'primary', size = 'md', className = '', children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

/** Icon-only button. `label` is required: it is the accessible name and the tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', active, className = '', children, type = 'button', ...rest },
  ref,
) {
  const dims = size === 'sm' ? 'size-8' : size === 'lg' ? 'size-12' : 'size-10';
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`relative inline-flex ${dims} shrink-0 items-center justify-center rounded-full transition duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${
        active ? 'text-accent' : 'text-muted hover:text-text'
      } ${className}`}
      {...rest}
    >
      {children}
      {active && <span aria-hidden="true" className="absolute bottom-0.5 size-1 rounded-full bg-accent" />}
    </button>
  );
});
