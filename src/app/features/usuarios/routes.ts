// src/app/features/usuarios/routes.ts
import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./user-list/user-list').then(m => m.UserList),
    data: { permission: 'users:read', breadcrumb: 'Listado' },
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./user-form/user-form').then(m => m.UserForm),
    data: { permission: 'users:create', breadcrumb: 'Nuevo' },
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./user-form/user-form').then(m => m.UserForm),
    data: { permission: 'users:update', breadcrumb: 'Editar' },
  },
];
