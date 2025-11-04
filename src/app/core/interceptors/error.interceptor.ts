import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      console.error('HTTP error:', err);
      alert(err.error?.message ?? 'Ocurrió un error al procesar la solicitud.');
      return throwError(() => err);
    })
  );
