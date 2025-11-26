import { Routes } from '@angular/router';

export const SEDES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sedes-list/sedes-list').then(m => m.SedesList),
    data: { permission: 'sedes:read', breadcrumb: 'Listado' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./sedes-form/sedes-form').then(m => m.SedesForm),
    data: { permission: 'sedes:create', breadcrumb: 'Nuevo' },
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./sedes-form/sedes-form').then(m => m.SedesForm),
    data: { permission: 'sedes:update', breadcrumb: 'Editar' },
  },
];
