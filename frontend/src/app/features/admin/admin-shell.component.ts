import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" style="display:flex;flex-direction:column">
      <header style="position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;height:var(--boba-header-h);padding:0 var(--boba-space-4);background:var(--boba-color-bg);border-bottom:1px solid var(--boba-color-border)">
        <div style="display:flex;align-items:baseline;gap:var(--boba-space-2)">
          <span style="font-size:var(--boba-text-sm);font-weight:var(--boba-weight-bold);letter-spacing:0.02em">e-town boba</span>
          <span style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted);text-transform:uppercase;letter-spacing:0.12em">Admin</span>
        </div>
        <div style="display:flex;align-items:center;gap:var(--boba-space-3)">
          <span class="mono" style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">{{ auth.user()?.role }}</span>
          <button (click)="logout()" style="padding:var(--boba-space-1) var(--boba-space-2);background:transparent;border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm);font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">Sign out</button>
        </div>
      </header>

      <nav style="display:flex;gap:var(--boba-space-1);padding:var(--boba-space-2) var(--boba-space-4);overflow-x:auto;border-bottom:1px solid var(--boba-color-border)">
        <a *ngFor="let item of items" [routerLink]="item.path" routerLinkActive="nav-active"
           [style.display]="item.ownerOnly && !auth.isOwner ? 'none' : 'inline-block'"
           style="padding:var(--boba-space-1) var(--boba-space-3);border-radius:var(--boba-radius-pill);font-size:var(--boba-text-sm);white-space:nowrap;color:var(--boba-color-text-muted)">{{ item.label }}</a>
      </nav>

      <main style="flex:1;padding:var(--boba-space-4)">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      a.nav-active {
        background: var(--boba-color-chip-active-bg);
        color: var(--boba-color-chip-active-text);
      }
    `,
  ],
})
export class AdminShell {
  items = [
    { label: 'Queue', path: 'queue', ownerOnly: false },
    { label: 'Catalog', path: 'catalog', ownerOnly: true },
    { label: 'Banners', path: 'banners', ownerOnly: true },
    { label: 'Menu QR', path: 'menu-qr', ownerOnly: true },
    { label: 'Staff', path: 'staff', ownerOnly: true },
    { label: 'Analytics', path: 'analytics', ownerOnly: true },
  ];

  constructor(public auth: AuthService, private router: Router) {}

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
