'use client';

// One menu host for the whole app (track menus, playlist menus, account menu). Opened next to a
// trigger or at the pointer for right-clicks. Keyboard: arrows, Home/End, Enter, Escape.
// Nested menus (e.g. "Add to playlist") replace the panel and offer a way back.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { create } from 'zustand';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  /** opening this item shows these items instead */
  submenu?: () => MenuItem[];
  separatorBefore?: boolean;
}

interface MenuState {
  open: boolean;
  x: number;
  y: number;
  align: 'start' | 'end';
  label: string;
  stack: { label: string; items: MenuItem[] }[];
  returnFocus: HTMLElement | null;
  show: (opts: { x: number; y: number; align?: 'start' | 'end'; label: string; items: MenuItem[]; returnFocus?: HTMLElement | null }) => void;
  push: (label: string, items: MenuItem[]) => void;
  pop: () => void;
  close: () => void;
}

export const useMenu = create<MenuState>()((set, get) => ({
  open: false,
  x: 0,
  y: 0,
  align: 'start',
  label: '',
  stack: [],
  returnFocus: null,
  show: ({ x, y, align = 'start', label, items, returnFocus = null }) => set({ open: true, x, y, align, label, stack: [{ label, items }], returnFocus }),
  push: (label, items) => set({ stack: [...get().stack, { label, items }] }),
  pop: () => set({ stack: get().stack.slice(0, -1) }),
  close: () => {
    const rf = get().returnFocus;
    set({ open: false, stack: [], returnFocus: null });
    if (rf && document.contains(rf)) rf.focus();
  },
}));

/** Open a menu anchored under a trigger element. */
export function openMenuFrom(el: HTMLElement, label: string, items: MenuItem[], align: 'start' | 'end' = 'end') {
  const r = el.getBoundingClientRect();
  useMenu.getState().show({ x: align === 'end' ? r.right : r.left, y: r.bottom + 6, align, label, items, returnFocus: el });
}

/** Open a menu at the pointer (right-click). */
export function openMenuAt(x: number, y: number, label: string, items: MenuItem[], returnFocus?: HTMLElement | null) {
  useMenu.getState().show({ x, y, align: 'start', label, items, returnFocus: returnFocus ?? null });
}

export function MenuHost() {
  const { open, x, y, align, stack, close, push, pop } = useMenu();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const panel = stack[stack.length - 1];

  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === 'end' ? x - w : x;
    let top = y;
    if (left + w > vw - 8) left = vw - w - 8;
    if (left < 8) left = 8;
    if (top + h > vh - 8) top = Math.max(8, y - h - 12);
    setPos({ left, top });
  }, [open, x, y, align, panel]);

  useEffect(() => {
    if (!open) return;
    const first = ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
    first?.focus();
  }, [open, panel]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onScroll = (e: Event) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      close();
    };
    const onResize = () => close();
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  if (!open || !panel) return null;

  const activate = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.submenu) {
      push(item.label, item.submenu());
      return;
    }
    close();
    if (item.href) router.push(item.href);
    item.onSelect?.();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);
    const idx = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (stack.length > 1) pop();
      else close();
    } else if (e.key === 'ArrowLeft' && stack.length > 1) {
      e.preventDefault();
      pop();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={panel.label}
      onKeyDown={onKeyDown}
      style={{ left: pos.left, top: pos.top }}
      className="fixed z-[70] max-h-[min(70vh,480px)] w-64 overflow-y-auto scroll-thin rounded-md border border-border bg-surface-3 p-1 shadow-pop animate-fade-in"
    >
      {stack.length > 1 && (
        <button type="button" role="menuitem" tabIndex={-1} onClick={pop} className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm font-semibold text-muted outline-none hover:bg-white/10 focus:bg-white/10">
          <ChevronLeft className="size-4" aria-hidden="true" />
          {panel.label}
        </button>
      )}
      {panel.items.map((item, i) => (
        <div key={`${item.label}-${i}`}>
          {item.separatorBefore && <div role="separator" className="my-1 h-px bg-white/10" />}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            aria-disabled={item.disabled || undefined}
            aria-haspopup={item.submenu ? 'menu' : undefined}
            onClick={() => activate(item)}
            className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium outline-none transition-colors hover:bg-white/10 focus:bg-white/10 aria-disabled:opacity-40 ${
              item.danger ? 'text-danger' : 'text-text'
            }`}
          >
            {item.icon && <span className="text-muted [&_svg]:size-4" aria-hidden="true">{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
            {item.submenu && <ChevronRight className="size-4 text-muted" aria-hidden="true" />}
          </button>
        </div>
      ))}
    </div>
  );
}
