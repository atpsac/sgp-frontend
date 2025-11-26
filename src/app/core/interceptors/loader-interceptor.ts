import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

let pending = 0;
function setLoading(active: boolean) {

}

export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  pending++;
  if (pending === 1) setLoading(true);

  return next(req).pipe(
    finalize(() => {
      pending--;
      if (pending <= 0) {
        pending = 0;
        setLoading(false);
      }
    })
  );
};
