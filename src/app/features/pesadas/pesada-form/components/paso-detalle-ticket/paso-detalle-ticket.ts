import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { take } from 'rxjs';
import Swal from 'sweetalert2';

import { PesadaDetalle, TaraItem } from '../../pesada-form';
import { PesadaPeso } from '../../../modals/pesada-peso/pesada-peso';
import { PesadaTara } from '../../../modals/pesada-tara/pesada-tara';

import {
  WeighingService,
  ProductByOperation,
  Paginated,
  ScaleTicketDetailsTotals,
} from '../../../../../core/services/weighing.service';

type PesadaDetalleUI = PesadaDetalle & {
  requiereTara: boolean;
  tieneTara: boolean;
  tipoPesadaLabel: string;
};

type TotalsViewModel = {
  cantidadItems: number;
  cantidadPallets: number;
  pesoPalletsKg: number;
  totalPesoBruto: number;
  totalTara: number;
  subtotalPesoNeto: number;
};

@Component({
  selector: 'app-paso-detalle-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-detalle-ticket.html',
  styleUrl: './paso-detalle-ticket.scss',
})
export class PasoDetalleTicket implements OnInit, OnChanges {
  private modal = inject(NgbModal);
  private api = inject(WeighingService);

  @Input() formGroup!: FormGroup;

  @Input() pesadas: PesadaDetalle[] = [];
  @Input() totales: any = {};

  @Input() operationId: number | null = null;
  @Input() ticketId: number | null = null;

  @Input() balanzas: string[] = [];
  @Input() locked = false;

  @Output() pesadasChange = new EventEmitter<PesadaDetalle[]>();

  rows: PesadaDetalleUI[] = [];

  private productosCache: ProductByOperation[] = [];

  loadingDetails = false;
  loadingTotals = false;
  detailsError: string | null = null;

  page = 1;
  pageSize = 10;
  total = 0;

  sort: string = 'measuredWeight';
  sortDirection: 'asc' | 'desc' = 'desc';

  computedTotals: TotalsViewModel = this.buildEmptyTotals();
  apiTotals: TotalsViewModel = this.buildEmptyTotals();

  get viewTotals(): TotalsViewModel {
    const tid = Number(this.ticketId || 0);

    if (tid) {
      return this.apiTotals;
    }

    const hasRows = (this.rows?.length || 0) > 0;
    return hasRows ? this.computedTotals : this.normalizeInputTotals(this.totales);
  }

  ngOnInit(): void {
    this.rows = [];
    this.computedTotals = this.buildEmptyTotals();
    this.apiTotals = this.buildEmptyTotals();
    this.tryLoadDetailsFromApi();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticketId'] && !changes['ticketId'].firstChange) {
      this.page = 1;
      this.rows = [];
      this.total = 0;
      this.detailsError = null;
      this.computedTotals = this.buildEmptyTotals();
      this.apiTotals = this.buildEmptyTotals();
      this.tryLoadDetailsFromApi(true);
    }

    const tid = Number(this.ticketId || 0);

    if (!tid && changes['pesadas'] && Array.isArray(this.pesadas)) {
      this.rows = (this.pesadas as any[]).map((p: any) => ({
        ...(p as PesadaDetalle),
        requiereTara: !!p?.requiereTara,
        tieneTara: !!p?.tieneTara || Number(p?.taraTotalKg || 0) > 0,
        tipoPesadaLabel: String(p?.tipoPesadaLabel ?? '—'),
      })) as PesadaDetalleUI[];

      this.recomputeTotals();
    }

    if (!tid && changes['totales'] && !changes['totales'].firstChange) {
      this.computedTotals = this.normalizeInputTotals(this.totales);
    }
  }

  reloadDetails(): void {
    this.page = 1;
    this.tryLoadDetailsFromApi(true);
  }

  private buildEmptyTotals(): TotalsViewModel {
    return {
      cantidadItems: 0,
      cantidadPallets: 0,
      pesoPalletsKg: 0,
      totalPesoBruto: 0,
      totalTara: 0,
      subtotalPesoNeto: 0,
    };
  }

  private normalizeInputTotals(source: any): TotalsViewModel {
    return {
      cantidadItems: Number(source?.cantidadItems ?? 0),
      cantidadPallets: Number(source?.cantidadPallets ?? 0),
      pesoPalletsKg: Number(source?.pesoPalletsKg ?? 0),
      totalPesoBruto: Number(source?.totalPesoBruto ?? 0),
      totalTara: Number(source?.totalTara ?? 0),
      subtotalPesoNeto: Number(source?.subtotalPesoNeto ?? 0),
    };
  }

  private tryLoadDetailsFromApi(force = false): void {
    const tid = Number(this.ticketId || 0);
    if (!tid) return;

    this.loadDetails(tid);
    this.loadDetailsTotals(tid);
  }

  private loadDetails(ticketId: number): void {
    if (this.loadingDetails) return;

    this.loadingDetails = true;
    this.detailsError = null;

    this.api
      .listScaleTicketDetails(ticketId, {
        page: this.page,
        pageSize: this.pageSize,
        sort: this.sort,
        sortDirection: this.sortDirection,
      })
      .pipe(take(1))
      .subscribe({
        next: (raw: any) => {
          const res = this.normalizePaginated(raw);

          this.total = Number(res?.total ?? 0);

          const mapped: PesadaDetalleUI[] = (res?.items ?? []).map((d: any) =>
            this.mapApiDetailToPesada(d)
          );

          this.rows = mapped;
          this.recomputeTotals();
          this.pesadasChange.emit(mapped as any);
        },
        error: (err) => {
          console.error('Error cargando detalles del ticket', err);
          this.detailsError = 'No se pudieron cargar los detalles del ticket.';
          this.toastWarn(this.detailsError);
        },
        complete: () => {
          this.loadingDetails = false;
        },
      });
  }

  private loadDetailsTotals(ticketId: number): void {
    if (this.loadingTotals) return;

    this.loadingTotals = true;

    this.api
      .getScaleTicketDetailsTotals(ticketId)
      .pipe(take(1))
      .subscribe({
        next: (totals: ScaleTicketDetailsTotals) => {
          this.apiTotals = {
            cantidadItems: Number(totals?.cantidadItems ?? 0),
            cantidadPallets: 0,
            pesoPalletsKg: 0,
            totalPesoBruto: Number(totals?.totalPesoBruto ?? 0),
            totalTara: Number(totals?.totalTara ?? 0),
            subtotalPesoNeto: Number(totals?.subtotalPesoNeto ?? 0),
          };
        },
        error: (err) => {
          console.error('Error cargando totales del ticket', err);
          this.apiTotals = {
            ...this.computedTotals,
          };
        },
        complete: () => {
          this.loadingTotals = false;
        },
      });
  }

  private normalizePaginated(raw: any): Paginated<any> {
    if (raw?.items && raw?.total != null) return raw;

    const d0 = Array.isArray(raw?.data) ? raw.data[0] : null;
    if (d0?.items && d0?.total != null) return d0;

    return {
      items: [],
      total: 0,
      page: this.page,
      pageSize: this.pageSize,
    } as any;
  }

  private mapApiDetailToPesada(d: any): PesadaDetalleUI {
    const bruto = Number(d?.measuredWeight ?? d?.grossWeight ?? 0);
    const tara = Number(d?.tareWeight ?? 0);
    const neto =
      d?.netWeight != null ? Number(d.netWeight) : Math.max(bruto - tara, 0);

    const requiereTara = !!d?.requiresTare;
    const tieneTara = tara > 0;
    const tipoPesadaLabel = String(d?.weighingTypeName ?? '—');

    return {
      id: d.id as any,
      idTicketDetail: d.id as any,

      producto: String(d?.productName ?? '') as any,
      balanza: String(d?.deviceName ?? '') as any,

      tipoPesadaLabel,

      pesoBrutoKg: bruto as any,
      taraTotalKg: tara as any,
      pesoNetoKg: neto as any,

      observaciones: String(d?.observations ?? '') as any,

      requiereTara,
      tieneTara,

      taras: [] as any,

      estado: (d?.isActive ? 'Activo' : 'Inactivo') as any,
    } as PesadaDetalleUI;
  }

  onAdd(): void {
    if (this.locked) return;
    this.openPesadaModal(undefined, undefined);
  }

  onEdit(index: number): void {
    if (this.locked) return;
    const row = this.rows?.[index];
    if (!row) return;
    this.openPesadaModal(row, index);
  }

  async onDelete(index: number): Promise<void> {
    if (this.locked) return;

    const row = this.rows?.[index];
    if (!row) return;

    const tid = Number(this.ticketId || 0);

    if (tid) {
      this.toastWarn('La eliminación en servidor aún no está implementada en este flujo.');
      return;
    }

    const ok = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar pesada?',
      text: 'Esta acción eliminará la pesada del listado.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!ok.isConfirmed) return;

    const next = [...(this.rows || [])];
    next.splice(index, 1);
    this.rows = next;
    this.recomputeTotals();
    this.pesadasChange.emit(next as any);
  }

  onManageTaras(index: number): void {
    if (this.locked) return;
    const row = this.rows?.[index];
    if (!row) return;

    if (!row.requiereTara) {
      this.toastWarn('Esta pesada no requiere tara.');
      return;
    }

    this.openTarasModal(row, index);
  }

  private openPesadaModal(row?: PesadaDetalleUI, index?: number): void {
    const opId = Number(this.operationId || 0);
    if (!opId) {
      this.toastWarn('Selecciona una operación en el Paso 1 antes de agregar una pesada.');
      return;
    }

    const modalRef = this.modal.open(PesadaPeso, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    (modalRef.componentInstance as any).operationId = opId;
    (modalRef.componentInstance as any).data = {
      pesada: row ?? null,
      headerTicketId: Number(this.ticketId || 0),
      ticketId: Number(this.ticketId || 0),
      productos: this.productosCache,
      balanzas: this.balanzas,
    };

    modalRef.result
      .then((result: PesadaDetalle | null | undefined) => {
        if (!result) return;

        const tid = Number(this.ticketId || 0);

        if (tid) {
          this.reloadDetails();
          return;
        }

        this.reloadDetails();
      })
      .catch(() => {});
  }

  private openTarasModal(row: PesadaDetalleUI, index: number): void {
    const modalRef = this.modal.open(PesadaTara, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    (modalRef.componentInstance as any).data = {
      pesada: row,
      taras: row.taras ?? [],
    };

    modalRef.result
      .then((result: TaraItem[] | null | undefined) => {
        if (!result) return;

        const tid = Number(this.ticketId || 0);

        if (tid) {
          this.reloadDetails();
          return;
        }

        const next = [...(this.rows || [])];
        const current = next[index];
        if (!current) return;

        const taraTotalKg =
          result.reduce((acc, t) => acc + Number(t?.taraKg || 0), 0) || 0;

        const pesoBruto = Number(current.pesoBrutoKg || 0);
        const neto = Math.max(pesoBruto - taraTotalKg, 0);

        next[index] = {
          ...current,
          taras: result,
          taraTotalKg,
          tieneTara: taraTotalKg > 0,
          pesoNetoKg: neto,
        };

        this.rows = next;
        this.recomputeTotals();
        this.pesadasChange.emit(next as any);
      })
      .catch(() => {});
  }

  private recomputeTotals(): void {
    const items = this.rows || [];

    const cantidadItems = items.length;
    const totalPesoBruto = items.reduce(
      (acc, x) => acc + Number((x as any)?.pesoBrutoKg || 0),
      0
    );
    const totalTara = items.reduce(
      (acc, x) => acc + Number((x as any)?.taraTotalKg || 0),
      0
    );
    const subtotalPesoNeto = items.reduce(
      (acc, x) => acc + Number((x as any)?.pesoNetoKg || 0),
      0
    );

    this.computedTotals = {
      cantidadItems,
      cantidadPallets: 0,
      pesoPalletsKg: 0,
      totalPesoBruto,
      totalTara,
      subtotalPesoNeto,
    };

    const tid = Number(this.ticketId || 0);
    if (!tid) {
      this.apiTotals = { ...this.computedTotals };
    }
  }

  private toastWarn(message: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: message,
      showConfirmButton: false,
      timer: 2800,
      timerProgressBar: true,
    });
  }
}