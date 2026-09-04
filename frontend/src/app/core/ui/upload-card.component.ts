import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'boba-upload-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="card"
      [class.dragging]="dragging"
      [class.filled]="preview"
      (click)="fileInput.click()"
      (keydown.enter)="fileInput.click()"
      (keydown.space)="fileInput.click()"
      (dragover)="onDragOver($event)"
      (dragleave)="dragging = false"
      (drop)="onDrop($event)"
      role="button"
      tabindex="0"
      [attr.aria-label]="preview ? 'Replace image' : 'Upload image'"
    >
      <input #fileInput type="file" accept="image/png,image/jpeg,image/webp" hidden (change)="onInput($event)" />

      <ng-container *ngIf="!preview">
        <div class="empty">
          <div class="icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </div>
          <div class="label">{{ label }}</div>
          <div class="hint">PNG, JPG or WebP · up to 5 MB</div>
        </div>
      </ng-container>

      <ng-container *ngIf="preview">
        <img class="preview" [src]="preview" alt="Selected image" />
        <div class="replace">Tap to replace</div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .card {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 152px;
        border: 1px dashed var(--boba-color-border-strong);
        border-radius: var(--boba-radius-md);
        background: var(--boba-color-bg-subtle);
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: background var(--boba-duration-fast) var(--boba-ease-default);
      }
      .card.dragging {
        background: var(--boba-color-accent-subtle);
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--boba-space-2);
        text-align: center;
        padding: var(--boba-space-4);
      }
      .icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-pill);
        color: var(--boba-color-text-muted);
      }
      .label {
        font-size: var(--boba-text-sm);
        font-weight: var(--boba-weight-semibold);
        color: var(--boba-color-text);
      }
      .hint {
        font-size: var(--boba-text-xs);
        color: var(--boba-color-text-muted);
      }
      .preview {
        width: 100%;
        height: 152px;
        object-fit: cover;
        display: block;
      }
      .replace {
        position: absolute;
        inset: auto 0 0 0;
        padding: var(--boba-space-2);
        text-align: center;
        font-size: var(--boba-text-xs);
        font-weight: var(--boba-weight-semibold);
        color: var(--boba-color-text-inverse);
        background: var(--boba-color-overlay);
      }
    `,
  ],
})
export class UploadCardComponent {
  @Input() label = 'Upload image';
  @Input() preview: string | null = null;
  @Output() fileSelected = new EventEmitter<File>();
  @Output() cleared = new EventEmitter<void>();

  dragging = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit(file);
    input.value = '';
  }
}
