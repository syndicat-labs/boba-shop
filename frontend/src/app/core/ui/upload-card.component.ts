import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Cropper from 'cropperjs';

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
          <div class="hint">PNG, JPG or WebP · up to 10 MB · {{ ratioLabel }}</div>
        </div>
      </ng-container>

      <ng-container *ngIf="preview">
        <img class="preview" [src]="preview" alt="Selected image" />
        <div class="replace">Tap to replace · {{ ratioLabel }}</div>
      </ng-container>
    </div>

    <div *ngIf="cropUrl" class="crop-overlay">
      <div
        class="crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Crop image"
      >
        <div class="crop-head">
          <div>
            <div class="crop-title">Crop image</div>
            <div class="crop-hint">Drag to position · scroll / pinch to zoom · {{ ratioLabel }}</div>
          </div>
          <button type="button" class="crop-close" (click)="cancelCrop()" aria-label="Close crop editor">✕</button>
        </div>
        <div class="crop-stage">
          <img #cropImg [src]="cropUrl" alt="Image to crop" />
        </div>
        <div class="crop-actions">
          <button type="button" class="crop-btn crop-btn--ghost" (click)="cancelCrop()">Cancel</button>
          <button #confirmBtn type="button" class="crop-btn" (click)="confirmCrop()" [disabled]="cropBusy">
            {{ cropBusy ? 'Exporting…' : 'Crop & use' }}
          </button>
        </div>
      </div>
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

      .crop-overlay {
        position: fixed;
        inset: 0;
        z-index: 1100;
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.6);
        padding: var(--boba-space-4);
      }
      .crop-dialog {
        width: min(94vw, 640px);
        background: var(--boba-color-bg);
        border-radius: var(--boba-radius-lg);
        box-shadow: var(--boba-shadow-overlay);
        padding: var(--boba-space-4);
      }
      .crop-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: var(--boba-space-3);
        margin-bottom: var(--boba-space-3);
      }
      .crop-title {
        font-size: var(--boba-text-lg);
        font-weight: var(--boba-weight-bold);
      }
      .crop-hint {
        margin-top: 2px;
        font-size: var(--boba-text-xs);
        color: var(--boba-color-text-muted);
      }
      .crop-close {
        background: var(--boba-color-bg-subtle);
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-sm);
        width: 32px;
        height: 32px;
        font-size: var(--boba-text-sm);
        color: var(--boba-color-text-muted);
      }
      .crop-stage {
        width: 100%;
        height: min(58vh, 420px);
        background: var(--boba-color-bg-subtle);
        border-radius: var(--boba-radius-md);
        overflow: hidden;
      }
      .crop-stage img {
        display: block;
        max-width: 100%;
      }
      .crop-actions {
        display: flex;
        gap: var(--boba-space-2);
        margin-top: var(--boba-space-3);
      }
      .crop-btn {
        flex: 1;
        padding: var(--boba-space-3);
        border-radius: var(--boba-radius-sm);
        font-weight: var(--boba-weight-bold);
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border: 1px solid var(--boba-color-border-strong);
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
      }
      .crop-btn--ghost {
        background: var(--boba-color-bg);
        color: var(--boba-color-text);
      }
      .crop-btn[disabled] {
        opacity: 0.6;
      }
    `,
  ],
})
export class UploadCardComponent {
  @Input() label = 'Upload image';
  @Input() preview: string | null = null;
  @Input() ratio: number | null = null;
  @Input() maxDimension = 1600;
  @Output() fileSelected = new EventEmitter<File>();

  @ViewChild('cropImg') cropImg!: ElementRef<HTMLImageElement>;
  @ViewChild('confirmBtn') confirmBtn!: ElementRef<HTMLButtonElement>;

  dragging = false;
  cropUrl: string | null = null;
  cropBusy = false;

  private pending: File | null = null;
  private cropper: Cropper | null = null;

  get ratioLabel(): string {
    const r = this.ratio;
    if (!r) return 'Free crop';
    if (Math.abs(r - 16 / 9) < 0.001) return '16:9';
    if (Math.abs(r - 1) < 0.001) return '1:1';
    if (Math.abs(r - 4 / 3) < 0.001) return '4:3';
    if (Math.abs(r - 3 / 4) < 0.001) return '3:4';
    return `${Math.round(r * 100) / 100} : 1`;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(): void {
    if (this.cropUrl && !this.cropBusy) this.cancelCrop();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.startCrop(file);
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.startCrop(file);
    input.value = '';
  }

  private startCrop(file: File): void {
    this.pending = file;
    this.cropBusy = false;
    if (this.cropUrl) URL.revokeObjectURL(this.cropUrl);
    this.cropUrl = URL.createObjectURL(file);
    setTimeout(() => {
      const el = this.cropImg?.nativeElement;
      if (!el) return;
      if (el.complete && el.naturalWidth > 0) this.initCropper(el);
      else el.addEventListener('load', () => this.initCropper(el), { once: true });
      setTimeout(() => this.confirmBtn?.nativeElement.focus(), 0);
    });
  }

  private initCropper(el: HTMLImageElement): void {
    this.cropper?.destroy();
    this.cropper = new Cropper(el, {
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 1,
      aspectRatio: this.ratio ?? NaN,
      toggleDragModeOnDblclick: false,
      background: false,
      movable: true,
      zoomable: true,
      wheelZoomRatio: 0.05,
      minCropBoxWidth: 64,
      minCropBoxHeight: 64,
    });
  }

  confirmCrop(): void {
    if (!this.cropper || this.cropBusy) return;
    this.cropBusy = true;

    // Single downscaled pass: Cropper.js crops the full-res source and downscales
    // to maxDimension with imageSmoothingQuality=high in one allocation. A phone
    // photo can be 4000+ px, so never crop to native size first (double work + a
    // blocking encode). maxDimension (800–1600) keeps the output small and fast.
    const canvas = this.cropper.getCroppedCanvas({
      maxWidth: this.maxDimension,
      maxHeight: this.maxDimension,
      imageSmoothingQuality: 'high',
    });
    // Let the "Exporting…" state paint and unblock the page before the WebP encode.
    requestAnimationFrame(() =>
      canvas.toBlob(
        blob => {
          const file = this.pending;
          const out = blob
            ? new File([blob], `${(file?.name ?? 'image').replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' })
            : null;
          this.teardown();
          if (out) this.fileSelected.emit(out);
        },
        'image/webp',
        0.85,
      ),
    );
  }

  cancelCrop(): void {
    this.teardown();
  }

  private teardown(): void {
    this.cropper?.destroy();
    this.cropper = null;
    this.pending = null;
    if (this.cropUrl) URL.revokeObjectURL(this.cropUrl);
    this.cropUrl = null;
    this.cropBusy = false;
  }
}