import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService, Banner, BannerSlide } from '../../core/api/admin.service';
import { UploadCardComponent } from '../../core/ui/upload-card.component';
import { assetUrl } from '../../core/customer/customer.service';

const FALLBACK_IMAGE = '/assets/boba/brownsugar.jpeg';

interface SlideDraft {
  image_url: string | null;
  kicker: string;
  title: string;
  announcement: string;
  position: number;
  is_active: boolean;
  file: File | null;
  preview: string | null;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, UploadCardComponent],
  template: `
    <div>
      <h2 style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold);margin:0 0 var(--boba-space-2)">Banners · Carousel</h2>
      <p style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted);margin:0 0 var(--boba-space-4)">
        One carousel on the customer menu — add as many slides as you like; each can carry its own image, text and announcement. It auto-advances.
      </p>

      <div style="display:flex;align-items:center;gap:var(--boba-space-3);margin-bottom:var(--boba-space-4)">
        <label style="display:flex;align-items:center;gap:var(--boba-space-2);font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">
          <input type="checkbox" [(ngModel)]="live" name="live" style="width:16px;height:16px" />
          Carousel live
        </label>
        <span style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">{{ drafts.length }} slide(s)</span>
      </div>

      <div *ngFor="let d of drafts; let i = index" style="background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border-radius:var(--boba-radius-md);padding:var(--boba-space-4);margin-bottom:var(--boba-space-4)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--boba-space-3)">
          <div style="font-size:var(--boba-text-xs);letter-spacing:0.14em;text-transform:uppercase;opacity:0.6">Slide {{ i + 1 }}</div>
          <button type="button" (click)="remove(i)" style="border:1px solid rgba(255,255,255,0.22);border-radius:var(--boba-radius-sm);padding:6px 10px;font-size:var(--boba-text-xs);text-transform:uppercase;letter-spacing:0.08em;background:transparent;color:var(--boba-color-text-inverse)">Remove</button>
        </div>

        <boba-upload-card label="Slide image (16:9)" [ratio]="16 / 9" [maxDimension]="1280" [preview]="d.preview || assetUrl(d.image_url) || null" (fileSelected)="onMediaFile($event, i)"></boba-upload-card>

        <div style="display:flex;flex-direction:column;gap:var(--boba-space-2);margin-top:var(--boba-space-3)">
          <input [(ngModel)]="d.kicker" name="kicker-{{ i }}" placeholder="Kicker (40)" maxlength="40" style="padding:var(--boba-space-3);border:1px solid rgba(255,255,255,0.22);border-radius:var(--boba-radius-sm);background:transparent;color:var(--boba-color-text-inverse)" />
          <input [(ngModel)]="d.title" name="title-{{ i }}" placeholder="Title (120)" maxlength="120" style="padding:var(--boba-space-3);border:1px solid rgba(255,255,255,0.22);border-radius:var(--boba-radius-sm);background:transparent;color:var(--boba-color-text-inverse)" />
          <textarea [(ngModel)]="d.announcement" name="announcement-{{ i }}" placeholder="Announcement (280) — shown under the title" maxlength="280" rows="2" style="padding:var(--boba-space-3);border:1px solid rgba(255,255,255,0.22);border-radius:var(--boba-radius-sm);background:transparent;color:var(--boba-color-text-inverse);resize:vertical"></textarea>
          <label style="display:flex;align-items:center;gap:var(--boba-space-2);font-size:var(--boba-text-sm);opacity:0.8">
            <input type="checkbox" [(ngModel)]="d.is_active" name="slide-active-{{ i }}" style="width:15px;height:15px" />
            Show in carousel
          </label>
        </div>
      </div>

      <div style="display:flex;gap:var(--boba-space-2)">
        <button type="button" (click)="addSlide()" style="flex:1;padding:var(--boba-space-3);background:transparent;color:var(--boba-color-text);border:1px dashed var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-semibold);letter-spacing:0.08em;text-transform:uppercase">+ Add slide</button>
        <button type="submit" (click)="save()" [disabled]="busy" style="flex:2;padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold);letter-spacing:0.08em;text-transform:uppercase">
          {{ busy ? 'Saving…' : 'Save carousel' }}
        </button>
      </div>
      <p *ngIf="error" style="font-size:var(--boba-text-sm);color:var(--boba-color-warn)">{{ error }}</p>
      <p *ngIf="message" style="font-size:var(--boba-text-sm);color:var(--boba-color-success)">{{ message }}</p>
    </div>
  `,
  styles: [],
})
export class AdminBannersPage implements OnInit {
  live = true;
  drafts: SlideDraft[] = [];
  busy = false;
  error = '';
  message = '';
  private banner: Banner | null = null;

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  assetUrl = assetUrl;

  load(): void {
    this.admin.listBanners().subscribe({
      next: banners => {
        this.banner = banners[0] ?? null;
        this.live = this.banner?.is_active ?? true;
        this.drafts = (this.banner?.slides ?? []).map(s => this.toDraft(s));
      },
      error: () => {
        this.error = 'Could not load the carousel.';
      },
    });
  }

  private toDraft(s: BannerSlide): SlideDraft {
    return {
      image_url: s.image_url ?? null,
      kicker: s.kicker,
      title: s.title,
      announcement: s.announcement || '',
      position: s.position,
      is_active: s.is_active,
      file: null,
      preview: null,
    };
  }

  addSlide(): void {
    this.drafts.push({
      image_url: null,
      kicker: '',
      title: '',
      announcement: '',
      position: this.drafts.length + 1,
      is_active: true,
      file: null,
      preview: null,
    });
  }

  remove(i: number): void {
    this.drafts.splice(i, 1);
  }

  onMediaFile(file: File, i: number): void {
    this.drafts[i].file = file;
    this.drafts[i].image_url = null;
    const reader = new FileReader();
    reader.onload = () => (this.drafts[i].preview = reader.result as string);
    reader.readAsDataURL(file);
  }

  async save(): Promise<void> {
    this.busy = true;
    this.error = '';
    this.message = '';
    try {
      for (let i = 0; i < this.drafts.length; i++) {
        const d = this.drafts[i];
        d.position = i + 1;
        if (d.file) {
          d.image_url = (await firstValueFrom(this.admin.uploadImage(d.file))).url;
          d.file = null;
        }
      }
      const slides = this.drafts.map(d => ({
        image_url: d.image_url,
        kicker: d.kicker,
        title: d.title,
        announcement: d.announcement,
        position: d.position,
        is_active: d.is_active,
      }));
      if (this.banner?.id) {
        await firstValueFrom(this.admin.updateBanner(this.banner.id, { is_active: this.live, slides }));
      } else {
        await firstValueFrom(this.admin.createBanner({ is_active: this.live, starts_at: new Date().toISOString(), slides }));
      }
      this.message = 'Carousel saved.';
      this.load();
    } catch (e) {
      const body = (e as { error?: { message?: string } } | null)?.error;
      this.error = body?.message || 'Save failed — check images are under 10 MB.';
    } finally {
      this.busy = false;
    }
  }
}