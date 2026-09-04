import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, Order } from '../../core/api/admin.service';

const NEXT: Record<string, string | null> = {
  SENT: 'RECEIVED',
  RECEIVED: 'PROCESSING',
  PROCESSING: 'READY',
  READY: 'AWAITING_PICKUP',
  AWAITING_PICKUP: 'COMPLETED',
  COMPLETED: null,
  CANCELLED: null,
};

const STEPS = ['SENT', 'RECEIVED', 'PROCESSING', 'READY', 'AWAITING_PICKUP', 'COMPLETED'];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold);margin:0 0 var(--boba-space-3)">Orders queue</h2>

      <div style="border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md);padding:var(--boba-space-3);margin-bottom:var(--boba-space-4)">
        <div style="font-size:var(--boba-text-xs);letter-spacing:0.12em;text-transform:uppercase;color:var(--boba-color-text-muted);margin-bottom:var(--boba-space-2)">Pickup verification</div>
        <div style="display:flex;gap:var(--boba-space-2);margin-bottom:var(--boba-space-2)">
          <input [(ngModel)]="code" maxlength="4" inputmode="numeric" placeholder="0000"
            style="flex:1;min-width:0;padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm);font-family:var(--boba-font-mono);font-size:var(--boba-text-xl);letter-spacing:0.3em;text-align:center" />
          <button (click)="verify()" [disabled]="code.length !== 4 || verifyBusy"
            style="padding:var(--boba-space-3) var(--boba-space-4);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold);white-space:nowrap">Verify</button>
        </div>
        <p *ngIf="verifyMessage" [style.color]="verifyOk ? 'var(--boba-color-success)' : 'var(--boba-color-warn)'" style="font-size:var(--boba-text-sm);margin:0 0 var(--boba-space-2)">{{ verifyMessage }}</p>
        <div style="border-top:1px solid var(--boba-color-border);padding-top:var(--boba-space-2)">
          <div *ngFor="let o of awaiting" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--boba-space-2);padding:var(--boba-space-2) 0;border-bottom:1px solid var(--boba-color-border)">
            <div style="min-width:0;display:flex;flex-wrap:wrap;align-items:center">
              <span class="mono" style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">#{{ o.id.slice(0, 8) }}</span>
              <span class="mono" style="font-size:var(--boba-text-sm);letter-spacing:0.2em;margin-left:var(--boba-space-3)">{{ o.pickup_code }}</span>
            </div>
            <button (click)="select(o)" style="padding:var(--boba-space-1) var(--boba-space-2);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-xs)">Use</button>
          </div>
          <div *ngIf="!awaiting.length" style="color:var(--boba-color-text-muted);font-size:var(--boba-text-sm);padding:var(--boba-space-2) 0">No orders awaiting pickup.</div>
        </div>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:var(--boba-space-2);margin-bottom:var(--boba-space-4)">
        <button *ngFor="let s of statuses" (click)="filter(s)"
          [style.background]="activeStatus === s ? 'var(--boba-color-chip-active-bg)' : 'var(--boba-color-chip-bg)'"
          [style.color]="activeStatus === s ? 'var(--boba-color-chip-active-text)' : 'var(--boba-color-text-muted)'"
          style="padding:var(--boba-space-1) var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-pill);font-size:var(--boba-text-sm)">{{ s || 'All' }}</button>
      </div>

      <div *ngIf="!orders.length" style="color:var(--boba-color-text-muted);font-size:var(--boba-text-sm)">No orders yet.</div>

      <div *ngFor="let o of orders" style="border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md);padding:var(--boba-space-3);margin-bottom:var(--boba-space-3)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="mono" style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">#{{ o.id.slice(0, 8) }}</span>
          <span class="mono" style="font-size:var(--boba-text-xs);font-weight:var(--boba-weight-bold)">{{ o.total }} {{ o.currency }}</span>
        </div>
        <div style="display:flex;gap:var(--boba-space-1);margin:var(--boba-space-2) 0;flex-wrap:wrap">
          <span *ngFor="let item of o.items" style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">{{ item.qty }}× {{ item.name }}</span>
        </div>

        <div style="display:flex;gap:var(--boba-space-1);margin:var(--boba-space-2) 0">
          <span *ngFor="let s of STEPS" style="flex:1;height:4px;border-radius:var(--boba-radius-pill)"
            [style.background]="stepIndex(o.status) >= stepIndex(s) ? 'var(--boba-color-accent)' : 'var(--boba-color-border)'"></span>
        </div>

        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:var(--boba-space-2)">
          <span style="font-size:var(--boba-text-sm);font-weight:var(--boba-weight-medium)">{{ o.status }}</span>
          <div style="display:flex;flex-wrap:wrap;gap:var(--boba-space-2)">
            <button *ngIf="o.pickup_code" class="mono" style="font-size:var(--boba-text-sm);letter-spacing:0.2em;color:var(--boba-color-text-muted)">CODE {{ o.pickup_code }}</button>
            <button *ngIf="next(o.status)" (click)="advance(o)"
              style="padding:var(--boba-space-2) var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-sm);font-weight:var(--boba-weight-bold);white-space:nowrap">
              {{ next(o.status) === 'COMPLETED' ? 'Complete' : '→ ' + next(o.status) }}
            </button>
            <a *ngIf="o.status === 'COMPLETED'" [href]="admin.receiptUrl(o.id)" target="_blank" style="padding:var(--boba-space-2) var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-sm)">Receipt</a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class QueuePage implements OnInit, OnDestroy {
  orders: Order[] = [];
  activeStatus = '';
  statuses = ['', 'SENT', 'RECEIVED', 'PROCESSING', 'READY', 'AWAITING_PICKUP', 'COMPLETED'];
  STEPS = STEPS;
  private timer: ReturnType<typeof setInterval> | null = null;

  code = '';
  awaiting: Order[] = [];
  verifyBusy = false;
  verifyOk = false;
  verifyMessage = '';

  constructor(public admin: AdminService) {}

  ngOnInit(): void {
    this.load();
    this.loadAwaiting();
    this.timer = setInterval(() => {
      this.load();
      this.loadAwaiting();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  load(): void {
    this.admin.listOrders(this.activeStatus || undefined).subscribe(orders => (this.orders = orders));
  }

  loadAwaiting(): void {
    this.admin.listOrders('AWAITING_PICKUP').subscribe(orders => (this.awaiting = orders));
  }

  filter(status: string): void {
    this.activeStatus = status;
    this.load();
  }

  next(status: string): string | null {
    return NEXT[status] ?? null;
  }

  stepIndex(status: string): number {
    return STEPS.indexOf(status);
  }

  advance(order: Order): void {
    const to = this.next(order.status);
    if (!to) return;
    this.admin.transition(order.id, to).subscribe(() => this.load());
  }

  select(order: Order): void {
    if (order.pickup_code) this.code = order.pickup_code;
  }

  verify(): void {
    const target = this.awaiting.find(o => o.pickup_code === this.code);
    if (!target) {
      this.verifyOk = false;
      this.verifyMessage = 'No awaiting order with that code.';
      return;
    }
    this.verifyBusy = true;
    this.admin.pickupVerify(target.id, this.code).subscribe({
      next: () => {
        this.verifyOk = true;
        this.verifyMessage = `Order #${target.id.slice(0, 8)} completed.`;
        this.code = '';
        this.load();
        this.loadAwaiting();
      },
      error: () => {
        this.verifyOk = false;
        this.verifyMessage = 'Code mismatch or expired.';
      },
      complete: () => (this.verifyBusy = false),
    });
  }
}
