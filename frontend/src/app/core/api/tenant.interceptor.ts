import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TenantInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.url.startsWith('/api/') && this.auth.tenantSlug()) {
      req = req.clone({ setHeaders: { 'X-Tenant-Slug': this.auth.tenantSlug() } });
    }
    return next.handle(req);
  }
}
