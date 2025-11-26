import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { Users, User } from '../services/users';
import { Roles } from '../../roles/services/roles';

import { UserForm } from '../user-form/user-form';
import { UserDelete } from '../user-delete/user-delete';
import { UserStatus } from '../user-status/user-status';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, HttpClientModule],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList implements OnInit {
  // Datos que se muestran en la tabla
  data: User[] = [];

  // Datos completos en memoria (mock desde JSON)
  private allUsers: User[] = [];
  private usersLoaded = false;

  // Paginación
  pageSize = 10;
  currentPage = 1;
  pageSizes = [5, 10, 20, 50];
  totalPages = 0;
  totalRecords = 0;

  // Estados de UI
  isLoading = false;
  downloading = false;

  // Filtros (search por nombre, correo, doc, rol, etc.)
  filters: { search: string; RolId: number | null } = {
    search: '',
    RolId: null,
  };

  // Opciones de rol para el filtro
  roleOptions: { RolId: number; Nombre: string }[] = [];
  loadingRoles = false;

  // 🔹 MOCK de roles (si quieres luego también lo pasamos a assets/data/roles.json)
  private mockRolesResponse = {
    data: [
      {
        RolId: 2,
        Codigo: 'OPERADOR DE PESADA',
        Nombre: 'OPERADOR DE PESADA',
        FlagActivo: 1,
        FechaCreacion: '2025-11-05 03:57:27',
      },
      {
        RolId: 3,
        Codigo: 'ADMIN',
        Nombre: 'ADMINISTRADOR',
        FlagActivo: 1,
        FechaCreacion: '2025-11-05 03:57:27',
      },
    ],
    pagination: {
      currentPage: 1,
      pageSize: 1000,
      totalPages: 1,
      totalRecords: 3,
    },
  };

  constructor(
    private modalService: NgbModal,
    private router: Router,
    private http: HttpClient,
    // Se quedan inyectados para cuando conectes backend real
    public usersService: Users,
    public rolesService: Roles
  ) {
    if (this.router.url.endsWith('/create')) this.openCreate();
  }

  ngOnInit(): void {
    this.fetchRolesOptions();   // mock roles
    this.loadUsersFromJson();   // usuarios desde assets/data/users.json
  }

  // ========================
  //   CARGA DESDE JSON
  // ========================
  private loadUsersFromJson(): void {
    this.isLoading = true;

    this.http
      .get<{
        data: User[];
        pagination?: { currentPage?: number; pageSize?: number; totalPages?: number; totalRecords?: number };
      }>('assets/data/users.json')
      .subscribe({
        next: (resp) => {
          this.allUsers = resp?.data ?? [];
          this.usersLoaded = true;

          const total = resp?.pagination?.totalRecords ?? this.allUsers.length;
          this.totalRecords = total;
          this.totalPages =
            resp?.pagination?.totalPages ??
            (total > 0 ? Math.ceil(total / this.pageSize) : 0);

          this.isLoading = false;
          // Pintamos la tabla por primera vez
          this.fetchUsers();
        },
        error: (err) => {
          console.error('Error cargando assets/data/users.json', err);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los usuarios desde el JSON.',
          });
        },
      });
  }

  // ========================
  //   ROLES (MOCK LOCAL)
  // ========================
  fetchRolesOptions(): void {
    this.loadingRoles = true;
    const rows = this.mockRolesResponse.data ?? [];
    this.roleOptions = rows.map((r: any) => ({
      RolId: r.RolId,
      Nombre: r.Nombre,
    }));
    this.loadingRoles = false;
  }

  // ========================
  //   LISTADO + FILTROS
  // ========================
  fetchUsers(): void {
    if (!this.usersLoaded) {
      // Aún no se cargó el JSON
      return;
    }

    this.isLoading = true;

    const { search, RolId } = this.filters;
    const searchLower = (search || '').toLowerCase().trim();

    let filtered = this.allUsers.filter((u: any) => {
      const fullName = `${u.Nombres || ''} ${u.Apellidos || ''}`.toLowerCase();
      const constmatchesSearch =
        !searchLower ||
        (u.NumeroDocumento || '').toLowerCase().includes(searchLower) ||
        (u.Correo || '').toLowerCase().includes(searchLower) ||
        (u.Telefono || '').toLowerCase().includes(searchLower) ||
        fullName.includes(searchLower) ||
        (u.RolNombre || '').toLowerCase().includes(searchLower);

      const matchesRol = RolId === null || u.RolId === RolId;

      return constmatchesSearch && matchesRol;
    });

    // Actualizamos totales
    this.totalRecords = filtered.length;
    this.totalPages =
      this.totalRecords > 0
        ? Math.ceil(this.totalRecords / this.pageSize)
        : 0;

    // Ajustar currentPage si se sale de rango
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Paginación en memoria
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.data = filtered.slice(startIndex, endIndex);

    this.isLoading = false;
  }

  changePageSize(newSize: number): void {
    this.pageSize = +newSize;
    this.currentPage = 1;
    this.fetchUsers();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchUsers();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchUsers();
  }

  resetFilters(): void {
    this.filters = { search: '', RolId: null };
    this.currentPage = 1;
    this.fetchUsers();
  }

  getPageRange(): number[] {
    const range: number[] = [];
    const rangeSize = 5;
    const total = this.totalPages;

    if (total <= rangeSize) {
      for (let i = 1; i <= total; i++) range.push(i);
    } else {
      range.push(1);
      if (this.currentPage > 4) range.push(-1);
      const start = Math.max(2, this.currentPage - 2);
      const end = Math.min(total - 1, this.currentPage + 2);
      for (let i = start; i <= end; i++) range.push(i);
      if (this.currentPage < total - 3) range.push(-2);
      if (!range.includes(total)) range.push(total);
    }
    return range;
  }

  get startRecord(): number {
    return this.totalRecords === 0
      ? 0
      : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  // ========================
  //   MODALES
  // ========================
  openCreate() {
    const ref = this.modalService.open(UserForm, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });
    ref.result.then(
      () => this.fetchUsers(),
      () => {}
    );
  }

  openEdit(row: any) {
    const ref = this.modalService.open(UserForm, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });
    (ref.componentInstance as any).data = row;
    ref.result.then(
      () => this.fetchUsers(),
      () => {}
    );
  }

  openDelete(row: any) {
    const ref = this.modalService.open(UserDelete, {
      size: 'md',
      centered: true,
      backdrop: 'static',
    });
    (ref.componentInstance as any).data = row;
    ref.result.then(
      () => this.fetchUsers(),
      () => {}
    );
  }

  openStatus(row: any) {
    const ref = this.modalService.open(UserStatus, {
      size: 'md',
      centered: true,
      backdrop: 'static',
    });
    (ref.componentInstance as any).data = row;
    ref.result.then(
      () => this.fetchUsers(),
      () => {}
    );
  }


  exportarExcel() {

  }
}
