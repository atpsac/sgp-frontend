// src/app/features/usuarios/routes.ts
import { Routes } from '@angular/router';

export const PERMISOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./permits-list/permits-list').then(m => m.PermitsList),
    data: { permission: 'permits:read', breadcrumb: 'Listado' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./permits-form/permits-form').then(m => m.PermitsForm),
    data: { permission: 'permits:create', breadcrumb: 'Nuevo' },
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./permits-form/permits-form').then(m => m.PermitsForm),
    data: { permission: 'permits:update', breadcrumb: 'Editar' },
  },
];
