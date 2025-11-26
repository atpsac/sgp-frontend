// src/app/features/roles/routes.ts
import { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./role-list/role-list').then(m => m.RoleList),
    data: { permission: 'roles:read', breadcrumb: 'Listado' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./role-form/role-form').then(m => m.RoleForm),
    data: { permission: 'roles:create', breadcrumb: 'Nuevo' },
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./role-form/role-form').then(m => m.RoleForm),
    data: { permission: 'roles:update', breadcrumb: 'Editar' },
  },
];
