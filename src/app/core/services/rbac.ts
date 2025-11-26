import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RbacService {
  // Simula permisos; luego reemplaza por lo que venga de tu API
  private perms = new Set<string>(
    [
      'dashboard:read',
      'pesadas:read', 'pesadas:create',
      'reportes:read',
      'users:read',
      'roles:read',
      'permits:read',
      'empresa:read',
      'sedes:read',
      'transportista:read',
      'perfil:read',
    ]);

  can(permission: string): boolean {
    return this.perms.has(permission);
  }
}