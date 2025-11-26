import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

type PermissionActionKey =
  | 'canView'
  | 'canEdit'
  | 'canCreate'
  | 'canDelete'
  | 'canStatus'
  | 'canExport';

interface ModulePermissionRow {
  id: number;
  moduleKey: string;
  label: string;

  canView: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canStatus: boolean; // antes Archivar, ahora Estado (acción)
  canExport: boolean;
}

@Component({
  selector: 'app-permits-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './permits-list.html',
  styleUrl: './permits-list.scss',
})
export class PermitsList implements OnInit {
  // Roles demo
  roles = [
    { id: 1, name: 'Administrador' },
    { id: 2, name: 'Operador de balanza' },
    { id: 3, name: 'Vendedor' },
    { id: 4, name: 'Cliente' },
  ];
  selectedRoleId = 1;

  // Permisos por rol (DEMO, sin API)
  private permissionsByRole: Record<number, ModulePermissionRow[]> = {
    // ============ ADMINISTRADOR ============
    1: [
      {
        id: 1,
        moduleKey: 'dashboard',
        label: 'Panel de control',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: false,
        canStatus: false,
        canExport: true,
      },
      {
        id: 2,
        moduleKey: 'weigh-ticket',
        label: 'Ticket de balanza',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: true,
        canStatus: false,
        canExport: true,
      },
      {
        id: 3,
        moduleKey: 'weigh-ticket-reports',
        label: 'Tickets emitidos',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: true,
        canStatus: false,
        canExport: true,
      },
      {
        id: 4,
        moduleKey: 'users',
        label: 'Usuarios',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: true,
        canStatus: true,
        canExport: true,
      },
      {
        id: 5,
        moduleKey: 'roles',
        label: 'Roles',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: true,
        canStatus: true,
        canExport: false,
      },
      {
        id: 6,
        moduleKey: 'permits',
        label: 'Permisos',
        canView: true,
        canEdit: true,
        canCreate: false,
        canDelete: false,
        canStatus: true,
        canExport: false,
      },
      {
        id: 7,
        moduleKey: 'company',
        label: 'Empresa',
        canView: true,
        canEdit: true,
        canCreate: false,
        canDelete: false,
        canStatus: true,
        canExport: false,
      },
      {
        id: 8,
        moduleKey: 'branches',
        label: 'Sedes',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: false,
        canStatus: true,
        canExport: false,
      },
      {
        id: 9,
        moduleKey: 'carriers',
        label: 'Transportistas',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: true,
        canStatus: true,
        canExport: true,
      },
      {
        id: 10,
        moduleKey: 'profile',
        label: 'Mi perfil',
        canView: true,
        canEdit: true,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
    ],

    // ============ OPERADOR DE BALANZA ============
    2: [
      {
        id: 1,
        moduleKey: 'dashboard',
        label: 'Panel de control',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 2,
        moduleKey: 'weigh-ticket',
        label: 'Ticket de balanza',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: false,
        canStatus: false,
        canExport: true,
      },
      {
        id: 3,
        moduleKey: 'weigh-ticket-reports',
        label: 'Tickets emitidos',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: true,
      },
      {
        id: 4,
        moduleKey: 'users',
        label: 'Usuarios',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 5,
        moduleKey: 'roles',
        label: 'Roles',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 6,
        moduleKey: 'permits',
        label: 'Permisos',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 7,
        moduleKey: 'company',
        label: 'Empresa',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 8,
        moduleKey: 'branches',
        label: 'Sedes',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 9,
        moduleKey: 'carriers',
        label: 'Transportistas',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 10,
        moduleKey: 'profile',
        label: 'Mi perfil',
        canView: true,
        canEdit: true,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
    ],

    // ============ VENDEDOR ============
    3: [
      {
        id: 1,
        moduleKey: 'dashboard',
        label: 'Panel de control',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 2,
        moduleKey: 'weigh-ticket',
        label: 'Ticket de balanza',
        canView: true,
        canEdit: true,
        canCreate: true,
        canDelete: false,
        canStatus: false,
        canExport: true,
      },
      {
        id: 3,
        moduleKey: 'weigh-ticket-reports',
        label: 'Tickets emitidos',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: true,
      },
      {
        id: 4,
        moduleKey: 'users',
        label: 'Usuarios',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 5,
        moduleKey: 'roles',
        label: 'Roles',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 6,
        moduleKey: 'permits',
        label: 'Permisos',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 7,
        moduleKey: 'company',
        label: 'Empresa',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 8,
        moduleKey: 'branches',
        label: 'Sedes',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 9,
        moduleKey: 'carriers',
        label: 'Transportistas',
        canView: true,
        canEdit: true,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 10,
        moduleKey: 'profile',
        label: 'Mi perfil',
        canView: true,
        canEdit: true,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
    ],

    // ============ CLIENTE ============
    4: [
      {
        id: 1,
        moduleKey: 'dashboard',
        label: 'Panel de control',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 2,
        moduleKey: 'weigh-ticket',
        label: 'Ticket de balanza',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 3,
        moduleKey: 'weigh-ticket-reports',
        label: 'Tickets emitidos',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: true,
      },
      {
        id: 4,
        moduleKey: 'users',
        label: 'Usuarios',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 5,
        moduleKey: 'roles',
        label: 'Roles',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 6,
        moduleKey: 'permits',
        label: 'Permisos',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 7,
        moduleKey: 'company',
        label: 'Empresa',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 8,
        moduleKey: 'branches',
        label: 'Sedes',
        canView: true,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 9,
        moduleKey: 'carriers',
        label: 'Transportistas',
        canView: false,
        canEdit: false,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
      {
        id: 10,
        moduleKey: 'profile',
        label: 'Mi perfil',
        canView: true,
        canEdit: true,
        canCreate: false,
        canDelete: false,
        canStatus: false,
        canExport: false,
      },
    ],
  };

  // Matriz actual (según rol)
  rows: ModulePermissionRow[] = [];

  ngOnInit(): void {
    this.loadPermissionsForRole(this.selectedRoleId);
  }

  private cloneRows(rows: ModulePermissionRow[]): ModulePermissionRow[] {
    return rows.map((r) => ({ ...r }));
  }

  private loadPermissionsForRole(roleId: number): void {
    const baseRows =
      this.permissionsByRole[roleId] || this.permissionsByRole[1];
    this.rows = this.cloneRows(baseRows);
  }

  onRoleChange(roleId: number): void {
    this.selectedRoleId = +roleId;
    this.loadPermissionsForRole(this.selectedRoleId);
  }

  // --------- TODOS ----------
  isAllSelected(row: ModulePermissionRow): boolean {
    return (
      row.canView &&
      row.canEdit &&
      row.canCreate &&
      row.canDelete &&
      row.canStatus &&
      row.canExport
    );
  }

  toggleAll(row: ModulePermissionRow): void {
    const newValue = !this.isAllSelected(row);
    row.canView = newValue;
    row.canEdit = newValue;
    row.canCreate = newValue;
    row.canDelete = newValue;
    row.canStatus = newValue;
    row.canExport = newValue;
  }

  // --------- ACCIONES INDIVIDUALES ----------
  toggleAction(row: ModulePermissionRow, action: PermissionActionKey): void {
    row[action] = !row[action];
  }

  // --------- BOTONES SUPERIORES ----------
  reset(): void {
    this.loadPermissionsForRole(this.selectedRoleId);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: 'Permisos restablecidos (demo)',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  }

  save(): void {
    const payload = {
      roleId: this.selectedRoleId,
      permissions: this.rows,
    };
    console.log('Permisos a guardar:', payload);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Permisos guardados (modo demo)',
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
    });
  }
}
