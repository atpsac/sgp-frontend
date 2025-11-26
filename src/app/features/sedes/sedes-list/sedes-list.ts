import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';

interface Sede {
  Codigo: string;
  Nombre: string;
  Direccion: string;
  Telefono: string;
  Correo: string;
  Administrador: string;
  FlagActivo: number; // 1 = Activo, 0 = Inactivo
}

@Component({
  selector: 'app-sedes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './sedes-list.html',
  styleUrl: './sedes-list.scss',
})
export class SedesList implements OnInit {
  // listado completo (desde JSON)
  private allSedes: Sede[] = [];

  // data que se muestra en la tabla (paginada)
  data: Sede[] = [];

  // paginación
  pageSize = 10;
  currentPage = 1;
  pageSizes = [5, 10, 20, 50];
  totalPages = 0;
  totalRecords = 0;

  // estados UI
  isLoading = false;
  downloading = false;

  // filtros
  filters: { Nombre: string; FlagActivo: number | null } = {
    Nombre: '',
    FlagActivo: null,
  };

  private http = inject(HttpClient);

  ngOnInit(): void {
    this.loadFromJson();
  }

  // ================== CARGA DESDE JSON ==================
  private loadFromJson(): void {
    this.isLoading = true;

    this.http
      .get<
        Sede[] | { data: Sede[]; pagination?: { totalRecords?: number; pageSize?: number; totalPages?: number } }
      >('assets/data/sedes.json')
      .subscribe({
        next: (resp) => {
          if (Array.isArray(resp)) {
            this.allSedes = resp;
            this.totalRecords = resp.length;
          } else if (resp && Array.isArray(resp.data)) {
            this.allSedes = resp.data;
            this.totalRecords = resp.pagination?.totalRecords ?? resp.data.length;
          } else {
            this.allSedes = [];
            this.totalRecords = 0;
          }

          this.totalPages =
            this.totalRecords === 0
              ? 0
              : Math.ceil(this.totalRecords / this.pageSize);

          this.currentPage = 1;
          this.applyFilters(); // esto llama a filterAndPaginate
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error cargando assets/data/sedes.json', err);
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar las sedes desde el archivo JSON.',
          });
        },
      });
  }

  // ================== LÓGICA DE LISTADO ==================
  private filterAndPaginate(): void {
    this.isLoading = true;

    const term = this.filters.Nombre.trim().toLowerCase();
    const estado = this.filters.FlagActivo;

    let filtered = [...this.allSedes];

    if (term) {
      filtered = filtered.filter((s) => {
        const haystack = (
          s.Nombre +
          ' ' +
          s.Direccion +
          ' ' +
          s.Telefono +
          ' ' +
          s.Correo +
          ' ' +
          s.Administrador
        ).toLowerCase();
        return haystack.includes(term);
      });
    }

    if (estado === 1 || estado === 0) {
      filtered = filtered.filter((s) => s.FlagActivo === estado);
    }

    this.totalRecords = filtered.length;
    this.totalPages =
      this.totalRecords === 0
        ? 0
        : Math.ceil(this.totalRecords / this.pageSize);

    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.data = filtered.slice(start, end);

    this.isLoading = false;
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  resetFilters(): void {
    this.filters = { Nombre: '', FlagActivo: null };
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  changePageSize(newSize: number): void {
    this.pageSize = +newSize;
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.filterAndPaginate();
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

  // ================== ACCIONES (NUEVO / EDIT / DELETE / ESTADO) ==================

  openCreate(): void {
    Swal.fire({
      icon: 'info',
      title: 'Nueva sede',
      text: 'Aquí podrás abrir el modal para crear una sede (modo demo).',
    });
  }

  openEdit(row: Sede): void {
    Swal.fire({
      icon: 'info',
      title: 'Editar sede',
      text: `Aquí podrás editar la sede: ${row.Nombre} (modo demo).`,
    });
  }

  openDelete(row: Sede): void {
    Swal.fire({
      icon: 'warning',
      title: 'Eliminar sede',
      text: `¿Seguro que deseas eliminar la sede "${row.Nombre}"?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.allSedes = this.allSedes.filter((s) => s.Codigo !== row.Codigo);
        this.filterAndPaginate();
        Swal.fire({
          icon: 'success',
          title: 'Eliminado',
          text: 'La sede se eliminó correctamente (solo en memoria).',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  }

  openStatus(row: Sede): void {
    row.FlagActivo = row.FlagActivo === 1 ? 0 : 1;
  }

  // ================== EXPORT SIMPLE (CSV) ==================
  exportarExcel(): void {

  }
}
