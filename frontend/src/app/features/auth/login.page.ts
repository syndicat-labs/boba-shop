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
          <div class="pw-field">
            <input [(ngModel)]="password" name="password" [type]="showPassword ? 'text' : 'password'" autocomplete="current-password" style="padding:var(--boba-space-3) 44px var(--boba-space-3) var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
            <button type="button" class="pw-toggle" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'" [attr.aria-pressed]="showPassword">
              <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
        </label>
        <p *ngIf="error" style="color:var(--boba-color-warn);font-size:var(--boba-text-sm)">{{ error }}</p>
        <button type="submit" [disabled]="busy" style="margin-top:var(--boba-space-2);padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold);letter-spacing:0.08em;text-transform:uppercase">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .pw-field {
        position: relative;
      }
      .pw-field input {
        width: 100%;
        box-sizing: border-box;
      }
      .pw-toggle {
        position: absolute;
        top: 50%;
        right: 6px;
        transform: translateY(-50%);
        width: 34px;
        height: 34px;
        min-width: 34px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: var(--boba-radius-sm);
        background: transparent;
        color: var(--boba-color-text-muted);
        cursor: pointer;
        transition: background var(--boba-duration-fast) var(--boba-ease-default), color var(--boba-duration-fast) var(--boba-ease-default);
      }
      .pw-toggle:hover {
        color: var(--boba-color-text);
        background: var(--boba-color-bg-subtle);
      }
    `,
  ],
})
export class LoginPage {
  tenant = 'boba-obsidian';
  email = '';
  password = '';
  showPassword = false;
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
