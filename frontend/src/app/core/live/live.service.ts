import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { CustomerOrder } from '../customer/customer.service';

@Injectable({ providedIn: 'root' })
export class LiveService {
  private orderEvents$ = new Subject<CustomerOrder>();

  /** Per-order live stream (ws/tenants/<uuid>/orders/<oid>). */
  orderStream(
    tenantUuid: string,
    orderId: string,
    wsBase = location.origin.replace(/^http/, 'ws'),
  ): Observable<CustomerOrder> {
    try {
      const ws = new WebSocket(`${wsBase}/ws/tenants/${tenantUuid}/orders/${orderId}`);
      ws.onmessage = e => {
        try {
          this.orderEvents$.next(JSON.parse(e.data) as CustomerOrder);
        } catch {
          /* ignore malformed frames */
        }
      };
    } catch {
      /* WS unavailable — caller polls as fallback */
    }
    return this.orderEvents$.asObservable();
  }
}