import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, Summary } from '../../core/api/admin.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h2 style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold);margin:0 0 var(--boba-space-4)">Analytics</h2>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--boba-space-2);margin-bottom:var(--boba-space-4)">
        <div style="border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md);padding:var(--boba-space-3)">
          <div style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">Revenue (7d)</div>
          <div class="mono" style="font-size:var(--boba-text-xl);font-weight:var(--boba-weight-bold)">₵{{ s.revenue }}</div>
        </div>
        <div style="border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md);padding:var(--boba-space-3)">
          <div style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">Orders</div>
          <div class="mono" style="font-size:var(--boba-text-xl);font-weight:var(--boba-weight-bold)">{{ s.order_count }}</div>
        </div>
        <div style="border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md);padding:var(--boba-space-3)">
          <div style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">Avg order</div>
          <div class="mono" style="font-size:var(--boba-text-xl);font-weight:var(--boba-weight-bold)">₵{{ s.avg_order_value }}</div>
        </div>
        <div style="border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md);padding:var(--boba-space-3)">
          <div style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">Completed</div>
          <div class="mono" style="font-size:var(--boba-text-xl);font-weight:var(--boba-weight-bold)">{{ s.completed_count }}<span style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)"> / {{ s.cancelled_count }} canc.</span></div>
        </div>
      </div>

      <div style="border-top:1px solid var(--boba-color-border);padding-top:var(--boba-space-4)">
        <div style="font-size:var(--boba-text-xs);letter-spacing:0.12em;text-transform:uppercase;color:var(--boba-color-text-muted);margin-bottom:var(--boba-space-2)">Top SKUs</div>
        <div *ngFor="let t of s.top_skus" style="display:flex;justify-content:space-between;padding:var(--boba-space-2) 0;border-bottom:1px solid var(--boba-color-border)">
          <span style="font-size:var(--boba-text-sm)">{{ t.sku }}</span>
          <span class="mono" style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">{{ t.qty }}</span>
        </div>
      </div>
    </div>
  `,
})
export class AnalyticsPage implements OnInit {
  s: Summary = { revenue: '0', order_count: 0, avg_order_value: '0', completed_count: 0, cancelled_count: 0, pickup_completed: 0, top_skus: [] };

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.admin.summary(7).subscribe(s => (this.s = s));
  }
}
