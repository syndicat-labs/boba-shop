import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService, Product } from '../../core/api/admin.service';
import { ModalComponent } from '../../core/ui/modal.component';
import { UploadCardComponent } from '../../core/ui/upload-card.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, UploadCardComponent],
  template: `
    <div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:var(--boba-space-3);margin-bottom:var(--boba-space-4)">
        <div style="min-width:0">
          <h2 style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold);margin:0 0 var(--boba-space-1)">Catalog</h2>
          <p style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted);margin:0">Menu items, pricing, and availability.</p>
        </div>
        <button (click)="openModal()" style="flex-shrink:0;padding:var(--boba-space-2) var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-sm);font-weight:var(--boba-weight-bold);white-space:nowrap">+ Add product</button>
      </div>

      <div *ngIf="!products.length" style="color:var(--boba-color-text-muted);font-size:var(--boba-text-sm)">No menu items yet.</div>

      <div class="menu-list">
        <article class="menu-row" *ngFor="let p of products" (click)="openDetail(p)" (keydown.enter)="openDetail(p)" role="button" tabindex="0" [attr.aria-label]="'View ' + p.name">
          <div class="menu-bg" aria-hidden="true">
            <img *ngIf="heroImage(p) as bg" [src]="bg" alt="" loading="lazy" />
          </div>
          <div class="menu-thumb" aria-hidden="true">
            <img *ngIf="cardImage(p) as thumb" [src]="thumb" [alt]="p.name" loading="lazy" />
          </div>
          <div class="menu-main">
            <div class="menu-name">{{ p.name }}</div>
            <div class="menu-desc">{{ p.description }}</div>
            <div class="menu-badges">
              <span class="badge badge--hidden" *ngIf="!p.is_active">Hidden</span>
            </div>
          </div>
          <div class="menu-side">
            <div class="menu-price">₵{{ p.price }}</div>
          </div>
        </article>
      </div>

      <boba-modal [open]="modalOpen" title="Add product" (closed)="modalOpen = false">
        <form (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:var(--boba-space-3)">
          <boba-upload-card label="Product image" [preview]="imagePreview" (fileSelected)="onImageFile($event)"></boba-upload-card>
          <boba-upload-card label="Card thumbnail" [preview]="cardImagePreview" (fileSelected)="onCardImageFile($event)"></boba-upload-card>

          <input [(ngModel)]="draft.name" name="name" placeholder="Name" maxlength="120" (input)="autoSku()" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <input [(ngModel)]="draft.sku" name="sku" placeholder="SKU (slug, auto-filled from name)" maxlength="64" (input)="skuTouched = true" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <input [(ngModel)]="draft.description" name="description" placeholder="Description" maxlength="256" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <input [(ngModel)]="draft.price" name="price" type="number" step="0.01" min="0.01" placeholder="Price (₵)" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />

          <p *ngIf="error" style="font-size:var(--boba-text-sm);color:var(--boba-color-warn);margin:0">{{ error }}</p>

          <button type="submit" [disabled]="busy" style="margin-top:var(--boba-space-2);padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold)">
            {{ busy ? 'Adding…' : 'Add to menu' }}
          </button>
        </form>
      </boba-modal>

      <boba-modal [open]="!!selected" [title]="editMode ? 'Edit product' : (selected?.name || '')" (closed)="closeDetail()">
        <ng-container *ngIf="selected && !editMode">
          <div *ngIf="heroImage(selected) as img" style="width:100%;aspect-ratio:16/9;border-radius:var(--boba-radius-md);overflow:hidden;background:var(--boba-color-bg-subtle);margin-bottom:var(--boba-space-4)">
            <img [src]="img" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />
          </div>

          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:var(--boba-space-3);margin-bottom:var(--boba-space-3)">
            <h3 style="margin:0;font-size:var(--boba-text-xl);font-weight:var(--boba-weight-bold)">{{ selected.name }}</h3>
            <span class="mono" style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold)">₵{{ selected.price }}</span>
          </div>
          <p style="margin:0 0 var(--boba-space-4);font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">{{ selected.description }}</p>

          <dl style="display:flex;flex-direction:column;gap:var(--boba-space-2);margin:0 0 var(--boba-space-4);padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)">
            <div style="display:flex;justify-content:space-between">
              <dt style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">SKU</dt>
              <dd class="mono" style="margin:0;font-size:var(--boba-text-sm)">{{ selected.sku }}</dd>
            </div>
            <div style="display:flex;justify-content:space-between">
              <dt style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">Status</dt>
              <dd style="margin:0;font-size:var(--boba-text-sm)">{{ selected.is_active ? 'Active' : 'Hidden' }}</dd>
            </div>
          </dl>

          <div *ngIf="cardImage(selected) as thumb" style="display:flex;align-items:center;gap:var(--boba-space-2);margin-bottom:var(--boba-space-4)">
            <span style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">Card thumbnail</span>
            <img [src]="thumb" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:var(--boba-radius-sm)" />
          </div>

          <button (click)="startEdit()" style="width:100%;padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold)">Edit details</button>
        </ng-container>

        <ng-container *ngIf="selected && editMode">
          <form (ngSubmit)="saveEdit()" style="display:flex;flex-direction:column;gap:var(--boba-space-3)">
            <boba-upload-card label="Product image" [preview]="editImagePreview" (fileSelected)="onEditImageFile($event)"></boba-upload-card>
            <boba-upload-card label="Card thumbnail" [preview]="editCardImagePreview" (fileSelected)="onEditCardImageFile($event)"></boba-upload-card>

            <input [(ngModel)]="editDraft.name" name="editName" placeholder="Name" maxlength="120" (input)="autoEditSku()" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
            <input [(ngModel)]="editDraft.sku" name="editSku" placeholder="SKU" maxlength="64" (input)="editSkuTouched = true" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
            <input [(ngModel)]="editDraft.description" name="editDesc" placeholder="Description" maxlength="256" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
            <input [(ngModel)]="editDraft.price" name="editPrice" type="number" step="0.01" min="0.01" placeholder="Price (₵)" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />

            <p *ngIf="editError" style="font-size:var(--boba-text-sm);color:var(--boba-color-warn);margin:0">{{ editError }}</p>

            <div style="display:flex;gap:var(--boba-space-2);margin-top:var(--boba-space-2)">
              <button type="button" (click)="editMode = false" style="flex:1;padding:var(--boba-space-3);background:var(--boba-color-bg);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-sm)">Cancel</button>
              <button type="submit" [disabled]="editBusy" style="flex:1;padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold)">
                {{ editBusy ? 'Saving…' : 'Save changes' }}
              </button>
            </div>
          </form>
        </ng-container>
      </boba-modal>
    </div>
  `,
  styles: [
    `
      .menu-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-md);
        overflow: hidden;
        background: var(--boba-color-border);
      }
      .menu-row {
        display: grid;
        grid-template-columns: 80px minmax(0, 1fr) auto;
        gap: 12px;
        padding: 12px 12px 12px 16px;
        align-items: center;
        background: var(--boba-color-card-bg);
        position: relative;
        overflow: hidden;
        isolation: isolate;
        min-height: 104px;
        cursor: pointer;
      }
      .menu-row:hover {
        background: var(--boba-color-bg-subtle);
      }
      .menu-bg {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 86%;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
      }
      .menu-bg img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        opacity: 0.58;
      }
      .menu-bg::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 52%,
          rgba(255, 255, 255, 0.82) 78%,
          var(--boba-color-card-bg) 96%
        );
      }
      .menu-thumb {
        width: 80px;
        height: 80px;
        overflow: hidden;
        position: relative;
        z-index: 1;
      }
      .menu-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .menu-main {
        min-width: 0;
        position: relative;
        z-index: 1;
      }
      .menu-name {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .menu-desc {
        font-size: 11px;
        color: var(--boba-color-text-muted);
        line-height: 1.4;
        margin-top: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .menu-badges {
        display: flex;
        gap: 5px;
        margin-top: 6px;
        flex-wrap: wrap;
      }
      .badge {
        font-size: 7.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 2px 5px;
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-pill);
        color: var(--boba-color-text-muted);
        background: var(--boba-color-bg);
        line-height: 1.2;
      }
      .badge--hidden {
        border-color: var(--boba-color-warn);
        color: var(--boba-color-warn);
      }
      .menu-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        position: relative;
        z-index: 1;
      }
      .menu-price {
        font-family: var(--boba-font-mono);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      @media (max-width: 380px) {
        .menu-row {
          grid-template-columns: 72px minmax(0, 1fr) auto;
          gap: 8px;
          padding: 10px;
          min-height: 96px;
        }
        .menu-thumb {
          width: 72px;
          height: 72px;
        }
      }
      @media (max-width: 320px) {
        .menu-row {
          grid-template-columns: 64px minmax(0, 1fr) auto;
          gap: 6px;
          min-height: 92px;
        }
        .menu-thumb {
          width: 64px;
          height: 64px;
        }
        .menu-name {
          font-size: 12px;
        }
        .menu-desc {
          font-size: 10px;
        }
      }
    `,
  ],
})
export class CatalogPage implements OnInit {
  products: Product[] = [];
  modalOpen = false;
  busy = false;
  error = '';
  draft = { name: '', sku: '', description: '', price: '5.90' };
  skuTouched = false;
  imageFile: File | null = null;
  imagePreview: string | null = null;
  cardImageFile: File | null = null;
  cardImagePreview: string | null = null;

  selected: Product | null = null;
  editMode = false;
  editDraft = { name: '', sku: '', description: '', price: '' };
  editSkuTouched = false;
  editImageFile: File | null = null;
  editImagePreview: string | null = null;
  editCardImageFile: File | null = null;
  editCardImagePreview: string | null = null;
  editBusy = false;
  editError = '';

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.admin.listProducts().subscribe(products => (this.products = products));
  }

  heroImage(p: Product): string | null {
    return this.resolve(p.image_key);
  }

  cardImage(p: Product): string | null {
    return this.resolve(p.card_image_key || p.image_key);
  }

  resolve(key: string | null | undefined): string | null {
    if (!key) return null;
    return key.startsWith('/') ? key : `/assets/boba/${key}`;
  }

  openModal(): void {
    this.error = '';
    this.draft = { name: '', sku: '', description: '', price: '5.90' };
    this.skuTouched = false;
    this.imageFile = null;
    this.imagePreview = null;
    this.cardImageFile = null;
    this.cardImagePreview = null;
    this.modalOpen = true;
  }

  autoSku(): void {
    if (!this.skuTouched) {
      this.draft.sku = this.slugify(this.draft.name);
    }
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);
  }

  onImageFile(file: File): void {
    this.imageFile = file;
    this.setPreview(file, url => (this.imagePreview = url));
  }

  onCardImageFile(file: File): void {
    this.cardImageFile = file;
    this.setPreview(file, url => (this.cardImagePreview = url));
  }

  setPreview(file: File, cb: (url: string) => void): void {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result as string);
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    if (!this.draft.name || !this.draft.sku || !this.draft.price) {
      this.error = 'Name, SKU, and price are required.';
      return;
    }
    this.busy = true;
    this.error = '';
    try {
      let imageKey: string | null = null;
      let cardImageKey: string | null = null;
      if (this.imageFile) {
        imageKey = (await firstValueFrom(this.admin.uploadImage(this.imageFile))).url;
      }
      if (this.cardImageFile) {
        cardImageKey = (await firstValueFrom(this.admin.uploadImage(this.cardImageFile))).url;
      }
      const payload: Product = {
        name: this.draft.name,
        sku: this.draft.sku,
        description: this.draft.description,
        price: this.draft.price,
        image_key: imageKey,
        card_image_key: cardImageKey,
        sort: this.products.length + 1,
        is_active: true,
      };
      const created = await firstValueFrom(this.admin.createProduct(payload));
      this.products = [...this.products, created];
      this.modalOpen = false;
    } catch {
      this.error = 'Could not add product.';
    } finally {
      this.busy = false;
    }
  }

  openDetail(p: Product): void {
    this.selected = p;
    this.editMode = false;
    this.editError = '';
  }

  closeDetail(): void {
    this.selected = null;
    this.editMode = false;
  }

  startEdit(): void {
    if (!this.selected) return;
    this.editDraft = {
      name: this.selected.name,
      sku: this.selected.sku,
      description: this.selected.description,
      price: this.selected.price,
    };
    this.editSkuTouched = true;
    this.editImageFile = null;
    this.editImagePreview = this.heroImage(this.selected);
    this.editCardImageFile = null;
    this.editCardImagePreview = this.cardImage(this.selected);
    this.editError = '';
    this.editMode = true;
  }

  autoEditSku(): void {
    if (!this.editSkuTouched) {
      this.editDraft.sku = this.slugify(this.editDraft.name);
    }
  }

  onEditImageFile(file: File): void {
    this.editImageFile = file;
    this.setPreview(file, url => (this.editImagePreview = url));
  }

  onEditCardImageFile(file: File): void {
    this.editCardImageFile = file;
    this.setPreview(file, url => (this.editCardImagePreview = url));
  }

  async saveEdit(): Promise<void> {
    if (!this.selected) return;
    if (!this.editDraft.name || !this.editDraft.sku || !this.editDraft.price) {
      this.editError = 'Name, SKU, and price are required.';
      return;
    }
    this.editBusy = true;
    this.editError = '';
    try {
      let imageKey = this.selected.image_key ?? null;
      let cardImageKey = this.selected.card_image_key ?? null;
      if (this.editImageFile) {
        imageKey = (await firstValueFrom(this.admin.uploadImage(this.editImageFile))).url;
      }
      if (this.editCardImageFile) {
        cardImageKey = (await firstValueFrom(this.admin.uploadImage(this.editCardImageFile))).url;
      }
      const payload: Product = {
        name: this.editDraft.name,
        sku: this.editDraft.sku,
        description: this.editDraft.description,
        price: this.editDraft.price,
        image_key: imageKey,
        card_image_key: cardImageKey,
        sort: this.selected.sort,
        is_active: this.selected.is_active,
      };
      const updated = await firstValueFrom(this.admin.updateProduct(this.selected.id!, payload));
      this.products = this.products.map(p => (p.id === updated.id ? updated : p));
      this.closeDetail();
    } catch {
      this.editError = 'Could not save changes.';
    } finally {
      this.editBusy = false;
    }
  }
}
