import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  msg: string;
  action?: { label: string; run: () => void };
}

const TOAST_MS = 4200;

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  push(msg: string, action?: Toast['action']): void {
    const id = Date.now() + Math.random();
    this.toasts.update(t => [...t, { id, msg, action }]);
    setTimeout(() => this.dismiss(id), TOAST_MS);
  }

  dismiss(id: number): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}