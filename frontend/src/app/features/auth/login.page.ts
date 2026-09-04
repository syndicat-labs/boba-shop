import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="shell" style="display:flex;flex-direction:column;justify-content:center;padding:var(--boba-space-6)">
      <div style="font-size:var(--boba-text-sm);letter-spacing:0.14em;text-transform:uppercase;color:var(--boba-color-text-muted)">e-town boba</div>
      <h1 style="font-size:var(--boba-text-xl);font-weight:var(--boba-weight-black);margin:var(--boba-space-2) 0 var(--boba-space-6)">Owner portal</h1>
      <form (ngSubmit)="submit()" style="display:flex;flex-direction:column;gap:var(--boba-space-3)">
        <label style="display:flex;flex-direction:column;gap:var(--boba-space-1);font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">
          Tenant slug
          <input [(ngModel)]="tenant" name="tenant" placeholder="boba-obsidian" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
        </label>
        <label style="display:flex;flex-direction:column;gap:var(--boba-space-1);font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">
          Email
          <input [(ngModel)]="email" name="email" type="email" autocomplete="username" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
        </label>
        <label style="display:flex;flex-direction:column;gap:var(--boba-space-1);font-size:var(--boba-text-sm);color:var(--boba-color-text-muted)">
          Password
          <input [(ngModel)]="password" name="password" type="password" autocomplete="current-password" style="padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
        </label>
        <p *ngIf="error" style="color:var(--boba-color-warn);font-size:var(--boba-text-sm)">{{ error }}</p>
        <button type="submit" [disabled]="busy" style="margin-top:var(--boba-space-2);padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold);letter-spacing:0.08em;text-transform:uppercase">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  `,
})
export class LoginPage {
  tenant = 'boba-obsidian';
  email = '';
  password = '';
  busy = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  async submit(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await this.auth.login(this.email, this.password, this.tenant);
      await this.router.navigate(['/admin']);
    } catch {
      this.error = 'Invalid credentials.';
    } finally {
      this.busy = false;
    }
  }
}
