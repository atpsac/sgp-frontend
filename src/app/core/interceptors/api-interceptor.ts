// src/app/core/interceptors/api.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // no tocar assets o URLs absolutas
  const isAbsolute = /^https?:\/\//i.test(req.url);
  const isAsset = req.url.startsWith('/assets') || req.url.startsWith('assets/');
  if (isAbsolute || isAsset) return next(req);

  const auth = inject(AuthService);
  const token = auth.getToken();

  const url = `${environment.apiUrl.replace(/\/+$/,'')}/${req.url.replace(/^\/+/,'')}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return next(req.clone({ url, setHeaders: headers }));
};
