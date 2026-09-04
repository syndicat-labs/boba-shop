import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface BannerEvent { kicker: string; title: string; cta_label: string; cta_type: 'sku'|'url'|'anchor'; cta_value: string; at?: string; mock?: boolean; }

@Injectable({ providedIn: 'root' })
export class LiveService {
  private banner$ = new BehaviorSubject<BannerEvent | null>(null);
  private bc: BroadcastChannel | null = null;

  connect(tenantSlug: string, wsBase = location.origin.replace(/^http/, 'ws')): Observable<BannerEvent | null> {
    // Prefer WS, fallback to BroadcastChannel + localStorage mock
    try {
      const ws = new WebSocket(`${wsBase}/ws/tenants/${tenantSlug}/banners`);
      ws.onmessage = e => {
        try { const p = JSON.parse(e.data); this.banner$.next(p); this.bc?.postMessage({type:'banner:event', payload:p}); } catch {}
      };
      ws.onerror = () => this.fallback(tenantSlug);
    } catch { this.fallback(tenantSlug); }
    return this.banner$.asObservable();
  }

  private fallback(tenantSlug: string){
    try{
      this.bc = new BroadcastChannel('boba:banners');
      this.bc.onmessage = e => { if(e.data?.payload) this.banner$.next(e.data.payload); };
      // also listen localStorage set by admin mock
      window.addEventListener('storage', (ev)=>{
        if(ev.key===`boba:tenant:${tenantSlug}:banners:active` && ev.newValue){
          try{ this.banner$.next(JSON.parse(ev.newValue)); }catch{}
        }
      });
    } catch {}
  }

  publishMock(tenantSlug: string, ev: BannerEvent){
    // dev mock: localStorage + BroadcastChannel
    try{
      localStorage.setItem(`boba:tenant:${tenantSlug}:banners:active`, JSON.stringify(ev));
      this.bc?.postMessage({type:'banner:event', payload:ev});
      this.banner$.next(ev);
    } catch {}
  }
}
