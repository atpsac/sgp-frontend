import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  WeighingService,
  BuyingStation,
  OperationStation,
} from '../../../core/services/weighing.service';

type TicketActionCode = 'PRT' | 'EDT' | 'CAN';
type SortDirection = 'asc' | 'desc';

interface PesadaRow {
  id: number;
  ticketLabel: string;
  creationDate: string | null;
  isActive: boolean;
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  buyingStationName: string;
  operationName: string;
  scaleTicketStatusName: string;
  actions: TicketActionCode[];
  raw?: any;
}

@Component({
  selector: 'app-pesada-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pesada-list.html',
  styleUrl: './pesada-list.scss',
})
export class PesadaList implements OnInit {
  data: PesadaRow[] = [];

  filters: {
    buyingStationId: number | null;
    operationId: number | null;
    ticketId: string;
    fechaDesde: string | null;
    fechaHasta: string | null;
  } = {
    buyingStationId: null,
    operationId: null,
    ticketId: '',
    fechaDesde: null,
    fechaHasta: null,
  };

  sedeOptions: BuyingStation[] = [];
  operacionOptions: OperationStation[] = [];

  pageSize = 10;
  currentPage = 1;
  pageSizes = [10, 25, 50, 100];
  totalPages = 0;
  totalRecords = 0;

  isLoading = false;
  downloading = false;

  sortBy = 'id';
  sortDirection: SortDirection = 'desc';

  actionsOpenTicket: number | null = null;

  constructor(
    private weighingService: WeighingService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loadBuyingStations();
  }

  /* =========================================================
     CARGA CATÁLOGOS
     ========================================================= */

  private loadBuyingStations(): void {
    this.isLoading = true;

    this.weighingService.getUserBuyingStations().subscribe({
      next: (rows) => {
        this.sedeOptions = Array.isArray(rows) ? rows : [];

        if (!this.sedeOptions.length) {
          this.filters.buyingStationId = null;
          this.filters.operationId = null;
          this.operacionOptions = [];
          this.resetGrid();
          this.isLoading = false;
          return;
        }

        this.filters.buyingStationId = Number(this.sedeOptions[0].id);
        this.loadOperationsByStation(this.filters.buyingStationId, true);
      },
      error: (err) => {
        console.error('Error cargando sedes', err);
        this.sedeOptions = [];
        this.operacionOptions = [];
        this.filters.buyingStationId = null;
        this.filters.operationId = null;
        this.resetGrid();
        this.isLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar las sedes.',
        });
      },
    });
  }

  onBuyingStationChange(): void {
    const stationId = Number(this.filters.buyingStationId || 0);

    this.filters.operationId = null;
    this.operacionOptions = [];
    this.currentPage = 1;

    if (!stationId) {
      this.resetGrid();
      return;
    }

    this.loadOperationsByStation(stationId, true);
  }

  private loadOperationsByStation(
    stationId: number,
    autoLoadTickets: boolean = true
  ): void {
    this.isLoading = true;

    this.weighingService.getOperationsByStation(stationId).subscribe({
      next: (rows) => {
        this.operacionOptions = Array.isArray(rows) ? rows : [];

        if (!this.operacionOptions.length) {
          this.filters.operationId = null;
          this.resetGrid();
          this.isLoading = false;
          return;
        }

        this.filters.operationId = Number(this.operacionOptions[0].id);

        if (autoLoadTickets) {
          this.loadScaleTickets();
        } else {
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error cargando operaciones por sede', err);
        this.operacionOptions = [];
        this.filters.operationId = null;
        this.resetGrid();
        this.isLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar las operaciones de la sede seleccionada.',
        });
      },
    });
  }

  onOperationChange(): void {
    this.currentPage = 1;
    this.loadScaleTickets();
  }

  onTicketIdInput(value: string): void {
    this.filters.ticketId = this.normalizeNumericString(value);
  }

  /* =========================================================
     LISTADO PRINCIPAL
     ========================================================= */

  applyFilters(): void {
    if (!this.validateDateRange()) return;
    this.currentPage = 1;
    this.loadScaleTickets();
  }

  private loadScaleTickets(): void {
    if (!this.validateDateRange()) return;

    const buyingStationId = Number(this.filters.buyingStationId || 0);
    const operationId = Number(this.filters.operationId || 0);

    if (!buyingStationId || !operationId) {
      this.resetGrid();
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.actionsOpenTicket = null;

    const query: any = {
      buyingStationId,
      operationId,
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
    };

    if (this.filters.ticketId) {
      query.ticketId = Number(this.filters.ticketId);
    }

    const creationDateFrom = this.toApiStartOfDay(this.filters.fechaDesde);
    const creationDateTo = this.toApiEndOfDay(this.filters.fechaHasta);

    if (creationDateFrom) query.creationDateFrom = creationDateFrom;
    if (creationDateTo) query.creationDateTo = creationDateTo;

    this.weighingService
      .listScaleTickets(query)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const items = Array.isArray(resp?.items) ? resp.items : [];

          this.data = items.map((item: any) => this.mapRow(item));
          this.totalRecords = Number(resp?.total ?? 0);
          this.currentPage = Number(resp?.page ?? this.currentPage);
          this.pageSize = Number(resp?.pageSize ?? this.pageSize);
          this.totalPages =
            this.totalRecords > 0
              ? Math.ceil(this.totalRecords / this.pageSize)
              : 0;

          if (this.totalPages > 0 && this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
          }
        },
        error: (err) => {
          console.error('Error listando tickets de pesada', err);
          this.resetGrid();

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la lista de tickets de pesada.',
          });
        },
      });
  }

  private resetGrid(): void {
    this.data = [];
    this.totalRecords = 0;
    this.totalPages = 0;
    this.currentPage = 1;
  }

  private mapRow(item: any): PesadaRow {
    const id = Number(item?.id ?? 0);

    return {
      id,
      ticketLabel: `TKP-${String(id).padStart(6, '0')}`,
      creationDate: item?.creationDate ?? null,
      isActive: Boolean(item?.isActive),
      grossWeight: this.toNumber(item?.grossWeight),
      tareWeight: this.toNumber(item?.tareWeight),
      netWeight: this.toNumber(item?.netWeight),
      buyingStationName: String(
        item?.buyingStationName ?? item?.buyingStation?.name ?? '—'
      ),
      operationName: String(
        item?.operationName ?? item?.operation?.name ?? '—'
      ),
      scaleTicketStatusName: String(
        item?.scaleTicketStatusName ?? item?.status?.name ?? '—'
      ),
      actions: this.normalizeActions(item?.actions),
      raw: item,
    };
  }

  private normalizeActions(actions: any): TicketActionCode[] {
    const valid: TicketActionCode[] = ['PRT', 'EDT', 'CAN'];

    if (!Array.isArray(actions)) return [];

    return actions
      .map((a) => String(a || '').trim().toUpperCase())
      .filter((a): a is TicketActionCode =>
        valid.includes(a as TicketActionCode)
      );
  }

  hasAction(row: PesadaRow, code: TicketActionCode): boolean {
    return row.actions.includes(code);
  }

  /* =========================================================
     PAGINACIÓN / ORDEN
     ========================================================= */

  changePageSize(newSize: number): void {
    this.pageSize = Number(newSize);
    this.currentPage = 1;
    this.loadScaleTickets();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadScaleTickets();
  }

  onSortDirectionChange(): void {
    this.currentPage = 1;
    this.loadScaleTickets();
  }

  getPageRange(): number[] {
    const range: number[] = [];
    const rangeSize = 5;
    const total = this.totalPages;

    if (total <= rangeSize) {
      for (let i = 1; i <= total; i++) range.push(i);
      return range;
    }

    range.push(1);

    if (this.currentPage > 4) {
      range.push(-1);
    }

    const start = Math.max(2, this.currentPage - 2);
    const end = Math.min(total - 1, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    if (this.currentPage < total - 3) {
      range.push(-2);
    }

    if (!range.includes(total)) {
      range.push(total);
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

  /* =========================================================
     FECHAS
     ========================================================= */

  private validateDateRange(): boolean {
    const { fechaDesde, fechaHasta } = this.filters;

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      Swal.fire({
        icon: 'warning',
        title: 'Rango inválido',
        text: 'La fecha desde no puede ser mayor que la fecha hasta.',
      });
      return false;
    }

    return true;
  }

  private toApiStartOfDay(value: string | null): string | undefined {
    if (!value) return undefined;

    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;

    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0)).toISOString();
  }

  private toApiEndOfDay(value: string | null): string | undefined {
    if (!value) return undefined;

    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return undefined;

    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';

    const match = String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/
    );

    if (match) {
      const [, y, m, d, hh = '00', mm = '00'] = match;
      return `${d}/${m}/${y} ${hh}:${mm}`;
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return String(value);
    }

    const dd = String(date.getDate()).padStart(2, '0');
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const yy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');

    return `${dd}/${mo}/${yy} ${hh}:${mi}`;
  }

  /* =========================================================
     BADGES
     ========================================================= */

  getEstadoClass(estado: string): string {
    const e = (estado || '').toUpperCase();

    if (e.includes('ABIER')) return 'ux-status--registro';
    if (e.includes('CERR')) return 'ux-status--cerrado';
    if (e.includes('CANCEL') || e.includes('ANUL')) return 'ux-status--anulado';
    if (e.includes('PEND')) return 'ux-status--evaluacion';

    return 'ux-status--otro';
  }

  /* =========================================================
     ACCIONES
     ========================================================= */

  toggleActions(row: PesadaRow, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();

    if (!row.actions?.length) return;

    this.actionsOpenTicket =
      this.actionsOpenTicket === row.id ? null : row.id;
  }

  onAction(action: TicketActionCode, row: PesadaRow, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();
    this.actionsOpenTicket = null;

    if (action === 'PRT') {
      this.generarPdf(row);
      return;
    }

    if (action === 'EDT') {
      this.router.navigateByUrl(
        `pesadas/editar/${encodeURIComponent(String(row.id))}`
      );
      return;
    }

    if (action === 'CAN') {
      this.cancelarTicket(row);
    }
  }

  private cancelarTicket(row: PesadaRow): void {
    Swal.fire({
      icon: 'warning',
      title: 'Cancelar ticket',
      text: `El ticket ${row.ticketLabel} está marcado con acción CAN, pero aún debes enlazar aquí el endpoint real de cancelación.`,
      confirmButtonText: 'Entendido',
    });
  }

  /* =========================================================
     PDF REAL DESDE API
     ========================================================= */

  generarPdf(row: PesadaRow): void {
    if (this.downloading || !row?.id) return;

    this.downloading = true;
    this.actionsOpenTicket = null;

    this.weighingService
      .getScaleTicketPdf(row.id)
      .pipe(finalize(() => (this.downloading = false)))
      .subscribe({
        next: (blob: Blob) => {
          if (!(blob instanceof Blob) || blob.size === 0) {
            Swal.fire({
              icon: 'warning',
              title: 'Sin archivo',
              text: 'El servicio no devolvió un PDF válido.',
            });
            return;
          }

          const fileName = `TICKET_${row.ticketLabel}.pdf`;
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');

          link.href = url;
          link.download = fileName;
          link.target = '_blank';

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `PDF descargado: ${row.ticketLabel}`,
            showConfirmButton: false,
            timer: 1500,
          });
        },
        error: (err) => {
          console.error('Error descargando PDF del ticket', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo descargar el PDF del ticket.',
          });
        },
      });
  }

  crear(): void {
    this.router.navigateByUrl('pesadas/nuevo');
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  private toNumber(value: any): number {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }

  private normalizeNumericString(value: any): string {
    const onlyDigits = String(value ?? '').replace(/\D+/g, '');
    if (!onlyDigits) return '';
    return onlyDigits.replace(/^0+(?=\d)/, '');
  }

  trackByRow(_: number, row: PesadaRow): number {
    return row.id;
  }

  /* =========================================================
     CLOSE MENU
     ========================================================= */

  @HostListener('document:click')
  onDocClick(): void {
    this.actionsOpenTicket = null;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.actionsOpenTicket = null;
  }

  verDetalle(row: PesadaRow): void {
    this.router.navigateByUrl(
      `pesadas/${encodeURIComponent(String(row.id))}/editar`
    );
  }
}