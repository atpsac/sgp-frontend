import { Routes } from '@angular/router';

export const TRANSPORTISTA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./transportista-list/transportista-list').then(m => m.TransportistaList),
    data: { permission: 'transportista:read', breadcrumb: 'Listado' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./transportista-form/transportista-form').then(m => m.TransportistaForm),
    data: { permission: 'transportista:create', breadcrumb: 'Nuevo' },
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./transportista-form/transportista-form').then(m => m.TransportistaForm),
    data: { permission: 'transportista:update', breadcrumb: 'Editar' },
  },
];
