import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CustomerOrder, CustomerService, TenantPublic } from '../../core/customer/customer.service';
import { LiveService } from '../../core/live/live.service';
import { ToastService } from '../../core/ui/toast.service';
import { ToastStackComponent } from '../../core/ui/toast-stack.component';

const STATUS = ['SENT', 'RECEIVED', 'PROCESSING', 'READY', 'AWAITING_PICKUP'];
const LABELS: Record<string, string> = {
  SENT: 'Order sent',
  RECEIVED: 'Order received',
  PROCESSING: 'Processing',
  READY: 'Ready',
  AWAITING_PICKUP: 'Awaiting pickup',
  COMPLETED: 'Completed',
};
const DESCS: Record<string, string> = {
  SENT: 'Awaiting admin confirmation',
  RECEIVED: 'Confirmed by admin',
  PROCESSING: 'Kitchen preparing',
  READY: 'Ready for pickup',
  AWAITING_PICKUP: 'Show code at counter',
  COMPLETED: 'Order completed',
};

const POLL_MS = 3000;

function shortId(id: string): string {
  return id.slice(0, 13);
}

@Component({
  selector: 'boba-tracking-page',
  standalone: true,
  imports: [CommonModule, ToastStackComponent],
  styleUrls: ['./../customer/customer.shared.css'],
  styles: [
    `
      :host {
        display: block;
      }
      .header {
        position: sticky;
        top: 0;
        z-index: 20;
        background: var(--boba-color-bg);
        border-bottom: 1px solid var(--boba-color-border);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
      }
      .back {
        width: 32px;
        height: 32px;
        border: 1px solid var(--boba-color-border);
        background: var(--boba-color-bg);
        border-radius: var(--boba-radius-sm);
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--boba-color-text);
        font-size: 14px;
        font-family: var(--boba-font-body);
      }
      .header-title {
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .header-id {
        margin-left: auto;
        font-family: var(--boba-font-mono);
        font-size: 11px;
        color: var(--boba-color-text-muted);
      }
      .card {
        margin: 12px 16px 0;
        background: var(--boba-color-bg);
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-md);
        overflow: hidden;
      }
      .card-head {
        padding: 12px 16px;
        border-bottom: 1px solid var(--boba-color-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .card-head-left {
        min-width: 0;
      }
      .card-tenant {
        font-size: 11px;
        color: var(--boba-color-text-muted);
        font-family: var(--boba-font-mono);
      }
      .card-order {
        font-size: 12px;
        font-weight: 700;
        margin-top: 2px;
      }
      .card-status {
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 4px 8px;
        border: 1px solid var(--boba-color-border-strong);
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
        border-radius: var(--boba-radius-pill);
        font-weight: 700;
        white-space: nowrap;
      }
      .timeline {
        padding: 16px;
      }
      .timeline-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .timeline-label {
        font-size: 11px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--boba-color-text-muted);
        font-weight: 600;
      }
      .status-pill {
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 4px 8px;
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-pill);
        font-weight: 700;
        background: var(--boba-color-bg);
      }
      .status-pill--active {
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
      }
      .steps {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .step {
        display: flex;
        gap: 12px;
        position: relative;
        padding-bottom: 18px;
      }
      .step:last-child {
        padding-bottom: 0;
      }
      .step-line {
        position: absolute;
        left: 15px;
        top: 32px;
        bottom: -2px;
        width: 2px;
        background: var(--boba-color-border);
      }
      .step:last-child .step-line {
        display: none;
      }
      .step--done .step-line {
        background: var(--boba-color-success);
      }
      .step-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid var(--boba-color-border);
        background: var(--boba-color-bg);
        flex-shrink: 0;
        position: relative;
        z-index: 1;
      }
      .step--done .step-icon,
      .step--active .step-icon {
        background: var(--boba-color-success);
        border-color: var(--boba-color-success);
      }
      .step-main {
        flex: 1;
        min-width: 0;
        padding-top: 4px;
      }
      .step-title {
        font-size: 12px;
        font-weight: 700;
      }
      .step-desc {
        font-size: 11px;
        color: var(--boba-color-text-muted);
        margin-top: 2px;
      }
      .step-time {
        font-family: var(--boba-font-mono);
        font-size: 11px;
        color: var(--boba-color-text-muted);
        white-space: nowrap;
        padding-top: 4px;
      }
      .pickup-box {
        margin: 16px 16px 0;
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-sm);
        padding: 14px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        background: var(--boba-color-bg-subtle);
      }
      .pickup-box--disabled {
        opacity: 0.45;
        pointer-events: none;
        filter: grayscale(0.15);
      }
      .pickup-label {
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--boba-color-text-muted);
      }
      .pickup-code {
        font-family: var(--boba-font-mono);
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.12em;
      }
      .pickup-meta {
        font-size: 11px;
        color: var(--boba-color-text-muted);
      }
      .code-input {
        margin: 12px 16px 0;
        display: flex;
        gap: 8px;
      }
      .code-input input {
        flex: 1;
        text-align: center;
        font-family: var(--boba-font-mono);
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.12em;
        padding: 12px;
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-sm);
        min-width: 0;
        color: var(--boba-color-text);
        background: var(--boba-color-bg);
      }
      .actions {
        padding: 24px 16px;
        text-align: center;
        border-top: 1px solid var(--boba-color-border);
      }
      .complete-title {
        font-weight: 700;
        font-size: 13px;
      }
      .complete-sub {
        font-size: 11px;
        color: var(--boba-color-text-muted);
        margin-top: 4px;
      }
      .error-note {
        font-size: 11px;
        color: var(--boba-color-danger);
        line-height: 1.4;
      }
      @media (max-width: 380px) {
        .card {
          margin: 10px 12px 0;
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
      <header class="header">
        <button class="back" (click)="goMenu()" aria-label="Back to menu">←</button>
        <div class="header-title">Tracking</div>
        <div class="header-id">{{ order ? shortOrdId(order.id) : '—' }}</div>
      </header>

      <ng-container *ngIf="loading">
        <div class="state-note">Loading order…</div>
      </ng-container>

      <ng-container *ngIf="error && !order">
        <div class="state-note">
          {{ error }}
          <button type="button" (click)="load()">Retry</button>
        </div>
      </ng-container>

      <ng-container *ngIf="order">
        <div class="card">
          <div class="card-head">
            <div class="card-head-left">
              <div class="card-tenant">{{ tenantName }}</div>
              <div class="card-order">ORDER {{ order.id }}</div>
            </div>
            <div class="card-status">{{ order.status }}</div>
          </div>
          <div class="timeline">
            <div class="timeline-head">
              <div class="timeline-label">Timeline</div>
              <div class="status-pill" [class.status-pill--active]="order.status !== 'COMPLETED'">
                {{ order.status === 'COMPLETED' ? 'Completed' : 'In Progress' }}
              </div>
            </div>
            <div class="steps">
              <div
                class="step"
                *ngFor="let s of steps"
                [class.step--done]="s.done"
                [class.step--active]="s.active"
              >
                <div class="step-icon" aria-hidden="true"></div>
                <div class="step-line"></div>
                <div class="step-main">
                  <div class="step-title">{{ s.label }}</div>
                  <div class="step-desc">{{ s.desc }}</div>
                </div>
                <div class="step-time">{{ s.time }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="pickup-box" [class.pickup-box--disabled]="!pickupActive" *ngIf="order.pickup_code">
          <div>
            <div class="pickup-label">Pickup code</div>
            <div class="pickup-code">{{ order.pickup_code }}</div>
            <div class="pickup-meta">Expires {{ pickupExpiry }}</div>
            <div class="pickup-meta">Visible to staff. Expires in 30m.</div>
          </div>
        </div>

        <div class="code-input" *ngIf="order.status === 'AWAITING_PICKUP'">
          <input
            #codeField
            inputmode="numeric"
            maxlength="4"
            placeholder="0000"
            aria-label="Pickup code"
            (keyup.enter)="submitCode(codeField.value)"
          />
          <button
            class="btn btn-primary"
            style="flex: 0 0 auto; padding: 12px 16px"
            (click)="submitCode(codeField.value)"
          >Submit code</button>
        </div>

        <div class="actions">
          <a class="btn btn-ghost" [href]="receiptHref" download *ngIf="showReceipt">Download receipt image</a>
          <button
            class="btn btn-primary"
            *ngIf="order.status === 'AWAITING_PICKUP' && codeVerified"
            (click)="confirmPickup()"
          >Confirm pickup →</button>
          <div class="completed-box" *ngIf="order.status === 'COMPLETED'">
            <div class="complete-title">Order completed ✓</div>
            <div class="complete-sub">Thanks for visiting. Head back to the menu.</div>
            <button class="btn btn-primary" style="margin: 12px auto 0; max-width: 240px" (click)="goMenu()">← Back to menu</button>
          </div>
        </div>

        <div class="error-note" *ngIf="actionError" style="padding: 0 16px 16px">{{ actionError }}</div>
      </ng-container>

      <boba-toasts></boba-toasts>
    </div>
  `,
})
export class TrackingPage implements OnInit, OnDestroy {
  slug = 'boba-obsidian';
  oid = '';
  tenantName = '';
  order: CustomerOrder | null = null;
  loading = true;
  error: string | null = null;
  actionError: string | null = null;
  codeVerified = false;
  steps: { label: string; desc: string; time: string; done: boolean; active: boolean }[] = [];

  private tenantUuid = '';
  private pollTimer: number | null = null;
  private wsSub: { unsubscribe: () => void } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customer: CustomerService,
    private live: LiveService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const oid = this.route.snapshot.paramMap.get('oid');
    if (slug) this.slug = slug;
    if (oid) this.oid = oid;
    if (!this.oid) {
      this.error = 'Order not found.';
      this.loading = false;
      return;
    }
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.pollTimer !== null) window.clearInterval(this.pollTimer);
    this.wsSub?.unsubscribe();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const [pub, order] = await Promise.all([
        firstValueFrom(this.customer.bootstrap(this.slug)),
        firstValueFrom(this.customer.track(this.slug, this.oid)),
      ]);
      this.tenantUuid = pub.tenant.id;
      this.tenantName = pub.tenant.name;
      this.applyOrder(order);
      this.connectLive();
      this.pollTimer = window.setInterval(() => void this.refresh(), POLL_MS);
    } catch (err) {
      const e = err as { status?: number };
      this.error = e.status === 404 ? 'Order not found.' : 'Could not load this order.';
    } finally {
      this.loading = false;
    }
  }

  private async refresh(): Promise<void> {
    try {
      const order = await firstValueFrom(this.customer.track(this.slug, this.oid));
      this.applyOrder(order);
    } catch {
      /* transient — keep current view */
    }
  }

  private connectLive(): void {
    this.wsSub = this.live
      .orderStream(this.tenantUuid, this.oid)
      .subscribe(order => this.applyOrder(order));
  }

  private applyOrder(order: CustomerOrder): void {
    this.order = order;
    this.codeVerified = false;
    this.actionError = null;
    this.renderSteps();
  }

  private renderSteps(): void {
    const o = this.order;
    if (!o) return;
    const isCompleted = o.status === 'COMPLETED';
    const curIdx = STATUS.indexOf(o.status);
    const effectiveIdx = isCompleted ? STATUS.length - 1 : Math.max(curIdx, 0);
    const fmtTime = (iso: string | null): string =>
      iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    const createdTime = fmtTime(o.created_at);
    const completedTime = isCompleted ? fmtTime(o.completed_at) : '';
    this.steps = STATUS.map((s, i) => {
      const done = i < effectiveIdx || isCompleted || (i === 0 && o.status === 'SENT');
      const active = i === effectiveIdx && !isCompleted;
      const time = i === 0 ? createdTime : i === STATUS.length - 1 ? completedTime : done ? fmtTime(o.created_at) : '';
      return { label: LABELS[s], desc: DESCS[s], time, done, active };
    });
  }

  get pickupExpiry(): string {
    const iso = this.order?.pickup_expires_at;
    return iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
  }

  get pickupActive(): boolean {
    const s = this.order?.status;
    return !!s && (s === 'READY' || s === 'AWAITING_PICKUP' || s === 'COMPLETED');
  }

  get showReceipt(): boolean {
    const s = this.order?.status;
    return !!s && (s === 'AWAITING_PICKUP' || s === 'COMPLETED');
  }

  get receiptHref(): string {
    return this.customer.receiptUrl(this.slug, this.oid);
  }

  shortOrdId(id: string): string {
    return shortId(id);
  }

  async submitCode(code: string): Promise<void> {
    this.actionError = null;
    const clean = code.trim();
    if (clean.length !== 4) {
      this.toast.push('Enter the 4-digit code');
      return;
    }
    const o = this.order;
    if (!o) return;
    if (!o.pickup_code) {
      this.toast.push('Pickup code not generated yet');
      return;
    }
    if (clean !== o.pickup_code) {
      this.actionError = 'Code mismatch — check the receipt or ask staff.';
      return;
    }
    if (o.pickup_expires_at && new Date() > new Date(o.pickup_expires_at)) {
      this.actionError = 'Code expired — ask staff for help.';
      return;
    }
    this.codeVerified = true;
    this.toast.push('Code verified — confirm pickup');
  }

  async confirmPickup(): Promise<void> {
    this.actionError = null;
    try {
      const res = await firstValueFrom(
        this.customer.confirmPickup(this.slug, this.oid, this.order?.pickup_code || ''),
      );
      this.applyOrder(res.order);
      this.toast.push('Pickup confirmed — order completed');
    } catch (err) {
      const e = err as { error?: { message?: string } };
      this.actionError = e.error?.message || 'Could not confirm pickup.';
    }
  }

  goMenu(): void {
    void this.router.navigate(['/menu', this.slug]);
  }
}