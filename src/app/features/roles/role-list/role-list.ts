import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { Roles, Role } from '../services/roles';
import { RoleForm } from '../role-form/role-form';
import { RoleDelete } from '../role-delete/role-delete';
import { RoleStatus } from '../role-status/role-status';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-list.html',
  styleUrl: './role-list.scss',
})
export class RoleList implements OnInit {
  // Datos que se muestran en la tabla
  data: Role[] = [];

  // Datos completos en memoria (mock sin API)
  private allRoles: Role[] = [];

  // paginación
  pageSize = 10;
  currentPage = 1;
  pageSizes = [5, 10, 20, 50];
  totalPages = 0;
  totalRecords = 0;

  // estados de UI
  isLoading = false;     // carga de la tabla
  downloading = false;   // export excel

  // filtros (search busca por Código o Nombre)
  filters: { search: string; FlagActivo: number | null } = {
    search: '',
    FlagActivo: null,
  };

  // 🔹 Respuesta MOCK para modo pruebas (simula lo que devuelve tu API)
  private mockResponse = {
    data: [
      // {
      //   RolId: 1,
      //   Codigo: 'CLIENTE',
      //   Nombre: 'Cliente',
      //   FlagActivo: 1,
      //   FechaCreacion: '2025-11-05 03:57:27',
      // },
      {
        RolId: 2,
        Codigo: 'OPERADOR',
        Nombre: 'Operador de pesada',
        FlagActivo: 1,
        FechaCreacion: '2025-11-05 03:57:27',
      },
      {
        RolId: 3,
        Codigo: 'ADMIN',
        Nombre: 'Administrador',
        FlagActivo: 1,
        FechaCreacion: '2025-11-05 03:57:27',
      },
      {
        RolId: 4,
        Codigo: 'SUPER',
        Nombre: 'Super administrador',
        FlagActivo: 1,
        FechaCreacion: '2025-11-05 03:57:27',
      },
    ] as Role[],
    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalPages: 1,
      totalRecords: 3,
    },
  };

  constructor(
    private modalService: NgbModal,
    private router: Router,
    public rolesService: Roles // lo dejo inyectado por si luego vuelves a la API
  ) {
    // Soporte para abrir modal al entrar con /create
    const currentUrl = this.router.url;
    if (currentUrl.endsWith('/create')) this.openCreate();
  }

  ngOnInit(): void {
    // Inicializamos datos locales desde el mock
    this.allRoles = [...this.mockResponse.data];
    this.totalRecords = this.mockResponse.pagination.totalRecords;
    this.totalPages = this.mockResponse.pagination.totalPages;
    this.fetchRoles(); // pinta la tabla con filtros/paginación sobre el mock
  }

  // 🔹 Ahora fetchRoles trabaja SOLO con el array local (sin API)
  fetchRoles(): void {
    this.isLoading = true;

    // simulamos una pequeña lógica de filtro + paginación en memoria
    const { search, FlagActivo } = this.filters;
    const searchLower = (search || '').toLowerCase().trim();

    // 1) Filtro base
    let filtered = this.allRoles.filter((role) => {
      const matchesSearch =
        !searchLower ||
        role.Codigo.toLowerCase().includes(searchLower) ||
        role.Nombre.toLowerCase().includes(searchLower);

      const matchesStatus =
        FlagActivo === null || role.FlagActivo === FlagActivo;

      return matchesSearch && matchesStatus;
    });

    // 2) Actualizamos totales
    this.totalRecords = filtered.length;
    this.totalPages = this.totalRecords > 0
      ? Math.ceil(this.totalRecords / this.pageSize)
      : 0;

    // Ajustar currentPage si se pasa del rango
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // 3) Paginación en memoria
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.data = filtered.slice(startIndex, endIndex);

    this.isLoading = false;
  }

  changePageSize(newSize: number): void {
    this.pageSize = +newSize;
    this.currentPage = 1;
    this.fetchRoles();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchRoles();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchRoles();
  }

  resetFilters(): void {
    this.filters = { search: '', FlagActivo: null };
    this.currentPage = 1;
    this.fetchRoles();
  }

  getPageRange(): number[] {
    const range: number[] = [];
    const rangeSize = 5;
    const total = this.totalPages;

    if (total <= rangeSize) {
      for (let i = 1; i <= total; i++) range.push(i);
    } else {
      range.push(1);
      if (this.currentPage > 4) range.push(-1); // …
      const start = Math.max(2, this.currentPage - 2);
      const end = Math.min(total - 1, this.currentPage + 2);
      for (let i = start; i <= end; i++) range.push(i);
      if (this.currentPage < total - 3) range.push(-2); // …
      if (!range.includes(total)) range.push(total);
    }
    return range;
  }

  get startRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }
  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  // --- Modales ---
  openCreate() {
    const modalRef = this.modalService.open(RoleForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    modalRef.result.then(
      () => this.fetchRoles(),
      () => {}
    );
  }

  openEdit(row: Role) {
    const modalRef = this.modalService.open(RoleForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    (modalRef.componentInstance as any).data = row;
    modalRef.result.then(
      () => this.fetchRoles(),
      () => {}
    );
  }

  openDelete(row: Role) {
    const modalRef = this.modalService.open(RoleDelete, {
      size: 'md',
      centered: true,
      backdrop: 'static',
    });
    (modalRef.componentInstance as any).data = row;
    modalRef.result.then(
      () => this.fetchRoles(),
      () => {}
    );
  }

  openStatus(row: Role) {
    const modalRef = this.modalService.open(RoleStatus, {
      size: 'md',
      centered: true,
      backdrop: 'static',
    });
    (modalRef.componentInstance as any).data = row; // {RolId, Codigo, Nombre, FlagActivo}
    modalRef.result.then(
      () => this.fetchRoles(),
      () => {}
    );
  }

  // --- Export ---
  exportarExcel() {
   
  }
}
