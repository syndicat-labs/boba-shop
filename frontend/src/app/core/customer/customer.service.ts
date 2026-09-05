import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface TenantPublic {
  tenant: { id: string; slug: string; name: string; currency: string };
}

export interface CustomerProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  price: string;
  image_key?: string | null;
  card_image_key?: string | null;
  sort: number;
  is_active: boolean;
}

export interface CustomerOrderItem {
  sku: string;
  name: string;
  qty: number;
  unit_price: string;
  modifiers?: string[];
}

export interface CustomerOrder {
  id: string;
  tenant: string;
  status: string;
  items: CustomerOrderItem[];
  subtotal: string;
  total: string;
  currency: string;
  pickup_code: string | null;
  pickup_expires_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PaymentPayload {
  id: string;
  psp: string;
  amount: string;
  currency: string;
  client_secret: string;
  psp_tx_id: string;
}

export interface CreateOrderResponse {
  order: CustomerOrder;
  payment: PaymentPayload;
}

export interface CustomerBanner {
  id?: string;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string | null;
  slides: CustomerBannerSlide[];
}

export interface CustomerBannerSlide {
  id?: string;
  image_url?: string | null;
  kicker: string;
  title: string;
  announcement?: string;
  position: number;
  is_active: boolean;
}

export function assetUrl(key?: string | null): string {
  if (!key) return '';
  if (key.startsWith('http') || key.startsWith('/')) return key;
  return `/assets/boba/${key}`;
}

/** Dev-only mock PSP. The browser stands in for the PSP server posting the outcome. */
export const MOCK_WEBHOOK_SIGNATURE = 'mock-sig';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private tenantsUrl = '/api/v1/tenants/';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private forTenant(slug: string): void {
    this.auth.tenantSlug.set(slug);
  }

  bootstrap(slug: string): Observable<TenantPublic> {
    this.forTenant(slug);
    return this.http.get<TenantPublic>(`${this.tenantsUrl}${slug}/public/`);
  }

  listProducts(slug: string): Observable<CustomerProduct[]> {
    this.forTenant(slug);
    return this.http.get<CustomerProduct[]>(`${this.tenantsUrl}${slug}/products/?active=1`);
  }

  listBanners(slug: string): Observable<CustomerBanner[]> {
    this.forTenant(slug);
    return this.http.get<CustomerBanner[]>(`${this.tenantsUrl}${slug}/banners/?active=1`);
  }

  createOrder(
    slug: string,
    items: { sku: string; qty: number }[],
  ): Observable<CreateOrderResponse> {
    this.forTenant(slug);
    return this.http.post<CreateOrderResponse>(`${this.tenantsUrl}${slug}/orders/`, { items });
  }

  track(slug: string, oid: string): Observable<CustomerOrder> {
    this.forTenant(slug);
    return this.http.get<CustomerOrder>(`${this.tenantsUrl}${slug}/orders/${oid}/`);
  }

  confirmPickup(
    slug: string,
    oid: string,
    code: string,
  ): Observable<{ verified: boolean; order: CustomerOrder }> {
    this.forTenant(slug);
    return this.http.post<{ verified: boolean; order: CustomerOrder }>(
      `${this.tenantsUrl}${slug}/orders/${oid}/confirm_pickup/`,
      { code },
    );
  }

  receiptUrl(slug: string, oid: string): string {
    return `${this.tenantsUrl}${slug}/orders/${oid}/receipt/`;
  }

  fireMockWebhook(orderId: string, pspTxId: string, success = true): Observable<{ ok: boolean }> {
    return this.http.post<{ ok: boolean }>(
      '/api/v1/webhooks/psp/mock/',
      { order_id: orderId, psp_tx_id: pspTxId, success },
      { headers: new HttpHeaders({ 'X-PSP-Signature': MOCK_WEBHOOK_SIGNATURE }) },
    );
  }
}