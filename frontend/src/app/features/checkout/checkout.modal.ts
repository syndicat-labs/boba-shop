import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { CartService, MIN_ORDER_GHS } from '../../core/customer/cart.service';
import { CustomerOrder, CustomerService, PaymentPayload } from '../../core/customer/customer.service';
import { ToastService } from '../../core/ui/toast.service';

interface EnvelopeError {
  error?: { message?: string; code?: string };
}

function envelopeMessage(err: unknown): string {
  const e = err as EnvelopeError;
  return e?.error?.message || 'Something went wrong. Please try again.';
}

const PSP_LATENCY_MS = 700;

@Component({
  selector: 'boba-checkout-modal',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./../customer/customer.shared.css'],
  styles: [
    `
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: var(--boba-color-overlay);
        display: grid;
        place-items: center;
        padding: 24px;
        z-index: 50;
        overflow-y: auto;
      }
      .modal-card {
        width: 100%;
        max-width: 380px;
        max-height: min(92dvh, 760px);
        overflow: auto;
        background: var(--boba-color-bg);
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-md);
        box-shadow: var(--boba-shadow-overlay);
        display: flex;
        flex-direction: column;
      }
      .modal-head {
        position: sticky;
        top: 0;
        background: var(--boba-color-bg);
        border-bottom: 1px solid var(--boba-color-border);
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        z-index: 1;
      }
      .modal-title {
        font-size: 12px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 700;
      }
      .modal-close {
        width: 32px;
        height: 32px;
        border: 1px solid var(--boba-color-border);
        background: var(--boba-color-bg);
        border-radius: var(--boba-radius-sm);
        display: grid;
        place-items: center;
        cursor: pointer;
        color: var(--boba-color-text);
        font-family: var(--boba-font-body);
      }
      .modal-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .order-lines {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .order-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        padding: 10px 12px;
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-sm);
        background: var(--boba-color-bg);
      }
      .order-line-main {
        min-width: 0;
      }
      .order-line-name {
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .order-line-meta {
        font-size: 11px;
        color: var(--boba-color-text-muted);
        margin-top: 2px;
      }
      .order-line-price {
        font-family: var(--boba-font-mono);
        font-size: 12px;
        font-weight: 600;
        white-space: nowrap;
      }
      .totals {
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-sm);
        overflow: hidden;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 12px;
        font-size: 12px;
        border-bottom: 1px solid var(--boba-color-border);
      }
      .totals-row:last-child {
        border-bottom: none;
        background: var(--boba-color-bg-subtle);
        font-weight: 700;
      }
      .totals-row strong {
        font-family: var(--boba-font-mono);
      }
      .pay-box {
        border: 1px dashed var(--boba-color-border);
        border-radius: var(--boba-radius-sm);
        padding: 12px;
        background: var(--boba-color-bg-subtle);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pay-label {
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--boba-color-text-muted);
        font-weight: 600;
      }
      .pay-method {
        border: 1px solid var(--boba-color-border);
        background: var(--boba-color-bg);
        border-radius: var(--boba-radius-sm);
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .pay-method-name {
        font-size: 12px;
        font-weight: 700;
      }
      .pay-method-sub {
        font-size: 11px;
        color: var(--boba-color-text-muted);
      }
      .pay-cta {
        width: 100%;
        padding: 14px 16px;
        background: var(--boba-color-bg-inverse);
        color: var(--boba-color-text-inverse);
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-sm);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
        cursor: pointer;
        font-family: var(--boba-font-body);
      }
      .pay-cta:disabled {
        opacity: 0.4;
        cursor: default;
      }
      .error-note {
        font-size: 11px;
        color: var(--boba-color-danger);
        line-height: 1.4;
      }
      .fine-print {
        font-size: 10px;
        color: var(--boba-color-text-muted);
        line-height: 1.4;
      }
      .receipt-card {
        border: 1px solid var(--boba-color-border-strong);
        border-radius: var(--boba-radius-md);
        overflow: hidden;
        background: var(--boba-color-bg);
      }
      .receipt-head {
        padding: 14px 16px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        border-bottom: 1px solid var(--boba-color-border);
      }
      .receipt-id {
        font-family: var(--boba-font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--boba-color-text-muted);
      }
      .receipt-date {
        font-family: var(--boba-font-mono);
        font-size: 11px;
        color: var(--boba-color-text-muted);
        margin-top: 4px;
      }
      .receipt-title {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: -0.01em;
        margin-top: 4px;
      }
      .receipt-body {
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .receipt-lines {
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-sm);
        overflow: hidden;
      }
      .receipt-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid var(--boba-color-border);
        font-size: 11px;
      }
      .receipt-line:last-child {
        border-bottom: none;
      }
      .receipt-code-box {
        border: 1px solid var(--boba-color-border);
        border-radius: var(--boba-radius-sm);
        padding: 12px;
        background: var(--boba-color-bg-subtle);
      }
      .receipt-code-sub {
        font-size: 10px;
        color: var(--boba-color-text-muted);
        line-height: 1.5;
      }
      .receipt-actions {
        display: flex;
        gap: 8px;
        padding: 0 16px 16px;
      }
      .receipt-actions .btn {
        flex: 1;
        padding: 12px;
      }
      @media (max-width: 380px) {
        .modal-overlay {
          padding: 20px;
        }
        .modal-card {
          margin: 0 8px;
        }
      }
    `,
  ],
  template: `
    <div class="modal-overlay" *ngIf="open" (click)="onBackdrop($event)">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Checkout">
        <div class="modal-head">
          <div class="modal-title">{{ phase === 'receipt' ? 'Receipt' : 'Payment details' }}</div>
          <button class="modal-close" (click)="close()" aria-label="Close" [disabled]="paying">✕</button>
        </div>

        <ng-container *ngIf="phase === 'pay'">
          <div class="modal-body">
            <div class="order-lines">
              <div class="order-line" *ngFor="let line of cart.lines()">
                <div class="order-line-main">
                  <div class="order-line-name">{{ line.qty }}× {{ line.product.name }}</div>
                  <div class="order-line-meta">Unit {{ fmt(price(line.product.price)) }}</div>
                </div>
                <div class="order-line-price">{{ fmt(price(line.product.price) * line.qty) }}</div>
              </div>
            </div>
            <div class="totals">
              <div class="totals-row"><span>Subtotal</span><strong>{{ fmt(cart.total()) }}</strong></div>
              <div class="totals-row"><span>Total · GH₵</span><strong>{{ fmt(cart.total()) }}</strong></div>
            </div>
            <div class="pay-box">
              <div class="pay-label">Payment — dev mock engine (plugin-able PSP deferred)</div>
              <div class="pay-method">
                <div>
                  <div class="pay-method-name">Mock PSP</div>
                  <div class="pay-method-sub">Dev only — no real charge · GH₵ via mock</div>
                </div>
                <span class="badge">DEV</span>
              </div>
              <button class="pay-cta" (click)="pay()" [disabled]="paying || locked">
                {{ payLabel }}
              </button>
              <div class="error-note" *ngIf="error">{{ error }}</div>
              <div class="error-note" *ngIf="cart.belowMinimum()">
                Minimum order is ₵{{ MIN_ORDER_GHS }} — add more to the cart.
              </div>
              <div class="fine-print">
                By paying, you agree to pickup within 30m of “Ready”. Code expires. Hosting via cloudflared dev
                tunnel. Multi-tenant.
              </div>
            </div>
          </div>
        </ng-container>

        <ng-container *ngIf="phase === 'receipt' && order">
          <div class="modal-body">
            <div class="receipt-card">
              <div class="receipt-head">
                <div>
                  <div class="receipt-id">ORDER {{ shortId(order.id) }}</div>
                  <div class="receipt-title">Payment successful</div>
                  <div class="receipt-date">{{ localDate(order.created_at) }}</div>
                </div>
                <span class="badge">Paid</span>
              </div>
              <div class="receipt-body">
                <div class="receipt-lines">
                  <div class="receipt-line" *ngFor="let it of order.items">
                    <span>{{ it.qty }}× {{ it.name }}</span>
                    <strong>{{ fmt(price(it.unit_price) * it.qty) }}</strong>
                  </div>
                  <div class="receipt-line">
                    <span>Total</span>
                    <strong>{{ fmt(price(order.total)) }}</strong>
                  </div>
                </div>
                <div class="receipt-code-box">
                  <div>
                    Pickup code appears in tracking when the shop marks your order ready.
                  </div>
                  <div class="receipt-code-sub">Show at counter. Visible to staff.</div>
                </div>
              </div>
            </div>
          </div>
          <div class="receipt-actions">
            <a class="btn btn-ghost" [href]="receiptHref" download>Download receipt</a>
            <button class="btn btn-primary" (click)="onTrack()">Track order →</button>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class CheckoutModal implements OnChanges {
  @Input() open = false;
  @Input() tenantSlug = 'boba-obsidian';
  @Output() closed = new EventEmitter<void>();
  @Output() trackOrder = new EventEmitter<CustomerOrder>();

  readonly MIN_ORDER_GHS = MIN_ORDER_GHS;
  phase: 'pay' | 'receipt' = 'pay';
  paying = false;
  error: string | null = null;
  order: CustomerOrder | null = null;
  payment: PaymentPayload | null = null;

  constructor(
    readonly cart: CartService,
    private customer: CustomerService,
    private toast: ToastService,
  ) {}

  ngOnChanges(): void {
    if (this.open) {
      this.phase = 'pay';
      this.error = null;
    }
  }

  get locked(): boolean {
    return this.cart.empty() || this.cart.belowMinimum();
  }

  get payLabel(): string {
    if (this.paying) return 'Processing…';
    return 'Pay securely →';
  }

  get receiptHref(): string {
    return this.order ? this.customer.receiptUrl(this.tenantSlug, this.order.id) : '#';
  }

  price(raw: string): number {
    return parseFloat(raw);
  }

  fmt(n: number): string {
    return '₵' + n.toFixed(2);
  }

  shortId(id: string | null): string {
    return id ? `#${id.slice(0, 13)}` : '—';
  }

  localDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  close(): void {
    if (this.paying) return;
    this.closed.emit();
  }

  async pay(): Promise<void> {
    if (this.cart.lines().length === 0) return;
    this.error = null;
    this.paying = true;
    const items = this.cart.lines().map(l => ({ sku: l.product.sku, qty: l.qty }));
    try {
      if (!this.payment) {
        const res = await firstValueFrom(this.customer.createOrder(this.tenantSlug, items));
        this.order = res.order;
        this.payment = res.payment;
      }
      await new Promise(r => setTimeout(r, PSP_LATENCY_MS));
      await firstValueFrom(
        this.customer.fireMockWebhook(this.order!.id, this.payment!.psp_tx_id),
      );
      this.payment = null;
      this.persistLastOrder();
      this.cart.clear();
      this.phase = 'receipt';
      this.toast.push('Order sent — awaiting admin confirmation');
    } catch (err) {
      this.error = envelopeMessage(err);
    } finally {
      this.paying = false;
    }
  }

  onTrack(): void {
    if (this.order) this.trackOrder.emit(this.order);
  }

  private persistLastOrder(): void {
    if (!this.order) return;
    try {
      localStorage.setItem(`boba:tenant:${this.tenantSlug}:lastOrderId`, this.order.id);
    } catch {
      /* storage unavailable */
    }
  }
}