import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'boba-toasts',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      :host {
        position: fixed;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 60;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
        max-width: min(90vw, 390px);
      }
      .toast {
        pointer-events: auto;
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-sm);
        padding: 10px 12px;
        font-size: 11px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        box-shadow: var(--boba-shadow-overlay);
      }
      .toast button {
        border: 1px solid var(--boba-color-border-inverse);
        background: transparent;
        color: var(--boba-color-text-inverse);
        padding: 4px 8px;
        border-radius: var(--boba-radius-sm);
        font-size: 10px;
        cursor: pointer;
      }
    `,
  ],
  template: `
    <div class="toast" *ngFor="let t of service.toasts()">
      <span>{{ t.msg }}</span>
      <button *ngIf="t.action" type="button" (click)="run(t.id)">{{ t.action.label }}</button>
      <button type="button" (click)="service.dismiss(t.id)" aria-label="Dismiss">✕</button>
    </div>
  `,
})
export class ToastStackComponent {
  constructor(readonly service: ToastService) {}

  run(id: number): void {
    const toast = this.service.toasts().find(t => t.id === id);
    toast?.action?.run();
    this.service.dismiss(id);
  }
}