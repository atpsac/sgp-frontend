import { Routes } from '@angular/router';
import { DashboardPage } from './dashboard-page/dashboard-page';
import { PedidoDetails } from './pedido-details/pedido-details';


export const DASHBOARD_ROUTES: Routes = [
  { path: '', component: DashboardPage, data: { breadcrumb: 'Dashboard' } },
  { path: 'pedido/:id', component: PedidoDetails, data: { breadcrumb: 'Dashboard' } },
];
