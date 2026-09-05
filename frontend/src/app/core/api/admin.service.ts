import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface Order {
  id: string;
  status: string;
  items: { sku: string; name: string; qty: number; unit_price: string }[];
  subtotal: string;
  total: string;
  currency: string;
  pickup_code: string | null;
  pickup_expires_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Product {
  id?: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  image_key?: string | null;
  card_image_key?: string | null;
  sort: number;
  is_active: boolean;
}

export interface Banner {
  id?: string;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string | null;
  slides: BannerSlide[];
}

export interface BannerSlide {
  id?: string;
  image_url?: string | null;
  kicker: string;
  title: string;
  announcement?: string;
  position: number;
  is_active: boolean;
}

export interface StaffMember {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface Summary {
  revenue: string;
  order_count: number;
  avg_order_value: string;
  completed_count: number;
  cancelled_count: number;
  pickup_completed: number;
  top_skus: { sku: string; qty: number }[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private get base(): string {
    return `/api/v1/tenants/${this.auth.tenantSlug()}`;
  }

  constructor(private http: HttpClient, private auth: AuthService) {}

  listOrders(status?: string): Observable<Order[]> {
    const q = status ? `?status=${status}` : '';
    return this.http.get<Order[]>(`${this.base}/orders/${q}`);
  }

  transition(orderId: string, to: string): Observable<Order> {
    return this.http.post<Order>(`${this.base}/orders/${orderId}/status/`, { to });
  }

  pickupVerify(orderId: string, code: string): Observable<{ verified: boolean; order: Order }> {
    return this.http.post<{ verified: boolean; order: Order }>(`${this.base}/orders/${orderId}/pickup_verify/`, { code });
  }

  receiptUrl(orderId: string): string {
    return `${this.base}/orders/${orderId}/receipt/`;
  }

  listProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.base}/products/`);
  }

  createProduct(p: Product): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products/`, p);
  }

  updateProduct(id: string, p: Product): Observable<Product> {
    return this.http.patch<Product>(`${this.base}/products/${id}/`, p);
  }

  uploadImage(file: File): Observable<{ key: string; url: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ key: string; url: string }>(`${this.base}/uploads/image/`, form);
  }

  listBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${this.base}/banners/`);
  }

  createBanner(b: Banner): Observable<Banner> {
    return this.http.post<Banner>(`${this.base}/banners/`, b);
  }

  updateBanner(id: string, b: Partial<Banner>): Observable<Banner> {
    return this.http.patch<Banner>(`${this.base}/banners/${id}/`, b);
  }

  listStaff(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(`${this.base}/staff/`);
  }

  inviteStaff(email: string): Observable<StaffMember> {
    return this.http.post<StaffMember>(`${this.base}/staff/invite/`, { email, role: 'STAFF' });
  }

  summary(days = 7): Observable<Summary> {
    return this.http.get<Summary>(`${this.base}/analytics/summary/?days=${days}`);
  }

  menuQrUrl(url: string): string {
    const tenant = this.auth.tenantSlug();
    return `${this.base}/menu/qr/?tenant=${encodeURIComponent(tenant)}&url=${encodeURIComponent(url)}`;
  }
}
