import { Routes } from '@angular/router';
import { DashboardPage } from './dashboard-page/dashboard-page';


export const DASHBOARD_ROUTES: Routes = [
  { path: '', component: DashboardPage, data: { breadcrumb: 'Dashboard' } },
];
