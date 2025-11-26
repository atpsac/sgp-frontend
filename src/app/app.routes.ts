import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { rbacGuard } from './core/guards/rbac-guard';
import { Shell } from './core/layout/shell/shell';


export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login-page/login-page').then(m => m.LoginPage) },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    canActivateChild: [rbacGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard',  loadChildren: () => import('./features/dashboard/routes').then(m => m.DASHBOARD_ROUTES),  data: { permission: 'dashboard:read',  breadcrumb: 'Dashboard'  } },
      { path: 'pesadas',   loadChildren: () => import('./features/pesadas/routes').then(m => m.PESADAS_ROUTES),   data: { permission: 'pesadas:read',      breadcrumb: 'Pesadas' } },
      { path: 'reportes',   loadChildren: () => import('./features/reportes/routes').then(m => m.REPORTES_ROUTES),   data: { permission: 'reportes:read',      breadcrumb: 'Reportes' } },
      { path: 'usuarios',   loadChildren: () => import('./features/usuarios/routes').then(m => m.USERS_ROUTES),   data: { permission: 'users:read',      breadcrumb: 'Usuarios' } },
      { path: 'roles',      loadChildren: () => import('./features/roles/routes').then(m => m.ROLES_ROUTES),      data: { permission: 'roles:read',      breadcrumb: 'Roles' } },
      { path: 'permisos',   loadChildren: () => import('./features/permisos/routes').then(m => m.PERMISOS_ROUTES),      data: { permission: 'permits:read',      breadcrumb: 'Permisos' } },
      { path: 'empresa',   loadChildren: () => import('./features/empresa/routes').then(m => m.EMPRESA_ROUTES),      data: { permission: 'empresa:read',      breadcrumb: 'Empresa' } },
      { path: 'sedes',   loadChildren: () => import('./features/sedes/routes').then(m => m.SEDES_ROUTES),      data: { permission: 'sedes:read',      breadcrumb: 'Sedes' } },
      { path: 'transportista',   loadChildren: () => import('./features/transportistas/routes').then(m => m.TRANSPORTISTA_ROUTES),      data: { permission: 'transportista:read',      breadcrumb: 'Transportistas' } },
      { path: 'perfil',   loadChildren: () => import('./features/perfil/routes').then(m => m.PERFIL_ROUTES),      data: { permission: 'perfil:read',      breadcrumb: 'Perfil' } },
      { path: 'forbidden',  loadComponent: () => import('./shared/components/feedback/not-allowed/not-allowed').then(m => m.NotAllowed), data: { breadcrumb: '403' } },
    ],
  },
  { path: '**', loadComponent: () => import('./shared/components/feedback/not-found/not-found').then(m => m.NotFound) },
];
