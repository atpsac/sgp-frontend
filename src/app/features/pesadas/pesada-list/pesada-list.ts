import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

interface Pesada {
  NumeroTicket: string;
  SedeOperacion: string;
  Fecha: string;           // ISO string o '2025-10-01 09:24'
  Operacion: string;
  PesoBruto: number;
  PesoTara: number;
  PorcentajeMerma: number;
  PesoNeto: number;
  Estado: string;          // EN REGISTRO, CERRADA, ANULADA, etc.
  FlagActivo: number;      // 1 = Activo, 0 = Inactivo
}

@Component({
  selector: 'app-pesada-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pesada-list.html',
  styleUrl: './pesada-list.scss',
})
export class PesadaList implements OnInit {
  // listado que se muestra
  data: Pesada[] = [];

  // listado completo desde el JSON
  private allPesadas: Pesada[] = [];

  // filtros
  filters: {
    search: string;      // buscador principal
    sede: string;
    operacion: string;
    fechaDesde: string | null;
    fechaHasta: string | null;
    numero: string;      // número de ticket exacto/parcial
  } = {
    search: '',
    sede: 'ALL',
    operacion: 'ALL',
    fechaDesde: null,
    fechaHasta: null,
    numero: '',
  };

  // opciones para selects
  sedeOptions: string[] = [];
  operacionOptions: string[] = [];

  // paginación
  pageSize = 10;
  currentPage = 1;
  pageSizes = [10, 25, 50, 100];
  totalPages = 0;
  totalRecords = 0;

  // estados UI
  isLoading = false;
  downloading = false;
  showAdvancedFilters = false;

  // menú de acciones por fila
  actionsOpenTicket: string | null = null;

  constructor(private http: HttpClient, public router: Router) {}

  ngOnInit(): void {
    this.loadDataFromJson();
  }

  // ================== CARGA DATA ==================
  private loadDataFromJson(): void {
    this.isLoading = true;

    this.http.get<any>('assets/data/pesadas.json').subscribe({
      next: (resp) => {
        this.allPesadas = resp?.data ?? [];
        this.buildFilterOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando pesada.json', err);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la lista de pesadas.',
        });
      },
    });
  }

  private buildFilterOptions(): void {
    const sedes = new Set<string>();
    const ops = new Set<string>();

    this.allPesadas.forEach((p) => {
      if (p.SedeOperacion) sedes.add(p.SedeOperacion);
      if (p.Operacion) ops.add(p.Operacion);
    });

    this.sedeOptions = Array.from(sedes).sort();
    this.operacionOptions = Array.from(ops).sort();
  }

  // ================== FILTROS + PAGINACIÓN ==================

  applyFilters(): void {
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      sede: 'ALL',
      operacion: 'ALL',
      fechaDesde: null,
      fechaHasta: null,
      numero: '',
    };
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  private filterAndPaginate(): void {
    this.isLoading = true;

    const search = (this.filters.search || '').toLowerCase().trim();
    const sede = this.filters.sede;
    const operacion = this.filters.operacion;
    const numero = (this.filters.numero || '').toLowerCase().trim();
    const fechaDesde = this.filters.fechaDesde
      ? new Date(this.filters.fechaDesde)
      : null;
    const fechaHasta = this.filters.fechaHasta
      ? new Date(this.filters.fechaHasta)
      : null;

    let filtered = [...this.allPesadas];

    // Buscador principal (ticket + sede + operación)
    if (search) {
      filtered = filtered.filter((p) => {
        const haystack = (
          p.NumeroTicket +
          ' ' +
          p.SedeOperacion +
          ' ' +
          p.Operacion
        )
          .toLowerCase()
          .trim();
        return haystack.includes(search);
      });
    }

    // Filtro por sede
    if (sede !== 'ALL') {
      filtered = filtered.filter((p) => p.SedeOperacion === sede);
    }

    // Filtro por operación
    if (operacion !== 'ALL') {
      filtered = filtered.filter((p) => p.Operacion === operacion);
    }

    // Filtro por número de ticket
    if (numero) {
      filtered = filtered.filter((p) =>
        p.NumeroTicket.toLowerCase().includes(numero)
      );
    }

    // Filtro por rango de fechas
    if (fechaDesde) {
      filtered = filtered.filter((p) => {
        const f = new Date(p.Fecha);
        return f >= fechaDesde;
      });
    }
    if (fechaHasta) {
      filtered = filtered.filter((p) => {
        const f = new Date(p.Fecha);
        return f <= fechaHasta;
      });
    }

    // Totales
    this.totalRecords = filtered.length;
    this.totalPages =
      this.totalRecords === 0
        ? 0
        : Math.ceil(this.totalRecords / this.pageSize);

    // Ajustar página actual
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    // Slice de paginación
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.data = filtered.slice(start, end);

    this.isLoading = false;
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

  // ================== HEADER / FILTROS AVANZADOS ==================

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  // ================== BADGES ==================

  getEstadoClass(estado: string): string {
    const e = (estado || '').toUpperCase();

    if (e.includes('REGISTRO')) return 'ux-status--registro';
    if (e.includes('EVALUAC')) return 'ux-status--evaluacion';
    if (e.includes('CERRAD')) return 'ux-status--cerrado';
    if (e.includes('ANULAD')) return 'ux-status--anulado';

    return 'ux-status--otro';
  }

  // ================== ACCIONES ==================

  toggleActions(row: Pesada): void {
    this.actionsOpenTicket =
      this.actionsOpenTicket === row.NumeroTicket ? null : row.NumeroTicket;
  }

  onAction(action: 'continuar' | 'generar' | 'duplicar' | 'cancelar', row: Pesada) {
    this.actionsOpenTicket = null;

    let text = '';
    switch (action) {
      case 'continuar':
        text = `Continuar edición del ticket ${row.NumeroTicket}.`;
        break;
      case 'generar':
        text = `Generar ticket final para ${row.NumeroTicket}.`;
        break;
      case 'duplicar':
        text = `Duplicar datos de la pesada ${row.NumeroTicket}.`;
        break;
      case 'cancelar':
        text = `Cancelar la pesada ${row.NumeroTicket}.`;
        break;
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: text,
      showConfirmButton: false,
      timer: 2200,
    });
  }

  // ================== EXPORT (placeholder) ==================

  exportarExcel(): void {
    this.downloading = true;
    setTimeout(() => {
      this.downloading = false;
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Exportación generada.',
        showConfirmButton: false,
        timer: 1800,
      });
    }, 900);
  }



  crear(){
    this.router.navigateByUrl('pesadas/nuevo')
  }


}
