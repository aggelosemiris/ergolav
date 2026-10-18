'use client';

import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error';
  action?: { label: string; href?: string; onClick?: () => void };
}

interface UiState {
  toasts: Toast[];
  toast: (message: string, opts?: { tone?: Toast['tone']; action?: Toast['action'] }) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  toast: (message, opts = {}) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone: opts.tone ?? 'info', action: opts.action }] });
    setTimeout(() => get().dismiss(id), opts.tone === 'error' ? 6000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (message: string, opts?: { tone?: Toast['tone']; action?: Toast['action'] }) => useUi.getState().toast(message, opts);
