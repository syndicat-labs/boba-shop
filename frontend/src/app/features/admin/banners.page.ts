import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Banner } from '../../core/api/admin.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold);margin:0 0 var(--boba-space-2)">Banners · Live events</h2>
      <p style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted);margin:0 0 var(--boba-space-4)">Promoted banner on the customer menu. Owner only.</p>

      <div class="preview" style="margin-bottom:var(--boba-space-4)">
        <div class="preview-video">
          <iframe *ngIf="isYoutube(draft.media_url) && youtubeEmbed(draft.media_url)" [src]="youtubeEmbed(draft.media_url)" title="Live video preview" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
          <video *ngIf="draft.media_url && !isYoutube(draft.media_url)" [src]="draft.media_url" autoplay muted loop playsinline controls></video>
          <div *ngIf="!draft.media_url" class="preview-empty">No media</div>
          <div class="preview-live">LIVE</div>
        </div>
        <div class="preview-content">
          <div class="preview-kicker">{{ draft.kicker || 'Kicker' }}</div>
          <div class="preview-title">{{ draft.title || 'Title' }}</div>
          <button class="preview-cta">{{ draft.cta_label || 'View →' }}</button>
        </div>
      </div>

      <div *ngFor="let b of banners" style="background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border-radius:var(--boba-radius-md);padding:var(--boba-space-4);margin-bottom:var(--boba-space-2)">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <div style="font-size:var(--boba-text-xs);letter-spacing:0.14em;text-transform:uppercase;opacity:0.6">{{ b.kicker }}</div>
          <span class="mono" style="font-size:var(--boba-text-xs);opacity:0.5">#{{ b.sort }}{{ b.is_active ? '' : ' · inactive' }}</span>
        </div>
        <div style="font-size:var(--boba-text-sm);font-weight:var(--boba-weight-bold)">{{ b.title }}</div>
        <div style="font-size:var(--boba-text-xs);opacity:0.7;margin-top:var(--boba-space-1)">{{ b.cta_label }} · {{ b.cta_type }}:{{ b.cta_value }}</div>
      </div>

      <div style="border-top:1px solid var(--boba-color-border);margin-top:var(--boba-space-4);padding-top:var(--boba-space-4)">
        <div style="font-size:var(--boba-text-xs);letter-spacing:0.12em;text-transform:uppercase;color:var(--boba-color-text-muted);margin-bottom:var(--boba-space-2)">New banner</div>
        <form (ngSubmit)="publish()" style="display:flex;flex-direction:column;gap:var(--boba-space-2)">
          <input [(ngModel)]="draft.kicker" name="kicker" placeholder="Kicker (40)" maxlength="40" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <input [(ngModel)]="draft.title" name="title" placeholder="Title (120)" maxlength="120" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <div style="display:flex;gap:var(--boba-space-2)">
            <input [(ngModel)]="draft.cta_label" name="cta_label" placeholder="CTA (View →)" style="flex:1;padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
            <select [(ngModel)]="draft.cta_type" name="cta_type" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)">
              <option value="sku">sku</option><option value="url">url</option><option value="anchor">anchor</option>
            </select>
          </div>
          <input [(ngModel)]="draft.cta_value" name="cta_value" placeholder="sku / url / anchor value" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <input [(ngModel)]="draft.media_url" name="media_url" placeholder="media url (YouTube live, video, image — optional)" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <div style="display:flex;align-items:center;gap:var(--boba-space-2)">
            <label style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">Position</label>
            <select [(ngModel)]="draft.sort" name="sort" style="padding:var(--boba-space-2) var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)">
              <option [value]="1">1</option><option [value]="2">2</option><option [value]="3">3</option>
            </select>
          </div>
          <button type="submit" [disabled]="busy" style="padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold);letter-spacing:0.08em;text-transform:uppercase">
            {{ busy ? 'Publishing…' : 'Publish live' }}
          </button>
        </form>
        <p *ngIf="error" style="font-size:var(--boba-text-sm);color:var(--boba-color-warn)">{{ error }}</p>
        <p *ngIf="message" style="font-size:var(--boba-text-sm);color:var(--boba-color-success)">{{ message }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .preview {
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
        border-radius: var(--boba-radius-md);
        overflow: hidden;
      }
      .preview-video {
        position: relative;
        width: 100%;
        aspect-ratio: 16/9;
        background: #000;
        overflow: hidden;
      }
      .preview-video iframe,
      .preview-video video {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        object-fit: cover;
      }
      .preview-empty {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--boba-text-sm);
        opacity: 0.5;
      }
      .preview-live {
        position: absolute;
        top: 10px;
        left: 10px;
        background: #ff1a1a;
        color: #fff;
        padding: 4px 8px;
        border-radius: var(--boba-radius-pill);
        font-size: 10px;
        letter-spacing: 0.06em;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 1;
      }
      .preview-live::before {
        content: '';
        width: 8px;
        height: 8px;
        background: #fff;
        border-radius: 50%;
        animation: livePulse 1.6s infinite;
      }
      @keyframes livePulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.35;
        }
      }
      .preview-content {
        padding: 14px 16px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .preview-kicker {
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        opacity: 0.6;
      }
      .preview-title {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .preview-cta {
        flex-shrink: 0;
        align-self: center;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.22);
        padding: 8px 12px;
        border-radius: var(--boba-radius-sm);
        background: transparent;
        color: var(--boba-color-text-inverse);
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        .preview-live::before {
          animation: none;
        }
      }
    `,
  ],
})
export class AdminBannersPage implements OnInit {
  banners: Banner[] = [];
  draft: Banner = {
    kicker: 'House · Batch at :00',
    title: 'Brown Sugar — brewed Taichung way',
    cta_label: 'View →',
    cta_type: 'sku',
    cta_value: 'brown-sugar',
    media_url: null,
    sort: 1,
    is_active: true,
  };
  busy = false;
  error = '';
  message = '';

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.admin.listBanners().subscribe(banners => {
      this.banners = banners;
      const used = new Set(banners.filter(b => b.is_active).map(b => b.sort));
      const free = [1, 2, 3].find(s => !used.has(s));
      if (free !== undefined) {
        this.draft.sort = free;
      }
    });
  }

  isYoutube(url: string | null | undefined): boolean {
    return !!url && /youtube\.com|youtu\.be/i.test(url);
  }

  youtubeEmbed(url: string | null | undefined): string | null {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    return null;
  }

  publish(): void {
    this.busy = true;
    this.error = '';
    this.message = '';
    const payload: Banner = { ...this.draft, starts_at: new Date().toISOString() };
    this.admin.createBanner(payload).subscribe({
      next: () => {
        this.busy = false;
        this.message = 'Published — customers see it in <2s.';
        this.load();
      },
      error: err => {
        this.busy = false;
        this.error = err?.error?.message || 'Publish failed.';
        this.load();
      },
    });
  }
}
