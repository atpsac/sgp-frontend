import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./reporte-home/reporte-home').then(m => m.ReporteHome),
    data: { permission: 'reportes:read', breadcrumb: 'Listado' },
  },
];
