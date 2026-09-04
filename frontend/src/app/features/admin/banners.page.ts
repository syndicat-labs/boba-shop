import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LiveService } from '../../core/live/live.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
  <div style="max-width:390px;margin:0 auto;padding:16px;font-family:Inter,system-ui,sans-serif">
    <h2 style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase">Admin — Banners (multi-tenant)</h2>
    <p style="font-size:11px;color:#6b6b6b;margin-top:4px">Owner only. Drag sort, set active, preview obsidian banner.</p>
    <div style="margin-top:12px;border:1px solid #0a0a0a;border-radius:4px;overflow:hidden">
      <div style="background:#0a0a0a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.6">{{form.kicker}}</div><div style="font-size:13px;font-weight:700">{{form.title}}</div></div>
        <button style="border:1px solid rgba(255,255,255,0.22);background:transparent;color:#fff;padding:8px 12px;border-radius:4px">{{form.cta_label}}</button>
      </div>
    </div>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
      <input [(ngModel)]="form.kicker" placeholder="Kicker (40)" maxlength="40" style="padding:10px;border:1px solid #e7e7e4;border-radius:4px" />
      <input [(ngModel)]="form.title" placeholder="Title (120)" maxlength="120" style="padding:10px;border:1px solid #e7e7e4;border-radius:4px" />
      <div style="display:flex;gap:8px">
        <input [(ngModel)]="form.cta_label" placeholder="CTA View →" style="flex:1;padding:10px;border:1px solid #e7e7e4;border-radius:4px" />
        <select [(ngModel)]="form.cta_type" style="padding:10px;border:1px solid #e7e7e4;border-radius:4px"><option value="sku">sku</option><option value="url">url</option><option value="anchor">anchor</option></select>
      </div>
      <input [(ngModel)]="form.cta_value" placeholder="sku/url/anchor value" style="padding:10px;border:1px solid #e7e7e4;border-radius:4px" />
      <button (click)="publish()" style="padding:12px;background:#0a0a0a;color:#fff;border:1px solid #0a0a0a;border-radius:4px;font-weight:700">Publish live → (WS + mock)</button>
      <button (click)="useMockFeed()" style="padding:10px;background:#fffbe6;border:1px dashed #e7e7e4;border-radius:4px">Inject mock feed 8s (dev)</button>
    </div>
  </div>`
})
export class AdminBannersPage {
  form: any = {kicker:'House · Batch at :00', title:'Brown Sugar — brewed Taichung way', cta_label:'View →', cta_type:'sku', cta_value:'brown-sugar'};
  constructor(private live: LiveService){}
  publish(){
    // In prod: POST /api/v1/tenants/{tid}/banners; dev: publish via LiveService mock
    this.live.publishMock('boba-obsidian', {...this.form, at:new Date().toISOString()});
    alert('Published live to tenant boba-obsidian — customer sees <2s');
  }
  useMockFeed(){
    // enable interval mock
    (window as any).tickBanner?.();
    alert('Mock tick sent');
  }
}
