import { Routes } from '@angular/router';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./empresa-form/empresa-form').then(m => m.EmpresaForm),
    data: { permission: 'empresa:read', breadcrumb: 'Listado' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./empresa-form/empresa-form').then(m => m.EmpresaForm),
    data: { permission: 'empresa:create', breadcrumb: 'Nuevo' },
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./empresa-form/empresa-form').then(m => m.EmpresaForm),
    data: { permission: 'empresa:update', breadcrumb: 'Editar' },
  },
];
