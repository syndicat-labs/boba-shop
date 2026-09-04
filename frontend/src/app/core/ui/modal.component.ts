import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'boba-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="backdrop" *ngIf="open" (click)="onBackdrop($event)" role="presentation">
      <div class="panel" role="dialog" aria-modal="true" [attr.aria-label]="title" (click)="$event.stopPropagation()">
        <header *ngIf="title || closable">
          <h3>{{ title }}</h3>
          <button *ngIf="closable" class="close" type="button" (click)="close()" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="body"><ng-content></ng-content></div>
      </div>
    </div>
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: var(--boba-color-overlay);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        z-index: 1000;
      }
      .panel {
        width: 100%;
        max-width: 380px;
        max-height: 92dvh;
        overflow-y: auto;
        background: var(--boba-color-bg);
        border: 1px solid var(--boba-color-border);
        border-bottom: none;
        border-radius: var(--boba-radius-lg) var(--boba-radius-lg) 0 0;
        padding: var(--boba-space-4);
        animation: rise var(--boba-duration-base) var(--boba-ease-default);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--boba-space-4);
      }
      h3 {
        margin: 0;
        font-size: var(--boba-text-lg);
        font-weight: var(--boba-weight-bold);
      }
      .close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: transparent;
        border: none;
        color: var(--boba-color-text-muted);
      }
      @keyframes rise {
        from {
          transform: translateY(12px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @media (min-width: 480px) {
        .backdrop {
          align-items: center;
          padding: var(--boba-space-4);
        }
        .panel {
          border-bottom: 1px solid var(--boba-color-border);
          border-radius: var(--boba-radius-md);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .panel {
          animation: none;
        }
      }
    `,
  ],
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() closable = true;
  @Output() closed = new EventEmitter<void>();

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  close(): void {
    this.closed.emit();
  }
}
