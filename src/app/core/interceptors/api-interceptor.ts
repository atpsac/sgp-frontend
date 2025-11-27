// src/app/core/interceptors/api-interceptor.ts
import {
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1) Ignorar assets o URLs absolutas (login/logout/refresh usan absolutas)
  const isAbsolute = /^https?:\/\//i.test(req.url);
  const isAsset =
    req.url.startsWith('/assets') || req.url.startsWith('assets/');
  if (isAbsolute || isAsset) {
    return next(req);
  }

  // 2) Construir URL completa usando environment.apiUrl
  const base = environment.apiUrl.replace(/\/+$/, '');
  const clean = req.url.replace(/^\/+/, '');
  const url = `${base}/${clean}`;

  // 3) Adjuntar token de acceso si existe
  const accessToken = auth.getToken();

  let headers = req.headers.set('Accept', 'application/json');
  if (accessToken) {
    headers = headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const authReq = req.clone({ url, headers });

  // 4) Manejo de errores: intentar refresh si hay 401
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si NO es 401, devolvemos el error tal cual
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Si no hay refresh token, limpiamos sesión y vamos a login
      const refreshToken = auth.getRefreshToken();
      if (!refreshToken) {
        auth.clearSession();
        router.navigateByUrl('/login');
        return throwError(() => error);
      }

      // 5) Intentar refrescar tokens
      return auth.refreshTokens().pipe(
        switchMap((ok) => {
          if (!ok) {
            auth.clearSession();
            router.navigateByUrl('/login');
            return throwError(() => error);
          }

          // 6) Si el refresh fue OK, reintentamos la petición original
          const newAccess = auth.getToken();
          let retryHeaders = authReq.headers.set('Accept', 'application/json');
          if (newAccess) {
            retryHeaders = retryHeaders.set(
              'Authorization',
              `Bearer ${newAccess}`
            );
          }

          const retryReq = authReq.clone({ headers: retryHeaders });
          return next(retryReq);
        }),
        catchError((err) => {
          // Si falla el refresh, cerramos sesión
          auth.clearSession();
          router.navigateByUrl('/login');
          return throwError(() => err);
        })
      );
    })
  );
};
