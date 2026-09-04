import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (UNSAFE.has(req.method) && req.url.startsWith('/api/')) {
      const token = getCookie('csrftoken');
      if (token) {
        req = req.clone({ setHeaders: { 'X-CSRFToken': token } });
      }
    }
    return next.handle(req);
  }
}
