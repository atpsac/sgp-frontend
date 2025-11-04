import { Routes } from '@angular/router';
import { ListPage } from './pages/list.page/list.page';
import { NewPage } from './pages/new.page/new.page';
import { DetailPage } from './pages/detail.page/detail.page';

export const TICKETS_ROUTES: Routes = [
  { path: '', component: ListPage, title: 'Ticket de balanza - Listado' },
  { path: 'nuevo', component: NewPage, title: 'Ticket de balanza - Nuevo' },
  { path: ':id', component: DetailPage, title: 'Ticket de balanza - Detalle' }
];
