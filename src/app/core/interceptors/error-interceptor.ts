import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      console.error('[HTTP ERROR]', err.status, err.message);
      if (err.status === 401) {

      }
      return throwError(() => err);
    })
  );
