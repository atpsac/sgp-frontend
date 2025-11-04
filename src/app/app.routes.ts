import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';

export const routes: Routes = [
  { path: 'auth', loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES) },

  {
    path: '',
    canActivate: [authGuard],
    component: AdminLayoutComponent,
    children: [
      // agrega aquí tus features (dashboard, tickets, etc.)
      { path: '', loadChildren: () => import('./features/dashboard/pages/dashboard.routes').then(m => m.DASHBOARD_ROUTES) },
      { path: 'tickets-balanza', loadChildren: () => import('./features/tickets-balanza/tickets-balanza.routes').then(m => m.TICKETS_ROUTES) },
    ]
  },

  { path: '**', redirectTo: '' }
];
