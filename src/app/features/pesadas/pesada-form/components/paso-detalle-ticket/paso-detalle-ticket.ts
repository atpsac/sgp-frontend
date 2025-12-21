import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
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
} from '../../../../../core/services/weighing.service';

@Component({
  selector: 'app-paso-detalle-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-detalle-ticket.html',
  styleUrl: './paso-detalle-ticket.scss',
})
export class PasoDetalleTicket {
  private modal = inject(NgbModal);
  private api = inject(WeighingService);

  @Input() formGroup!: FormGroup;

  @Input() pesadas: PesadaDetalle[] = [];
  @Input() totales: any = {};

  /** ✅ Operación seleccionada (para cargar productos al abrir modal) */
  @Input() operationId: number | null = null;

  /** Puedes seguir pasando balanzas por input (luego lo hacemos por API también) */
  @Input() balanzas: string[] = [];

  /** 🔒 bloquear sólo si estás guardando */
  @Input() locked = false;

  @Output() pesadasChange = new EventEmitter<PesadaDetalle[]>();
  @Output() ajusteChange = new EventEmitter<void>();

  // cache local para no pegarle al API cada vez
  private productosCache: ProductByOperation[] = [];
  private loadingProductos = false;

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

  onAjusteChange(): void {
    this.ajusteChange.emit();
  }

  // =========================================================
  // ✅ Cargar productos por operación y abrir modal
  // =========================================================
  private ensureProductosThenOpen(row?: PesadaDetalle, index?: number): void {
    const opId = Number(this.operationId || 0);

    if (!opId) {
      this.toastWarn('Selecciona una operación en el Paso 1 antes de agregar una pesada.');
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
          this.toastWarn('No se pudieron cargar los productos de la operación. Inténtalo nuevamente.');
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

    // ✅ igual que PasoDocumentos, le pasamos operationId y data
    (modalRef.componentInstance as any).operationId = Number(this.operationId || 0);
    (modalRef.componentInstance as any).data = {
      pesada: row ?? null,
      productos,          // <-- viene del API
      balanzas: this.balanzas, // <-- por ahora input
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

  // =========================================================
  // Taras modal (igual que antes)
  // =========================================================
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
