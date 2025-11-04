import { Routes } from '@angular/router';
import { LoginPage } from './login.page/login.page';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginPage, title: 'Login' }
];
