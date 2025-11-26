import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface PesadaDocumentoModel {
  id?: number;
  socioNegocio: string;
  tipoDocumento: string;
  documento: string;
  fechaDocumento: string; // yyyy-MM-dd
  serie: string;
  numeroCorrelativo: string;
  numeroDocumento: string;
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

  form: FormGroup;
  isSaving = false;

  // Opciones de ejemplo (puedes luego cambiarlas por las de tu API)
  socioNegocioOptions: string[] = [
    'AMAZONAS TRADING PERU S.A.C.',
    'CLIENTE EXTERNO 1',
    'CLIENTE EXTERNO 2',
  ];

  tipoDocumentoOptions: { value: string; label: string }[] = [
    { value: 'EG', label: 'Guía de remisión electrónica (EG)' },
    { value: 'GR', label: 'Guía de remisión (GR)' },
    { value: 'FA', label: 'Factura' },
    { value: 'BV', label: 'Boleta de venta' },
  ];

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      socioNegocio: ['', Validators.required],
      tipoDocumento: ['EG', Validators.required],
      documento: ['', Validators.required],
      fechaDocumento: ['', Validators.required],
      serie: ['', Validators.required],
      numeroCorrelativo: ['', Validators.required],
      pesoBrutoKg: [null, [Validators.required, Validators.min(0)]],
      pesoNetoKg: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    if (this.data) {
      // Modo edición
      this.titulo = 'Editar documento relacionado';
      this.form.patchValue({
        socioNegocio: this.data.socioNegocio,
        tipoDocumento: this.data.tipoDocumento,
        documento: this.data.documento,
        fechaDocumento: this.toDateInputValue(this.data.fechaDocumento),
        serie: this.data.serie,
        numeroCorrelativo: this.data.numeroCorrelativo,
        pesoBrutoKg: this.data.pesoBrutoKg,
        pesoNetoKg: this.data.pesoNetoKg,
      });
    }
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

    const numeroDocumento = `${(raw.serie || '').trim()}-${(
      raw.numeroCorrelativo || ''
    ).trim()}`;

    const result: PesadaDocumentoModel = {
      id: this.data?.id,
      socioNegocio: raw.socioNegocio,
      tipoDocumento: raw.tipoDocumento,
      documento: raw.documento,
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
