import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/api/admin.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold);margin:0 0 var(--boba-space-2)">Menu QR</h2>
      <p style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted);margin:0 0 var(--boba-space-4)">Customers scan this code to open the menu.</p>

      <div style="display:flex;flex-direction:column;align-items:center;gap:var(--boba-space-4);padding:var(--boba-space-4);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md)">
        <img *ngIf="menuUrl" [src]="qrSrc" alt="Menu QR code" width="220" height="220" style="border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
        <div style="text-align:center;font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">Scan to open the customer menu</div>

        <div style="display:flex;gap:var(--boba-space-2);width:100%">
          <a [href]="qrSrc" download="menu-qr.png" target="_blank" style="flex:1;text-align:center;padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-sm);font-weight:var(--boba-weight-bold)">Download PNG</a>
          <button (click)="copy()" style="flex:1;padding:var(--boba-space-3);background:var(--boba-color-bg);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-sm)">Copy link</button>
        </div>
      </div>

      <div style="margin-top:var(--boba-space-4);display:flex;flex-direction:column;gap:var(--boba-space-2)">
        <label style="font-size:var(--boba-text-xs);letter-spacing:0.12em;text-transform:uppercase;color:var(--boba-color-text-muted)">Customer menu URL</label>
        <input [(ngModel)]="menuUrl" name="menuUrl" placeholder="https://…" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
        <p *ngIf="copied" style="font-size:var(--boba-text-xs);color:var(--boba-color-success);margin:0">Link copied.</p>
      </div>
    </div>
  `,
})
export class MenuQrPage implements OnInit {
  menuUrl = '';
  copied = false;

  constructor(
    private admin: AdminService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.menuUrl = `${window.location.origin}/#/menu/${this.auth.tenantSlug()}`;
  }

  get qrSrc(): string {
    return this.admin.menuQrUrl(this.menuUrl);
  }

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.menuUrl);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }
}