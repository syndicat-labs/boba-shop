import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, StaffMember } from '../../core/api/admin.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h2 style="font-size:var(--boba-text-lg);font-weight:var(--boba-weight-bold);margin:0 0 var(--boba-space-2)">Staff</h2>
      <p style="font-size:var(--boba-text-sm);color:var(--boba-color-text-muted);margin:0 0 var(--boba-space-4)">Invite staff to operate the queue and verify pickups.</p>

      <div *ngFor="let s of staff" style="display:flex;justify-content:space-between;align-items:center;padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-md);margin-bottom:var(--boba-space-2)">
        <div>
          <div style="font-size:var(--boba-text-sm);font-weight:var(--boba-weight-semibold)">{{ s.email }}</div>
          <div class="mono" style="font-size:var(--boba-text-xs);color:var(--boba-color-text-muted)">{{ s.role }}</div>
        </div>
        <span *ngIf="!s.is_active" style="font-size:var(--boba-text-xs);color:var(--boba-color-warn)">inactive</span>
      </div>

      <div style="border-top:1px solid var(--boba-color-border);margin-top:var(--boba-space-4);padding-top:var(--boba-space-4)">
        <form (ngSubmit)="invite()" style="display:flex;gap:var(--boba-space-2)">
          <input [(ngModel)]="email" name="email" type="email" placeholder="staff@example.com" style="flex:1;padding:var(--boba-space-3);border:1px solid var(--boba-color-border);border-radius:var(--boba-radius-sm)" />
          <button type="submit" [disabled]="!email || busy" style="padding:var(--boba-space-3);background:var(--boba-color-bg-inverse);color:var(--boba-color-text-inverse);border:1px solid var(--boba-color-border-strong);border-radius:var(--boba-radius-sm);font-weight:var(--boba-weight-bold)">Invite</button>
        </form>
        <p *ngIf="message" style="font-size:var(--boba-text-sm);color:var(--boba-color-success)">{{ message }}</p>
      </div>
    </div>
  `,
})
export class StaffPage implements OnInit {
  staff: StaffMember[] = [];
  email = '';
  busy = false;
  message = '';

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.admin.listStaff().subscribe(staff => (this.staff = staff));
  }

  invite(): void {
    this.busy = true;
    this.admin.inviteStaff(this.email).subscribe({
      next: () => {
        this.busy = false;
        this.message = `${this.email} invited.`;
        this.email = '';
        this.load();
      },
      error: () => (this.busy = false),
    });
  }
}
