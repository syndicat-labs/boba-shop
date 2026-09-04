import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Me {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  tenant: string;
  authenticated?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = '/api/v1/auth';
  user = signal<Me | null>(null);
  tenantSlug = signal('boba-obsidian');

  constructor(private http: HttpClient) {}

  get isOwner(): boolean {
    return this.user()?.role === 'OWNER';
  }

  async login(email: string, password: string, tenant: string): Promise<Me> {
    const headers = new HttpHeaders({ 'X-Tenant-Slug': tenant });
    const me = await firstValueFrom(this.http.post<Me>(`${this.base}/login/`, { email, password }, { headers }));
    this.tenantSlug.set(me.tenant);
    this.user.set(me);
    return me;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.base}/logout/`, {}));
    } finally {
      this.user.set(null);
    }
  }

  async refresh(): Promise<Me | null> {
    try {
      const me = await firstValueFrom(this.http.get<Me>(`${this.base}/me/`));
      if (!me?.authenticated) {
        this.user.set(null);
        return null;
      }
      this.user.set(me);
      this.tenantSlug.set(me.tenant);
      return me;
    } catch {
      this.user.set(null);
      return null;
    }
  }
}
