import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { assetUrl, CustomerProduct, CustomerService, TenantPublic } from '../../core/customer/customer.service';
import { CartService } from '../../core/customer/cart.service';
import { ToastService } from '../../core/ui/toast.service';
import { ToastStackComponent } from '../../core/ui/toast-stack.component';
import { BannerComponent } from './../banner/banner.component';
import { CheckoutModal } from './../checkout/checkout.modal';

@Component({
  selector: 'boba-menu-page',
  standalone: true,
  imports: [CommonModule, BannerComponent, CheckoutModal, ToastStackComponent],
  styleUrls: ['./../customer/customer.shared.css'],
  styles: [
    `
      :host {
        display: block;
      }
      /* header — logo+brand left, live checkout price view right */
      .header {
        position: sticky;
        top: 0;
        z-index: 20;
        background: var(--boba-color-bg);
        border-bottom: 1px solid var(--boba-color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px 10px 16px;
        gap: 12px;
      }
      .brand {
        display: flex;
        align-items: center;
        flex: 0 1 120px;
        min-width: 0;
      }
      .brand img {
        height: 28px;
        max-width: 88px;
        object-fit: contain;
        display: block;
      }
      .live-checkout {
        display: flex;
        align-items: stretch;
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-sm);
        overflow: hidden;
        flex: 1 1 auto;
        height: 36px;
        min-width: 0;
      }
      .live-price {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 0 10px;
        min-width: 0;
        flex: 1 1 auto;
        border-right: 1px solid var(--boba-color-border-strong);
        background: var(--boba-color-bg);
        gap: 1px;
        overflow: hidden;
      }
      .live-price-count {
        font-size: 9px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--boba-color-text-muted);
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .live-price-val {
        font-family: var(--boba-font-mono);
        font-size: 14px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .live-price-val--empty {
        color: var(--boba-color-text-muted);
        font-weight: 500;
      }
      .live-cta {
        display: flex;
        align-items: center;
        padding: 0 14px;
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
        border: 0;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        flex: 0 0 auto;
        font-family: var(--boba-font-body);
        transition: opacity var(--boba-duration-fast) var(--boba-ease-default);
      }
      .live-cta:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .live-cta:not(:disabled):hover {
        opacity: 0.88;
      }
      .live-cta:not(:disabled):active {
        opacity: 0.76;
      }
      /* shop meta bar */
      .meta-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        border-bottom: 1px solid var(--boba-color-border);
        background: var(--boba-color-bg-subtle);
        gap: 12px;
      }
      .meta-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .meta-dot {
        width: 6px;
        height: 6px;
        background: var(--boba-color-success);
        border-radius: 50%;
      }
      .meta-status {
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        font-weight: 600;
      }
      .meta-right {
        font-size: 11px;
        color: var(--boba-color-text-muted);
        font-family: var(--boba-font-mono);
      }
      /* sections */
      .section {
        padding: 16px 16px 0;
      }
      .section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        border-bottom: 1px solid var(--boba-color-border);
        padding-bottom: 10px;
        margin-bottom: 12px;
        gap: 12px;
      }
      .section-title {
        font-size: 12px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 700;
        margin: 0;
      }
      .section-count {
        font-family: var(--boba-font-mono);
        font-size: 11px;
        color: var(--boba-color-text-muted);
      }
      /* menu — bordered row list, 3px separation, 86% faded hero image */
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
      }
      .menu-row--featured::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--boba-color-border-strong);
        z-index: 2;
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
        opacity: var(--boba-media-fade-opacity);
      }
      .menu-bg::after {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--boba-media-fade);
      }
      .menu-thumb {
        display: grid;
        width: 80px;
        height: 80px;
        overflow: hidden;
        background: transparent;
        position: relative;
        z-index: 1;
        align-self: center;
        flex-shrink: 0;
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
      .menu-fav {
        width: 24px;
        height: 24px;
        min-width: 24px;
        min-height: 24px;
        border: 1px solid var(--boba-color-border);
        background: var(--boba-color-bg);
        display: grid;
        place-items: center;
        border-radius: var(--boba-radius-pill);
        cursor: pointer;
        font-size: 13px;
        line-height: 1;
        color: var(--boba-color-text-muted);
        padding: 0;
      }
      .menu-fav--on {
        color: var(--boba-color-border-strong);
        border-color: var(--boba-color-border-strong);
        background: var(--boba-color-bg-subtle);
      }
      .menu-add {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
        border: 1px solid var(--boba-color-border-strong);
        background: var(--boba-color-bg);
        display: grid;
        place-items: center;
        border-radius: var(--boba-radius-sm);
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        font-family: var(--boba-font-body);
      }
      .menu-add:hover {
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
      }
      .menu-add:active {
        transform: scale(0.96);
      }
      .qty {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .qty-btn {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
        border: 1px solid var(--boba-color-border-strong);
        background: var(--boba-color-bg);
        display: grid;
        place-items: center;
        border-radius: var(--boba-radius-sm);
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        font-family: var(--boba-font-body);
      }
      .qty-btn:hover {
        background: var(--boba-color-bg-subtle);
      }
      .qty-val {
        font-family: var(--boba-font-mono);
        font-size: 12px;
        font-weight: 600;
        min-width: 16px;
        text-align: center;
      }
      /* footer */
      .footer {
        padding: 16px;
        border-top: 1px solid var(--boba-color-border);
        margin-top: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .footer-note {
        font-size: 11px;
        color: var(--boba-color-text-muted);
        line-height: 1.5;
      }
      .footer-note strong {
        color: var(--boba-color-text);
        font-weight: 600;
      }
      .footer-mono {
        font-family: var(--boba-font-mono);
        font-size: 11px;
        color: var(--boba-color-text-muted);
      }
      .bottom-nav {
        position: sticky;
        bottom: 0;
        background: var(--boba-color-bg);
        border-top: 1px solid var(--boba-color-border);
        display: flex;
        justify-content: space-around;
        padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
        margin-top: 12px;
      }
      .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--boba-color-text-muted);
        cursor: pointer;
        padding: 4px 16px;
        background: none;
        border: 0;
        font-family: var(--boba-font-body);
      }
      .nav-item--active {
        color: var(--boba-color-text);
        font-weight: 600;
      }
      .nav-icon {
        width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
        font-size: 14px;
      }
      [hidden] {
        display: none !important;
      }
      @media (max-width: 380px) {
        .header {
          padding: 8px 10px;
          gap: 8px;
        }
        .live-checkout {
          height: 34px;
        }
        .live-price {
          padding: 0 8px;
        }
        .live-cta {
          padding: 0 10px;
          font-size: 10px;
        }
        .meta-bar {
          padding: 8px 12px;
        }
        .section {
          padding: 12px 12px 0;
        }
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
        .footer {
          padding: 12px;
          flex-direction: column;
          align-items: flex-start;
        }
      }
      @media (max-width: 320px) {
        .live-price-count {
          font-size: 8px;
        }
        .live-price-val {
          font-size: 12px;
        }
        .live-cta {
          padding: 0 8px;
          font-size: 10px;
        }
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
      @media (prefers-reduced-motion: reduce) {
        * {
          transition: none !important;
        }
      }
    `,
  ],
  template: `
    <div class="page">
      <header class="header" aria-label="App header">
        <div class="brand"><img src="/assets/boba/e-town-boba.svg" alt="e-town boba" width="88" height="28" loading="eager" /></div>
        <div class="live-checkout" role="status" aria-live="polite" aria-label="Cart summary">
          <div class="live-price">
            <span class="live-price-count">{{ countLabel() }}</span>
            <span class="live-price-val" [class.live-price-val--empty]="cart.empty()">{{ fmtTotal() }}</span>
          </div>
          <button class="live-cta" [disabled]="cart.empty()" (click)="openCheckout()">Checkout →</button>
        </div>
      </header>

      <div class="meta-bar">
        <div class="meta-left">
          <span class="meta-dot" aria-hidden="true"></span>
          <span class="meta-status">Open · till late</span>
        </div>
        <div class="meta-right">{{ clock }}</div>
      </div>

      <boba-banner [tenantSlug]="slug"></boba-banner>

      <ng-container *ngIf="loading">
        <div class="state-note">Loading menu…</div>
      </ng-container>

      <ng-container *ngIf="error">
        <div class="state-note">
          {{ error }}
          <button type="button" (click)="load()">Retry</button>
        </div>
      </ng-container>

      <section class="section" *ngIf="!loading && !error" aria-labelledby="sec-boba">
        <div class="section-head">
          <h2 id="sec-boba" class="section-title">{{ favsOnly ? 'Favorites' : 'Menu' }}</h2>
          <span class="section-count">{{ countPadded() }}</span>
        </div>
        <div class="menu-list">
          <article
            class="menu-row"
            [class.menu-row--featured]="isFeatured(p)"
            [id]="'sku-' + p.sku"
            *ngFor="let p of visibleProducts()"
          >
            <div class="menu-bg" aria-hidden="true"><img [src]="hero(p)" alt="" loading="lazy" /></div>
            <div class="menu-thumb" aria-hidden="true"><img [src]="thumb(p)" [alt]="p.name" loading="lazy" /></div>
            <div class="menu-main">
              <div class="menu-name">{{ p.name }}</div>
              <div class="menu-desc">{{ p.description }}</div>
              <div class="menu-badges" *ngIf="badges(p).length">
                <span class="badge" [class.badge--accent]="b.accent" *ngFor="let b of badges(p)">{{ b.label }}</span>
              </div>
            </div>
            <div class="menu-side">
              <button
                class="menu-fav"
                [class.menu-fav--on]="cart.isFavorite(p.sku)"
                [attr.aria-pressed]="cart.isFavorite(p.sku)"
                [attr.aria-label]="(cart.isFavorite(p.sku) ? 'Remove from favorites' : 'Add to favorites') + ' ' + p.name"
                (click)="cart.toggleFavorite(p.sku)"
              >{{ cart.isFavorite(p.sku) ? '♥' : '♡' }}</button>
              <div class="menu-price">₵{{ p.price }}</div>
              <div class="qty" *ngIf="cart.qty(p.sku) > 0">
                <button class="qty-btn" (click)="cart.dec(p)" [attr.aria-label]="'Decrease ' + p.name">−</button>
                <span class="qty-val">{{ cart.qty(p.sku) }}</span>
                <button class="qty-btn" (click)="cart.add(p)" [attr.aria-label]="'Increase ' + p.name">+</button>
              </div>
              <button class="menu-add" *ngIf="cart.qty(p.sku) === 0" (click)="cart.add(p)" [attr.aria-label]="'Add ' + p.name">+</button>
            </div>
          </article>
          <div class="state-note" *ngIf="visibleProducts().length === 0">No favorites yet — tap ♡ on any drink.</div>
        </div>
      </section>

      <footer class="footer" *ngIf="!loading && !error">
        <div class="footer-note">
          <strong>Build:</strong> sugar 0–100% · ice · size R/L · toppings ₵0.80
          <br />Running total updates live in header.
        </div>
        <div class="footer-mono">{{ itemsLabel() }}</div>
      </footer>

      <nav class="bottom-nav" aria-label="Primary">
        <a class="nav-item nav-item--active" (click)="favsOnly ? toggleFavorites() : null"><span class="nav-icon">≡</span>Menu</a>
        <a class="nav-item" (click)="toggleFavorites()"><span class="nav-icon">♡</span>Favorites</a>
        <a class="nav-item" (click)="goLastOrder()"><span class="nav-icon">◈</span>Orders</a>
      </nav>

      <boba-checkout-modal
        [open]="checkoutOpen"
        [tenantSlug]="slug"
        (closed)="checkoutOpen = false"
        (trackOrder)="goTrack($event)"
      ></boba-checkout-modal>
      <boba-toasts></boba-toasts>
    </div>
  `,
})
export class MenuPage implements OnInit, OnDestroy {
  slug = 'boba-obsidian';
  tenant: TenantPublic['tenant'] | null = null;
  products: CustomerProduct[] = [];
  loading = true;
  error: string | null = null;
  checkoutOpen = false;
  favsOnly = false;
  clock = '';
  private clockTimer: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customer: CustomerService,
    readonly cart: CartService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) this.slug = slug;
    void this.load();
    this.tick();
    this.clockTimer = window.setInterval(() => this.tick(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer !== null) window.clearInterval(this.clockTimer);
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const [pub, products] = await Promise.all([
        firstValueFrom(this.customer.bootstrap(this.slug)),
        firstValueFrom(this.customer.listProducts(this.slug)),
      ]);
      this.tenant = pub.tenant;
      this.products = products;
    } catch (err) {
      const e = err as { error?: { message?: string }; status?: number };
      if (e.status === 404) {
        this.error = `Shop “${this.slug}” not found.`;
      } else {
        this.error = e.error?.message || 'Could not load menu. Check your connection.';
      }
    } finally {
      this.loading = false;
    }
  }

  visibleProducts(): CustomerProduct[] {
    if (!this.favsOnly) return this.products;
    return this.products.filter(p => this.cart.isFavorite(p.sku));
  }

  hero(p: CustomerProduct): string {
    return assetUrl(p.image_key);
  }

  thumb(p: CustomerProduct): string {
    return assetUrl(p.card_image_key || p.image_key);
  }

  isFeatured(p: CustomerProduct): boolean {
    return p.sku === 'brown-sugar';
  }

  badges(p: CustomerProduct): { label: string; accent?: boolean }[] {
    const out: { label: string; accent?: boolean }[] = [];
    if (p.description.includes('4h pearls')) out.push({ label: 'Signature', accent: true });
    if (p.description.toLowerCase().includes('oat')) out.push({ label: 'Oat +₵0.80' });
    return out;
  }

  countLabel(): string {
    const n = this.cart.count();
    if (n === 0) return '0 items';
    return n === 1 ? '1 item' : `${n} items`;
  }

  itemsLabel(): string {
    const n = this.cart.count();
    return n === 1 ? '1 item' : `${n} items`;
  }

  countPadded(): string {
    return String(this.visibleProducts().length).padStart(2, '0');
  }

  fmtTotal(): string {
    return '₵' + this.cart.total().toFixed(2);
  }

  private tick(): void {
    this.clock = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  openCheckout(): void {
    if (this.cart.empty()) return;
    this.checkoutOpen = true;
  }

  toggleFavorites(): void {
    this.favsOnly = !this.favsOnly;
    if (this.favsOnly && this.cart.favSkus().size === 0) {
      this.toast.push('No favorites yet — tap ♡ on any drink');
    }
  }

  goLastOrder(): void {
    const last = this.lastOrderId();
    if (last && this.tenant) {
      void this.router.navigate(['/tracking', this.slug, last]);
    } else {
      this.toast.push('No orders yet — add bobas and checkout');
    }
  }

  goTrack(order: { id: string }): void {
    void this.router.navigate(['/tracking', this.slug, order.id]);
  }

  private lastOrderId(): string | null {
    try {
      return localStorage.getItem(`boba:tenant:${this.slug}:lastOrderId`);
    } catch {
      return null;
    }
  }
}