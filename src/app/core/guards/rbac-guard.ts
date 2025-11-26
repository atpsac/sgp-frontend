import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, Router } from '@angular/router';
import { RbacService } from '../services/rbac';

export const rbacGuard: CanActivateChildFn = (route: ActivatedRouteSnapshot) => {
  const perm = route.data?.['permission'] as string | undefined;
  if (!perm) return true;
  const rbac = inject(RbacService);
  const router = inject(Router);
  if (rbac.can(perm)) return true;
  router.navigate(['/forbidden']);
  return false;
};
