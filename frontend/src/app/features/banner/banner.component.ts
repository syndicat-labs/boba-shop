import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerService, assetUrl } from '../../core/customer/customer.service';

const DEFAULT_POSTER = '/assets/boba/brownsugar.jpeg';
const DEFAULT_KICKER = 'House · Batch at :00';
const DEFAULT_TITLE = 'Brown Sugar — brewed Taichung way';
const ROTATE_MS = 5000;

interface Slide {
  image: string;
  kicker: string;
  title: string;
  announcement: string;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

@Component({
  selector: 'boba-banner',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      :host {
        display: block;
        margin: 12px 16px 0;
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
        border-radius: var(--boba-radius-md);
        overflow: hidden;
        max-width: 100%;
      }
      .banner-media {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        background: var(--boba-color-bg-inverse);
        overflow: hidden;
      }
      .banner-media img {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        object-fit: cover;
      }
      .nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 30px;
        height: 30px;
        border: 1px solid var(--boba-color-border-inverse-subtle);
        border-radius: var(--boba-radius-pill);
        background: var(--boba-color-overlay);
        color: var(--boba-color-text-inverse);
        font-size: 16px;
        line-height: 1;
        display: grid;
        place-items: center;
        cursor: pointer;
        z-index: 1;
      }
      .nav-prev {
        left: 8px;
      }
      .nav-next {
        right: 8px;
      }
      .nav:hover {
        background: rgba(0, 0, 0, 0.35);
      }
      .banner-dots {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 8px;
        display: flex;
        justify-content: center;
        gap: 6px;
        z-index: 1;
      }
      .dot {
        width: 6px;
        height: 6px;
        padding: 0;
        border: 0;
        border-radius: var(--boba-radius-pill);
        background: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: width var(--boba-duration-fast) var(--boba-ease-default), background var(--boba-duration-fast) var(--boba-ease-default);
      }
      .dot.active {
        width: 18px;
        background: #fff;
      }
      .banner-content {
        padding: 14px 16px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .banner-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .banner-kicker {
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        opacity: 0.6;
      }
      .banner-title {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .banner-announcement {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.45;
        opacity: 0.75;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      @media (max-width: 380px) {
        :host {
          margin-top: 10px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .banner-media img,
        .dot {
          transition: none !important;
        }
      }
    `,
  ],
  template: `
    <div
      class="banner"
      role="region"
      aria-label="Promotions"
      (pointerenter)="paused = true"
      (pointerleave)="paused = false"
    >
      <div class="banner-media">
        <img [src]="slide.image" [alt]="slide.title" />
        <button *ngIf="slides.length > 1" class="nav nav-prev" (click)="prev()" aria-label="Previous promotion">
          ‹
        </button>
        <button *ngIf="slides.length > 1" class="nav nav-next" (click)="next()" aria-label="Next promotion">
          ›
        </button>
        <div class="banner-dots" *ngIf="slides.length > 1">
          <button
            *ngFor="let s of slides; let i = index"
            class="dot"
            [class.active]="i === index"
            (click)="go(i)"
            [attr.aria-label]="'Go to slide ' + (i + 1)"
            [attr.aria-current]="i === index"
          ></button>
        </div>
      </div>
      <div class="banner-content">
        <div class="banner-left">
          <div class="banner-kicker">{{ slide.kicker }}</div>
          <div class="banner-title">{{ slide.title }}</div>
          <div class="banner-announcement" *ngIf="slide.announcement">{{ slide.announcement }}</div>
        </div>
      </div>
    </div>
  `,
})
export class BannerComponent implements OnInit, OnDestroy {
  @Input() tenantSlug = 'boba-obsidian';

  slides: Slide[] = [];
  index = 0;
  paused = false;

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private customer: CustomerService) {}

  ngOnInit(): void {
    this.customer.listBanners(this.tenantSlug).subscribe({
      next: banners => {
        const banner = banners[0];
        const slides = (banner?.slides ?? [])
          .filter(s => s.is_active)
          .map(s => ({
            image: assetUrl(s.image_url) || DEFAULT_POSTER,
            kicker: s.kicker,
            title: s.title,
            announcement: s.announcement || '',
          }));
        this.slides = slides.length ? slides : [this.defaultSlide()];
        this.start();
      },
      error: () => {
        this.slides = [this.defaultSlide()];
        this.start();
      },
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private defaultSlide(): Slide {
    return {
      image: DEFAULT_POSTER,
      kicker: DEFAULT_KICKER,
      title: DEFAULT_TITLE,
      announcement: 'Freshly brewed every hour in the Taichung style.',
    };
  }

  get slide(): Slide {
    return this.slides[this.index % this.slides.length] ?? this.defaultSlide();
  }

  private start(): void {
    this.stop();
    if (this.slides.length > 1 && !reducedMotion.matches) {
      this.timer = setInterval(() => {
        if (!this.paused) this.next();
      }, ROTATE_MS);
    }
  }

  private stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  go(i: number): void {
    this.index = ((i % this.slides.length) + this.slides.length) % this.slides.length;
  }

  prev(): void {
    this.go(this.index - 1);
  }

  next(): void {
    this.go(this.index + 1);
  }
}