import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import {
  WeighingService,
  BusinessPartner,
  DocumentType,
} from '../../../../core/services/weighing.service';

export interface PesadaDocumentoModel {
  id?: number;
  socioNegocio: string;        // nombre del socio (companyName)
  tipoDocumento: string;       // código del documento (EF, EG, etc.)
  documento: string;           // nombre del documento (FACTURA ELECTRÓNICA...)
  fechaDocumento: string;      // yyyy-MM-dd
  serie: string;
  numeroCorrelativo: string;
  numeroDocumento: string;     // serie-numero
  pesoBrutoKg: number;
  pesoNetoKg: number;
}

@Component({
  selector: 'app-pesada-documento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-documento.html',
  styleUrl: './pesada-documento.scss',
})
export class PesadaDocumento implements OnInit {
  @Input() titulo = 'Agregar documento relacionado';
  @Input() data: PesadaDocumentoModel | null = null;

  /** Id de operación para consultar socios y tipos de documento */
  @Input() operationId!: number;

  form: FormGroup;
  isSaving = false;

  businessPartners: BusinessPartner[] = [];
  documentTypes: DocumentType[] = [];

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private weighingService: WeighingService
  ) {
    this.form = this.fb.group({
      socioNegocio: ['', Validators.required],
      tipoDocumento: ['', Validators.required], // código del documento
      fechaDocumento: ['', Validators.required],
      serie: ['', Validators.required],
      numeroCorrelativo: ['', Validators.required],
      pesoBrutoKg: [null, [Validators.required, Validators.min(0)]],
      pesoNetoKg: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    // Carga de combos desde API
    this.loadBusinessPartnersAndDocuments();

    // Si viene data => modo edición, seteamos valores
    if (this.data) {
      this.titulo = 'Editar documento relacionado';
      this.form.patchValue({
        socioNegocio: this.data.socioNegocio,
        tipoDocumento: this.data.tipoDocumento, // código
        fechaDocumento: this.toDateInputValue(this.data.fechaDocumento),
        serie: this.data.serie,
        numeroCorrelativo: this.data.numeroCorrelativo,
        pesoBrutoKg: this.data.pesoBrutoKg,
        pesoNetoKg: this.data.pesoNetoKg,
      });
    }
  }

  /** Carga socios y tipos de documento SIN dejar seleccionados por defecto */
  private loadBusinessPartnersAndDocuments(): void {
    if (!this.operationId) {
      return;
    }

    // Socios de negocio por operación
    this.weighingService
      .getBusinessPartnersByOperation(this.operationId)
      .subscribe({
        next: (partners) => {
          this.businessPartners = partners || [];
          // IMPORTANTE: no seteamos socioNegocio si es nuevo.
          // Si es edición, el patch del ngOnInit ya puso el valor.
        },
        error: (err) => {
          console.error('Error loading business partners', err);
        },
      });

    // Tipos de documento por operación
    this.weighingService
      .getDocumentTypesByOperation(this.operationId)
      .subscribe({
        next: (docs) => {
          this.documentTypes = docs || [];
          // IMPORTANTE: no seteamos tipoDocumento por defecto.
          // En edición ya viene seteado desde ngOnInit.
        },
        error: (err) => {
          console.error('Error loading document types', err);
        },
      });
  }

  private toDateInputValue(value: string | Date): string {
    if (!value) return '';
    if (value instanceof Date) {
      return value.toISOString().substring(0, 10);
    }
    // Asumimos que viene como yyyy-MM-dd o ISO
    return value.substring(0, 10);
  }

  cancelar(): void {
    this.activeModal.dismiss('cancel');
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const raw = this.form.value;

    // Serie-numero
    const numeroDocumento = `${(raw.serie || '').trim()}-${(
      raw.numeroCorrelativo || ''
    ).trim()}`;

    // Buscar descripción del tipo de documento
    const selectedDocType = this.documentTypes.find(
      (d) => d.code === raw.tipoDocumento
    );
    const docName = selectedDocType?.name ?? '';

    const result: PesadaDocumentoModel = {
      id: this.data?.id,
      socioNegocio: raw.socioNegocio,
      tipoDocumento: raw.tipoDocumento, // código (EF, EG, etc.)
      documento: docName,               // nombre del documento
      fechaDocumento: raw.fechaDocumento,
      serie: raw.serie,
      numeroCorrelativo: raw.numeroCorrelativo,
      numeroDocumento,
      pesoBrutoKg: Number(raw.pesoBrutoKg),
      pesoNetoKg: Number(raw.pesoNetoKg),
    };

    // Devuelve el documento al componente padre (PesadaForm)
    this.activeModal.close(result);
  }
}
