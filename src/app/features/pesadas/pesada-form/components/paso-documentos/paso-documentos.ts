import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import Swal from 'sweetalert2';

import {
  WeighingService,
  BusinessPartner,
  DocumentType,
} from '../../../../../core/services/weighing.service';

// ✅ Ajusta esta ruta según tu proyecto

// OJO: ideal mover DocumentoRelacionado a un archivo models,
// pero si aún lo tienes en pesada-form, déjalo así:
import { DocumentoRelacionado } from '../../pesada-form';
import { PesadaDocumento } from '../../../modals/pesada-documento/pesada-documento';

@Component({
  selector: 'app-paso-documentos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paso-documentos.html',
  styleUrl: './paso-documentos.scss',
})
export class PasoDocumentos implements OnInit, OnChanges {
  private api = inject(WeighingService);
  private modal = inject(NgbModal);
  private destroyRef = inject(DestroyRef);

  /** Operación seleccionada en Paso 1 (dato clave para cargar catálogos) */
  @Input() operationId: number | null = null;

  /** Bloquea edición cuando ya se guardó cabecera */
  @Input() locked = false;

  /** Documentos iniciales (draft) */
  @Input() documentos: DocumentoRelacionado[] = [];

  /** Emite el listado actualizado */
  @Output() documentosChange = new EventEmitter<DocumentoRelacionado[]>();

  /** Catálogos dependientes de operación */
  businessPartners: BusinessPartner[] = [];
  documentTypes: DocumentType[] = [];
  loadingCatalogs = false;

  /** Trabajamos con copia local para no mutar el input directo */
  docs: DocumentoRelacionado[] = [];

  ngOnInit(): void {
    this.docs = [...(this.documentos || [])];
    this.reloadCatalogs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documentos'] && !changes['documentos'].firstChange) {
      this.docs = [...(this.documentos || [])];
      // cuando cambian docs y ya tengo catálogos, normalizo
      if (this.businessPartners.length || this.documentTypes.length) {
        this.docs = this.docs.map((d) => this.normalizeDocumentoRelacionado(d));
      }
    }

    if (changes['operationId'] && !changes['operationId'].firstChange) {
      this.reloadCatalogs();
    }
  }

  // =========================================================
  // Catálogos por operación
  // =========================================================
  private reloadCatalogs(): void {
    const opId = Number(this.operationId || 0);

    if (!opId) {
      this.businessPartners = [];
      this.documentTypes = [];
      return;
    }

    this.loadingCatalogs = true;

    this.api
      .getBusinessPartnersByOperation(opId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bps) => {
          this.businessPartners = bps || [];
          this.docs = this.docs.map((d) => this.normalizeDocumentoRelacionado(d));
          this.emitDocs();
        },
        error: (err) => console.error('Error cargando socios de negocio', err),
      });

    this.api
      .getDocumentTypesByOperation(opId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.documentTypes = types || [];
          this.docs = this.docs.map((d) => this.normalizeDocumentoRelacionado(d));
          this.emitDocs();
        },
        error: (err) => console.error('Error cargando tipos de documento', err),
        complete: () => (this.loadingCatalogs = false),
      });
  }

  // =========================================================
  // Acciones UI
  // =========================================================
  async onAdd(): Promise<void> {
    if (this.locked) {
      this.toastWarn('El encabezado ya fue guardado. No se pueden modificar documentos.');
      return;
    }

    if (!this.operationId) {
      this.toastWarn('Selecciona una operación en el Paso 1 para cargar catálogos.');
      return;
    }

    this.openDocumentoModal();
  }

  onEdit(index: number): void {
    if (this.locked) {
      this.toastWarn('El encabezado ya fue guardado. No se pueden modificar documentos.');
      return;
    }
    const row = this.docs[index];
    if (!row) return;

    this.openDocumentoModal(row, index);
  }

  async onDelete(index: number): Promise<void> {
    if (this.locked) {
      this.toastWarn('El encabezado ya fue guardado. No se pueden modificar documentos.');
      return;
    }

    const ok = await Swal.fire({
      title: '¿Eliminar documento?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((r) => r.isConfirmed);

    if (!ok) return;

    this.docs.splice(index, 1);
    this.emitDocs();
  }

  // =========================================================
  // Modal
  // =========================================================
  private openDocumentoModal(row?: DocumentoRelacionado, index?: number): void {
    const modalRef = this.modal.open(PesadaDocumento, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    (modalRef.componentInstance as any).operationId = Number(this.operationId || 0);
    (modalRef.componentInstance as any).businessPartners = this.businessPartners;
    (modalRef.componentInstance as any).documentTypes = this.documentTypes;
    (modalRef.componentInstance as any).data = row ? this.normalizeDocumentoRelacionado(row) : null;

    modalRef.result
      .then((result: DocumentoRelacionado | null | undefined) => {
        if (!result) return;

        const fixed = this.normalizeDocumentoRelacionado(result);

        if (index != null) this.docs[index] = fixed;
        else this.docs.push(fixed);

        this.emitDocs();
      })
      .catch(() => {});
  }

  // =========================================================
  // Emit + normalización
  // =========================================================
  private emitDocs(): void {
    // emitimos copia
    this.documentosChange.emit([...this.docs]);
  }

  private normalizeDocumentoRelacionado(doc: DocumentoRelacionado): DocumentoRelacionado {
    const d: any = { ...(doc || {}) };

    // serie/numeroCorrelativo desde numeroDocumento (si viene con "-")
    if (!d.serie || !d.numeroCorrelativo) {
      const nd = String(d.numeroDocumento || '');
      if (nd.includes('-')) {
        const [ser, cor] = nd.split('-', 2);
        d.serie = d.serie || ser?.trim();
        d.numeroCorrelativo = d.numeroCorrelativo || cor?.trim();
      }
    }

    if (d.serie && d.numeroCorrelativo) {
      d.numeroDocumento = `${d.serie}-${d.numeroCorrelativo}`;
    }

    // link socio negocio por nombre si no vino id
    if (!this.isValidInt(d.idBusinessPartners)) {
      const bp = this.businessPartners.find((x) =>
        this.safeEq(x.companyName, d.socioNegocio)
      );
      if (bp) d.idBusinessPartners = bp.id;
    }

    // link tipo doc por code/name
    if (!this.isValidInt(d.idDocumentTypes)) {
      const byCode = this.documentTypes.find((x) =>
        this.safeEq(x.code, d.tipoDocumento)
      );
      const byName = this.documentTypes.find((x) =>
        this.safeEq(x.name, d.documento)
      );
      const found = byCode || byName;
      if (found) d.idDocumentTypes = found.id;
    }

    return d as DocumentoRelacionado;
  }

  private safeEq(a: any, b: any): boolean {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  private isValidInt(val: any): boolean {
    return Number.isInteger(val) && Number(val) > 0;
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
