import { Routes } from '@angular/router';

export const PERFIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./perfil-form/perfil-form').then(m => m.PerfilForm),
    data: { permission: 'perfil:read', breadcrumb: 'Editar' },
  }
];
