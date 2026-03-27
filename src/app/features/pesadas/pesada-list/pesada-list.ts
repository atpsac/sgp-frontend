import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { TicketBalanzaPdfService } from '../../../core/pdf/ticket-balanza-pdf.service';
import {
  TicketBalanzaReport,
  EstadoTicket,
} from '../../../core/models/ticket-balanza-report.model';

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
    public router: Router,
    private pdf: TicketBalanzaPdfService
  ) {}

  ngOnInit(): void {
    this.loadBuyingStations();
    this.loadScaleTickets();
  }

  /* =========================================================
     CARGA CATÁLOGOS
     ========================================================= */

  private loadBuyingStations(): void {
    this.weighingService.getUserBuyingStations().subscribe({
      next: (rows) => {
        this.sedeOptions = Array.isArray(rows) ? rows : [];
      },
      error: (err) => {
        console.error('Error cargando sedes', err);
        this.sedeOptions = [];
      },
    });
  }

  onBuyingStationChange(): void {
    this.filters.operationId = null;
    this.operacionOptions = [];

    if (!this.filters.buyingStationId) return;

    this.weighingService
      .getOperationsByStation(this.filters.buyingStationId)
      .subscribe({
        next: (rows) => {
          this.operacionOptions = Array.isArray(rows) ? rows : [];
        },
        error: (err) => {
          console.error('Error cargando operaciones por sede', err);
          this.operacionOptions = [];
        },
      });
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

  this.isLoading = true;
  this.actionsOpenTicket = null;

  const query: any = {
    page: this.currentPage,
    pageSize: this.pageSize,
    sortBy: this.sortBy,
    sortDirection: this.sortDirection,
  };

  if (this.filters.buyingStationId != null) {
    query.buyingStationId = this.filters.buyingStationId;
  }

  if (this.filters.operationId != null) {
    query.operationId = this.filters.operationId;
  }

  if (this.filters.ticketId) {
    query.ticketId = Number(this.filters.ticketId);
  }

  const creationDateFrom = this.toApiStartOfDay(this.filters.fechaDesde);
  const creationDateTo = this.toApiEndOfDay(this.filters.fechaHasta);

  if (creationDateFrom) query.creationDateFrom = creationDateFrom;
  if (creationDateTo) query.creationDateTo = creationDateTo;

  this.weighingService.listScaleTickets(query).subscribe({
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

      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error listando tickets de pesada', err);
      this.data = [];
      this.totalRecords = 0;
      this.totalPages = 0;
      this.isLoading = false;
    },
  });
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
    if (this.currentPage > 4) range.push(-1);

    const start = Math.max(2, this.currentPage - 2);
    const end = Math.min(total - 1, this.currentPage + 2);

    for (let i = start; i <= end; i++) range.push(i);

    if (this.currentPage < total - 3) range.push(-2);
    if (!range.includes(total)) range.push(total);

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
    if (isNaN(date.getTime())) return String(value);

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
      this.router.navigateByUrl(`pesadas/editar/${encodeURIComponent(String(row.id))}`);
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
     PDF
     ========================================================= */

  private normalizeEstadoTicket(raw?: string): EstadoTicket | undefined {
    const e = (raw || '').toUpperCase().trim();
    if (!e) return undefined;

    if (e.includes('ABIER')) return 'EN REGISTRO' as EstadoTicket;
    if (e.includes('CERR')) return 'CERRADA' as EstadoTicket;
    if (e.includes('CANCEL') || e.includes('ANUL')) {
      return 'ANULADA' as EstadoTicket;
    }
    if (e.includes('PEND')) return 'EVALUACION' as EstadoTicket;

    return undefined;
  }

  private buildReportFromRow(row: PesadaRow): TicketBalanzaReport {
    return {
      empresa: {
        razonSocial: 'AMAZONAS TRADING PERU S.A.C.',
        ruc: '20521137682',
        direccion: '—',
      },

      ticket: {
        numeroTicket: row.ticketLabel,
        fechaEmision: row.creationDate ?? '',
        sedeOperacion: row.buyingStationName,
        operacion: row.operationName,
        estado: this.normalizeEstadoTicket(row.scaleTicketStatusName),
      },

      origenDestino: {
        sedeOrigen: '—',
        sedeDestino: row.buyingStationName || '—',
      },

      documentos: [],

      transporte: {
        transportista: {
          razonSocial: '—',
          ruc: '—',
        },
        conductor: {
          nombreCompleto: '—',
          tipoDocumento: '—',
          numeroDocumento: '—',
          licencia: '—',
        },
        vehiculo: {
          placa: '—',
          trailer: '—',
        },
      },

      resumen: {
        cantidadItems: 1,
        totalPesoBrutoKg: Number(row.grossWeight ?? 0),
        totalTaraKg: Number(row.tareWeight ?? 0),
        subtotalPesoNetoKg: Number(row.netWeight ?? 0),
        ajusteKg: 0,
        totalPesoNetoKg: Number(row.netWeight ?? 0),
      },

      pesadas: [
        {
          item: 1,
          producto: '—',
          balanza: '—',
          pesoBrutoKg: Number(row.grossWeight ?? 0),
          taraKg: Number(row.tareWeight ?? 0),
          pesoNetoKg: Number(row.netWeight ?? 0),
          estado: row.scaleTicketStatusName || undefined,
          taras: [],
        },
      ],
    };
  }

  generarPdf(row: PesadaRow): void {
    if (this.downloading) return;
    this.downloading = true;

    try {
      const report = this.buildReportFromRow(row);
      const blob = this.pdf.generate(report);
      this.pdf.download(blob, `TICKET_${row.ticketLabel}.pdf`);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `PDF generado: ${row.ticketLabel}`,
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e?.message || 'No se pudo generar el PDF.',
      });
    } finally {
      this.downloading = false;
    }
  }

  crear(): void {
    this.router.navigateByUrl('pesadas/nuevo');
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  private toNumber(value: any): number {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
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
}