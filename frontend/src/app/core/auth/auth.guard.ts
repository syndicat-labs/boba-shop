import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.user()) {
    await auth.refresh();
  }
  if (!auth.user()) {
    return router.createUrlTree(['/login']);
  }
  return true;
};

export const ownerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isOwner;
};
