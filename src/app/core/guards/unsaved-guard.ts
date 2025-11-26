import { CanActivateFn } from '@angular/router';

export const unsavedGuard: CanActivateFn = (route, state) => {
  return true;
};
