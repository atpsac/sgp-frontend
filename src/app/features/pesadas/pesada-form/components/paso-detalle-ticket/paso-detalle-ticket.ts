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
  ScaleTicketDetail,
  Paginated,
} from '../../../../../core/services/weighing.service';

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

  /** ✅ LISTADO (tabla) */
  @Input() pesadas: PesadaDetalle[] = [];
  @Input() totales: any = {};

  /** ✅ Operación seleccionada (para cargar productos al abrir modal) */
  @Input() operationId: number | null = null;

  /** ✅ TicketId (OBLIGATORIO para consumir el endpoint /details) */
  @Input() ticketId: number | null = null;

  /** Puedes seguir pasando balanzas por input (luego lo hacemos por API también) */
  @Input() balanzas: string[] = [];

  /** 🔒 bloquear sólo si estás guardando */
  @Input() locked = false;

  @Output() pesadasChange = new EventEmitter<PesadaDetalle[]>();

  // cache local para no pegarle al API cada vez
  private productosCache: ProductByOperation[] = [];
  private loadingProductos = false;

  // ====== Estado del listado desde API ======
  loadingDetails = false;
  detailsError: string | null = null;

  page = 1;
  pageSize = 10;
  total = 0;

  sort: string = 'grossWeight';
  sortDirection: 'asc' | 'desc' = 'desc';

  ngOnInit(): void {
    this.tryLoadDetailsFromApi();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticketId'] && !changes['ticketId'].firstChange) {
      this.tryLoadDetailsFromApi();
    }
  }

  reloadDetails(): void {
    this.tryLoadDetailsFromApi(true);
  }

  private tryLoadDetailsFromApi(force = false): void {
    const tid = Number(this.ticketId || 0);
    if (!tid) return;
    this.loadDetails(tid);
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
        next: (res: Paginated<ScaleTicketDetail>) => {
          this.total = Number(res?.total ?? 0);

          const mapped = (res?.items ?? []).map((d) =>
            this.mapApiDetailToPesada(d)
          );

          this.pesadasChange.emit(mapped);
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

  private mapApiDetailToPesada(d: ScaleTicketDetail): PesadaDetalle {
    const bruto = Number(d?.grossWeight ?? 0);
    const tara = Number(d?.tareWeight ?? 0);
    const neto =
      d?.netWeight != null ? Number(d.netWeight) : Math.max(bruto - tara, 0);

    return {
      id: d.id as any,
      idTicketDetail: d.id as any,

      producto: (d.productName ?? '') as any,
      balanza: (d.deviceName ?? '') as any,

      pesoBrutoKg: bruto as any,
      taraTotalKg: tara as any,
      pesoNetoKg: neto as any,

      observaciones: (d.observations ?? '') as any,

      tieneTara: Boolean(d.hasPackaging ?? tara > 0) as any,

      taras: [] as any,

      estado: (d.isActive ? 'Activo' : 'Inactivo') as any,
    } as PesadaDetalle;
  }

  // ===== UI handlers =====
  onAdd(): void {
    if (this.locked) return;
    this.ensureProductosThenOpen();
  }

  onEdit(index: number): void {
    if (this.locked) return;
    const row = this.pesadas?.[index];
    if (!row) return;
    this.ensureProductosThenOpen(row, index);
  }

  onDelete(index: number): void {
    if (this.locked) return;
    const next = [...(this.pesadas || [])];
    next.splice(index, 1);
    this.pesadasChange.emit(next);
  }

  onManageTaras(index: number): void {
    if (this.locked) return;
    const row = this.pesadas?.[index];
    if (!row) return;
    this.openTarasModal(row, index);
  }

  private ensureProductosThenOpen(row?: PesadaDetalle, index?: number): void {
    const opId = Number(this.operationId || 0);

    if (!opId) {
      this.toastWarn(
        'Selecciona una operación en el Paso 1 antes de agregar una pesada.'
      );
      return;
    }

    if (this.productosCache.length) {
      this.openPesadaModalWithProducts(this.productosCache, row, index);
      return;
    }

    if (this.loadingProductos) return;
    this.loadingProductos = true;

    this.api
      .getProductsByOperation(opId)
      .pipe(take(1))
      .subscribe({
        next: (products) => {
          this.productosCache = products || [];
          this.openPesadaModalWithProducts(this.productosCache, row, index);
        },
        error: (err) => {
          console.error('Error cargando productos por operación', err);
          this.toastWarn(
            'No se pudieron cargar los productos de la operación. Inténtalo nuevamente.'
          );
        },
        complete: () => (this.loadingProductos = false),
      });
  }

  private openPesadaModalWithProducts(
    productos: ProductByOperation[],
    row?: PesadaDetalle,
    index?: number
  ): void {
    const modalRef = this.modal.open(PesadaPeso, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    (modalRef.componentInstance as any).operationId = Number(this.operationId || 0);
    (modalRef.componentInstance as any).data = {
      pesada: row ?? null,
      productos,
      balanzas: this.balanzas,
    };

    modalRef.result
      .then((result: PesadaDetalle | null | undefined) => {
        if (!result) return;

        if (!Array.isArray((result as any).taras)) (result as any).taras = [];

        const taras: TaraItem[] = (result as any).taras || [];
        const taraTotalKg =
          taras.reduce((acc, t) => acc + Number(t?.taraKg || 0), 0) || 0;

        result.taraTotalKg = taraTotalKg;
        result.tieneTara = taraTotalKg > 0;
        result.pesoNetoKg = Number(result.pesoBrutoKg || 0) - taraTotalKg;

        const next = [...(this.pesadas || [])];
        if (index != null) next[index] = result;
        else next.push(result);

        this.pesadasChange.emit(next);
      })
      .catch(() => {});
  }

  private openTarasModal(row: PesadaDetalle, index: number): void {
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

        const next = [...(this.pesadas || [])];
        const current = next[index];
        if (!current) return;

        const taraTotalKg =
          result.reduce((acc, t) => acc + Number(t?.taraKg || 0), 0) || 0;

        next[index] = {
          ...current,
          taras: result,
          taraTotalKg,
          tieneTara: taraTotalKg > 0,
          pesoNetoKg: Number(current.pesoBrutoKg || 0) - taraTotalKg,
        };

        this.pesadasChange.emit(next);
      })
      .catch(() => {});
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
