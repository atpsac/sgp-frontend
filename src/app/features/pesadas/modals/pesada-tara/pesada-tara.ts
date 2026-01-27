import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize, Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { PesadaTaraAdd } from '../pesada-tara-add/pesada-tara-add';
import { WeighingService } from '../../../../core/services/weighing.service';

export interface TaraItem {
  id?: number; // id del registro en scale-ticket-details-packaging-types
  empaque: string;
  codigo: string;
  descripcion: string;
  taraPorEmpaqueKg: number;
  cantidad: number;
  taraKg: number;

  // extra para edición
  packagingTypesId?: number;
  createdAt?: string;
}

export interface PesadaTaraData {
  pesada: any; // aquí debe venir scaleTicketDetailsId o idTicketDetail
  taras?: TaraItem[]; // opcional (ya no lo usamos como fuente principal)
}

export interface TareTotals {
  idScaleTicketDetails: number;
  totalActiveRecords: number;
  totalPackageQuantity: number;
  totalSubtotalTareweight?: number; // backend a veces viene así
  totalSubtotalTareWeight?: number; // o así
}

type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-pesada-tara',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pesada-tara.html',
  styleUrl: './pesada-tara.scss',
})
export class PesadaTara implements OnInit, OnDestroy {
  @Input() data: PesadaTaraData | null = null;

  @Input() title = 'Agregar tara';
  @Input() subtitle = 'Administra los empaques y su tara para esta pesada.';

  private modalService = inject(NgbModal);
  private weighingSvc = inject(WeighingService);
  public activeModal = inject(NgbActiveModal);

  private destroy$ = new Subject<void>();

  // id del detalle (obligatorio para listar)
  scaleTicketDetailsId: number | null = null;

  // tabla (server-side)
  taras: TaraItem[] = [];

  // resumen
  resumen = {
    cantidadItems: 0,
    cantidadEmpaques: 0,
    taraTotalKg: 0,
  };

  // paginación (server-side)
  pageSize = 5;
  pageSizes = [5, 10, 20];
  currentPage = 1;
  totalRecords = 0;
  totalPages = 1;
  pages: number[] = [];

  // orden
  sortBy = 'createdAt';
  sortDirection: SortDirection = 'desc'; // ✅ por defecto DESC (más recientes)

  // loading
  loading = false;
  loadingTotals = false;

  // helpers de UI
  get startRecord(): number {
    if (!this.totalRecords) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    if (!this.totalRecords) return 0;
    return this.startRecord + (this.taras?.length || 0) - 1;
  }

  async ngOnInit(): Promise<void> {
    this.scaleTicketDetailsId = this.resolveScaleTicketDetailsId();

    if (!this.scaleTicketDetailsId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Detalle no encontrado',
        text: 'No se encontró scaleTicketDetailsId / idTicketDetail para listar taras.',
        confirmButtonText: 'OK',
      });
      this.activeModal.dismiss();
      return;
    }

    // carga inicial
    this.currentPage = 1;
    this.pageSize = this.pageSize || 5;

    this.fetchPage();
    this.fetchTotals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ======================= ACCIONES ======================= */

  close(): void {
    if (this.loading) return;
    this.activeModal.dismiss();
  }

  save(): void {
    // si quieres devolver algo al padre puedes devolver los totales o simplemente cerrar
    this.activeModal.close({
      updated: true,
      totals: { ...this.resumen },
    });
  }

  onClickAgregarTara(): void {
    this.openTaraAddModal();
  }

  onEditTara(row: TaraItem): void {
    this.openTaraAddModal(row);
  }

  async onDeleteTara(row: TaraItem): Promise<void> {
    // if (!row?.id) return;

    // const ok = await Swal.fire({
    //   icon: 'warning',
    //   title: 'Eliminar tara',
    //   text: '¿Seguro que deseas eliminar este registro?',
    //   showCancelButton: true,
    //   confirmButtonText: 'Sí, eliminar',
    //   cancelButtonText: 'Cancelar',
    // });

    // if (!ok.isConfirmed) return;

    // try {
    //   this.loading = true;

    //   await this.weighingSvc.deleteTareById(row.id).toPromise();

    //   // recargar
    //   this.fetchPage();
    //   this.fetchTotals();
    // } catch (e: any) {
    //   await Swal.fire({
    //     icon: 'error',
    //     title: 'No se pudo eliminar',
    //     text: e?.message || 'Ocurrió un error eliminando la tara.',
    //     confirmButtonText: 'OK',
    //   });
    // } finally {
    //   this.loading = false;
    // }
  }

  /* ======================= LISTADO + TOTALES ======================= */

  fetchPage(): void {
    if (!this.scaleTicketDetailsId) return;

    this.loading = true;

    this.weighingSvc
      .listTaresByScaleTicketDetail(this.scaleTicketDetailsId, {
        page: this.currentPage,
        pageSize: this.pageSize,
        // sortBy: this.sortBy,  subtotalTareWeight
        sortBy: 'subtotalTareWeight',  
        sortDirection: this.sortDirection, // ✅ asc | desc
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (p) => {
          this.taras = (p.items || []).map((x: any) => this.mapApiToRow(x));

          this.totalRecords = Number(p.total ?? 0);
          this.currentPage = Number(p.page ?? this.currentPage);
          this.pageSize = Number(p.pageSize ?? this.pageSize);

          this.totalPages = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
          this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
        },
        error: async (err) => {
          await Swal.fire({
            icon: 'error',
            title: 'Error al listar taras',
            text: err?.message || 'No se pudo obtener la lista.',
            confirmButtonText: 'OK',
          });
        },
      });
  }

  fetchTotals(): void {
    if (!this.scaleTicketDetailsId) return;

    this.loadingTotals = true;

    // ✅ tu endpoint real /totals
    this.weighingSvc
      .getTareTotals(this.scaleTicketDetailsId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingTotals = false))
      )
      .subscribe({
        next: (t: TareTotals) => {
          const subtotal =
            Number((t as any)?.totalSubtotalTareweight ?? 0) ||
            Number((t as any)?.totalSubtotalTareWeight ?? 0) ||
            0;

          this.resumen.cantidadItems = Number((t as any)?.totalActiveRecords ?? 0);
          this.resumen.cantidadEmpaques = Number((t as any)?.totalPackageQuantity ?? 0);
          this.resumen.taraTotalKg = Number(subtotal ?? 0);
        },
        error: () => {
          // si falla, no rompemos el modal; solo dejamos totales en 0
          this.resumen = { cantidadItems: 0, cantidadEmpaques: 0, taraTotalKg: 0 };
        },
      });
  }

  /* ======================= PAGINACIÓN + ORDEN ======================= */

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchPage();
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);
    this.pageSize = !isNaN(parsed) && parsed > 0 ? parsed : 5;
    this.currentPage = 1;
    this.fetchPage();
  }

  onChangeSortDirection(dir: SortDirection): void {
    this.sortDirection = dir;
    this.currentPage = 1;
    this.fetchPage();
  }

  /* ======================= MODAL HIJO ======================= */

  private openTaraAddModal(row?: TaraItem): void {
    const modalRef = this.modalService.open(PesadaTaraAdd, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    // para crear, le pasas el scaleTicketDetailsId
    (modalRef.componentInstance as any).scaleTicketDetailsId = this.scaleTicketDetailsId;

    // para editar, le pasas la fila
    (modalRef.componentInstance as any).initialData = row ?? null;

    modalRef.result
      .then(async (result: any) => {
        if (!result) return;

        // ✅ IMPORTANTE:
        // El modal hijo (PesadaTaraAdd) YA registra en backend con createTare().
        // Aquí SOLO refrescamos para evitar doble inserción.
        this.fetchPage();
        this.fetchTotals();

        // ✅ Si luego implementas UPDATE/DELETE en backend, aquí puedes usar esto:
        try {
          this.loading = true;

          if (!this.scaleTicketDetailsId) return;

          if (row?.id) {
            // UPDATE (si tu backend lo soporta)
            // await this.weighingSvc
            //   .updateTareById(row.id, {
            //     idScaleTicketDetails: this.scaleTicketDetailsId,
            //     packagingTypesId: Number(result.packagingTypesId ?? row.packagingTypesId),
            //     packageQuantity: Number(result.cantidad ?? result.packageQuantity ?? 0),
            //   })
            //   .toPromise();
          } else {
            // CREATE (NO USAR si el hijo ya crea, para evitar duplicado)
            // await this.weighingSvc
            //   .createTare({
            //     idScaleTicketDetails: this.scaleTicketDetailsId,
            //     packagingTypesId: Number(result.packagingTypesId),
            //     packageQuantity: Number(result.cantidad ?? result.packageQuantity ?? 0),
            //   })
            //   .toPromise();
          }
        } catch (e: any) {
          await Swal.fire({
            icon: 'error',
            title: 'No se pudo guardar la tara',
            text: e?.message || 'Ocurrió un error creando/actualizando.',
            confirmButtonText: 'OK',
          });
        } finally {
          this.loading = false;
        }
      })
      .catch(() => {});
  }

  /* ======================= MAPPERS / HELPERS ======================= */

  private mapApiToRow(x: any): TaraItem {
    // Estructura típica de tu API (según screenshot):
    // {
    //   id, packageQuantity, registeredUnitTareWeight, subtotalTareWeight, createdAt,
    //   packagingType: { id, code, name, description, unitTareWeight }
    // }

    const pt = x?.packagingType ?? {};
    const unit = Number(x?.registeredUnitTareWeight ?? pt?.unitTareWeight ?? 0);
    const qty = Number(x?.packageQuantity ?? 0);
    const subtotal = Number(x?.subtotalTareWeight ?? 0);

    return {
      id: Number(x?.id ?? 0) || undefined,
      packagingTypesId: Number(pt?.id ?? 0) || undefined,
      createdAt: x?.createdAt,

      empaque: String(pt?.name ?? ''),
      codigo: String(pt?.code ?? ''),
      descripcion: String(pt?.description ?? ''),
      taraPorEmpaqueKg: unit,
      cantidad: qty,
      taraKg: subtotal,
    };
  }

  private resolveScaleTicketDetailsId(): number | null {
    const p = this.data?.pesada;

    const id = Number(
      p?.scaleTicketDetailsId ??
        p?.idTicketDetail ??
        p?.idScaleTicketDetails ??
        p?.ScaleTicketDetailsId ??
        p?.id ??
        null
    );

    return Number.isFinite(id) && id > 0 ? id : null;
  }
}
