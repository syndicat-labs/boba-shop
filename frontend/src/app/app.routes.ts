import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginPage } from './features/auth/login.page';
import { AdminShell } from './features/admin/admin-shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: 'admin',
    component: AdminShell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'queue' },
      { path: 'queue', loadComponent: () => import('./features/admin/queue.page').then(m => m.QueuePage) },
      { path: 'menu-qr', loadComponent: () => import('./features/admin/menu-qr.page').then(m => m.MenuQrPage) },
      { path: 'catalog', loadComponent: () => import('./features/admin/catalog.page').then(m => m.CatalogPage) },
      { path: 'banners', loadComponent: () => import('./features/admin/banners.page').then(m => m.AdminBannersPage) },
      { path: 'staff', loadComponent: () => import('./features/admin/staff.page').then(m => m.StaffPage) },
      { path: 'analytics', loadComponent: () => import('./features/admin/analytics.page').then(m => m.AnalyticsPage) },
    ],
  },
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: '**', redirectTo: 'admin' },
];
