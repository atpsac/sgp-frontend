import { Routes } from '@angular/router';

export const PESADAS_ROUTES: Routes = [
  {
    path: 'listar',
    loadComponent: () =>
      import('./pesada-list/pesada-list').then(m => m.PesadaList),
    data: { permission: 'pesadas:read', breadcrumb: 'Listado' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pesada-form/pesada-form').then(m => m.PesadaForm),
    data: { permission: 'pesadas:create', breadcrumb: 'Nuevo' },
  },
  // {
  //   path: ':id/editar',
  //   loadComponent: () =>
  //     import('./sedes-form/sedes-form').then(m => m.SedesForm),
  //   data: { permission: 'sedes:update', breadcrumb: 'Editar' },
  
  // },
];
