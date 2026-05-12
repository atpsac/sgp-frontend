import { Routes } from '@angular/router';

export const MAINTENANCE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'carriers/listar',
  },

  // Carriers
  {
    path: 'carriers/listar',
    loadComponent: () =>
      import('./carriers/carrier-list/carrier-list').then(m => m.CarrierList),
    data: { permission: 'maintenance:read', breadcrumb: 'Transportistas' },
  },

  // Drivers
  {
    path: 'drivers/listar',
    loadComponent: () =>
      import('./drivers/driver-list/driver-list').then(m => m.DriverList),
    data: { permission: 'maintenance:read', breadcrumb: 'Choferes' },
  },

  // Trucks
  {
    path: 'trucks/listar',
    loadComponent: () =>
      import('./trucks/truck-list/truck-list').then(m => m.TruckList),
    data: { permission: 'maintenance:read', breadcrumb: 'Camiones' },
  },

  // Trailers
  {
    path: 'trailers/listar',
    loadComponent: () =>
      import('./trailers/trailer-list/trailer-list').then(m => m.TrailerList),
    data: { permission: 'maintenance:read', breadcrumb: 'Trailers' },
  },
];