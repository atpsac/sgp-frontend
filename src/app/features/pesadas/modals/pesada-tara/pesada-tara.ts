import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { PesadaTaraAdd } from '../pesada-tara-add/pesada-tara-add';

/* Coincide con la interfaz TaraItem que usas en PesadaForm */
export interface TaraItem {
  id?: number;
  empaque: string;
  codigo: string;
  descripcion: string;
  taraPorEmpaqueKg: number;
  cantidad: number;
  taraKg: number;
}

export interface PesadaTaraData {
  pesada: any;          // Puedes tiparlo como PesadaDetalle si lo exportas
  taras: TaraItem[];
}

@Component({
  selector: 'app-pesada-tara',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pesada-tara.html',
  styleUrl: './pesada-tara.scss',
})
export class PesadaTara implements OnInit {

  /** Recibimos del padre la pesada y sus taras actuales */
  @Input() data: PesadaTaraData | null = null;

  // Título / subtítulo (por si luego quieres cambiarlos desde el padre)
  @Input() title = 'Agregar tara';
  @Input() subtitle = 'Administra los empaques y su tara para esta pesada.';

  // Lista completa de taras en memoria
  taras: TaraItem[] = [];

  // Resumen de totales (parte superior)
  resumen = {
    cantidadItems: 0,
    cantidadEmpaques: 0,
    taraTotalKg: 0,
  };

  // Paginación
  pageSize = 5;
  pageSizes = [5, 10, 20];
  currentPage = 1;
  totalRecords = 0;
  totalPages = 1;

  get pagedTaras(): TaraItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.taras.slice(start, end);
  }

  get startRecord(): number {
    if (this.totalRecords === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalRecords ? this.totalRecords : end;
  }

  loading = false;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    // Inicializamos taras desde la data del padre
    if (this.data && Array.isArray(this.data.taras)) {
      // Clonamos para no mutar directamente el arreglo del padre
      this.taras = this.data.taras.map(t => ({ ...t }));
    } else {
      this.taras = [];
    }

    this.recalcularTotales();
  }

  /* ======================= ACCIONES DEL HEADER ======================= */

  /** Cierra el modal sin enviar cambios */
  close(): void {
    if (this.loading) return;
    this.activeModal.dismiss();
  }

  /** Guarda y devuelve el arreglo de taras al padre */
  save(): void {
    if (this.loading) return;
    this.loading = true;

    // Devolvemos el arreglo completo de taras
    this.activeModal.close(this.taras);
    this.loading = false;
  }

  /** Click en botón "Agregar tara" → abre modal PesadaTaraAdd vacío */
  onClickAgregarTara(): void {
    this.openTaraAddModal();
  }

  /** Editar una tara existente (si quieres usar el botón de los 3 puntos) */
  onEditTara(row: TaraItem, index: number): void {
    this.openTaraAddModal(row, index);
  }

  /** Eliminar tara */
  onDeleteTara(index: number): void {
    this.taras.splice(index, 1);
    this.recalcularTotales();
  }

  /* ======================= MODAL HIJO PesadaTaraAdd ======================= */

  /**
   * Abre el modal de alta/edición de una tara.
   * Si `row` e `index` vienen definidos → edición.
   * Si no → creación.
   */
  private openTaraAddModal(row?: TaraItem, index?: number): void {
    const modalRef = this.modalService.open(PesadaTaraAdd, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });

    // Pasamos data inicial al modal hijo (para editar)
    (modalRef.componentInstance as any).data = row ?? null;

    modalRef.result
      .then((result: TaraItem | null | undefined) => {
        if (!result) return;

        if (index != null) {
          // Edición
          this.taras[index] = { ...result };
        } else {
          // Nueva tara
          this.taras.push({ ...result });
        }

        this.recalcularTotales();
      })
      .catch(() => {
        // Cancelado sin cambios
      });
  }

  /* ======================= RESÚMEN Y PAGINACIÓN ======================= */

  /** Recalcula totales y metadatos de paginación */
  private recalcularTotales(): void {
    this.totalRecords = this.taras.length;

    this.resumen.cantidadItems = this.totalRecords;
    this.resumen.cantidadEmpaques = this.taras.reduce(
      (acc, t) => acc + (t.cantidad || 0),
      0
    );
    this.resumen.taraTotalKg = this.taras.reduce(
      (acc, t) => acc + (t.taraKg || 0),
      0
    );

    this.totalPages = Math.max(
      1,
      Math.ceil(this.totalRecords / this.pageSize)
    );
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);
    this.pageSize = !isNaN(parsed) && parsed > 0 ? parsed : 5;
    this.currentPage = 1;
    this.recalcularTotales();
  }
}
