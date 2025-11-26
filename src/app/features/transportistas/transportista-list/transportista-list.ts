import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';

import { TransportistaForm } from '../transportista-form/transportista-form';
import { TransportistaDelete } from '../transportista-delete/transportista-delete';
import { TransportistaStatus } from '../transportista-status/transportista-status';

export interface Transportista {
  TransportistaId: number;
  TipoDocumento: string;      // RUC, DNI, etc.
  NumeroDocumento: string;
  RazonSocial: string;
  Telefono: string;
  Correo: string;
  FlagActivo: 0 | 1;
  FechaCreacion?: string;
}

interface TransportistasResponse {
  data: Transportista[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
}

@Component({
  selector: 'app-transportista-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transportista-list.html',
  styleUrl: './transportista-list.scss',
})
export class TransportistaList implements OnInit {
  // Datos que se muestran en la tabla
  data: Transportista[] = [];

  // Datos completos en memoria
  private allTransportistas: Transportista[] = [];

  // paginación
  pageSize = 10;
  currentPage = 1;
  pageSizes = [5, 10, 20, 50];
  totalPages = 0;
  totalRecords = 0;

  // estados de UI
  isLoading = false;
  downloading = false;

  // filtros (search busca por RUC, razón social, teléfono o correo)
  filters: { search: string; FlagActivo: number | null } = {
    search: '',
    FlagActivo: null,
  };

  private readonly JSON_URL = 'assets/data/transportistas.json';

  private http = inject(HttpClient);

  constructor(
    private modalService: NgbModal,
    private router: Router
  ) {
    // Si quisieras abrir el modal de creación al entrar con /create:
    // if (this.router.url.endsWith('/create')) this.openCreate();
  }

  ngOnInit(): void {
    this.loadFromJson();
  }

  /** Cargar transportistas desde assets/data/transportistas.json */
  private loadFromJson(): void {
    this.isLoading = true;

    this.http.get<TransportistasResponse>(this.JSON_URL).subscribe({
      next: (resp) => {
        this.allTransportistas = resp?.data ?? [];
        // Si quieres respetar la paginación del JSON:
        this.totalRecords = resp?.pagination?.totalRecords ?? this.allTransportistas.length;
        this.totalPages =
          resp?.pagination?.totalPages ??
          (this.totalRecords > 0 ? Math.ceil(this.totalRecords / this.pageSize) : 0);
        this.currentPage = resp?.pagination?.currentPage ?? 1;

        // Recalcular listado con filtros/paginación en memoria
        this.fetchTransportistas();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.allTransportistas = [];
        this.data = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el archivo transportistas.json.',
        });
      },
    });
  }

  // 🔹 Filtro + paginación en memoria
  fetchTransportistas(): void {
    this.isLoading = true;

    const { search, FlagActivo } = this.filters;
    const searchLower = (search || '').toLowerCase().trim();

    // 1) Filtro base
    let filtered = this.allTransportistas.filter((t) => {
      const haystack =
        (t.TipoDocumento +
          ' ' +
          t.NumeroDocumento +
          ' ' +
          t.RazonSocial +
          ' ' +
          t.Telefono +
          ' ' +
          t.Correo).toLowerCase();

      const matchesSearch = !searchLower || haystack.includes(searchLower);

      const matchesStatus =
        FlagActivo === null || t.FlagActivo === FlagActivo;

      return matchesSearch && matchesStatus;
    });

    // 2) Actualizamos totales
    this.totalRecords = filtered.length;
    this.totalPages =
      this.totalRecords > 0
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
    this.fetchTransportistas();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchTransportistas();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.fetchTransportistas();
  }

  resetFilters(): void {
    this.filters = { search: '', FlagActivo: null };
    this.currentPage = 1;
    this.fetchTransportistas();
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
    return this.totalRecords === 0
      ? 0
      : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  // --- Modales ---
  openCreate(): void {
    const modalRef = this.modalService.open(TransportistaForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    modalRef.result.then(
      () => this.fetchTransportistas(),
      () => {}
    );
  }

  openEdit(row: Transportista): void {
    const modalRef = this.modalService.open(TransportistaForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    (modalRef.componentInstance as any).data = row;
    modalRef.result.then(
      () => this.fetchTransportistas(),
      () => {}
    );
  }

  openDelete(row: Transportista): void {
    const modalRef = this.modalService.open(TransportistaDelete, {
      size: 'md',
      centered: true,
      backdrop: 'static',
    });
    (modalRef.componentInstance as any).data = row;
    modalRef.result.then(
      () => this.fetchTransportistas(),
      () => {}
    );
  }

  openStatus(row: Transportista): void {
    const modalRef = this.modalService.open(TransportistaStatus, {
      size: 'md',
      centered: true,
      backdrop: 'static',
    });
    (modalRef.componentInstance as any).data = row; // {TransportistaId, ..., FlagActivo}
    modalRef.result.then(
      () => this.fetchTransportistas(),
      () => {}
    );
  }

  // --- Export (demo) ---
  exportarExcel(): void {
    // Aquí luego puedes implementar la exportación real.
  }
}
