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

  // IDs para backend
  idBusinessPartners?: number;
  idDocumentTypes?: number;

  // UI
  socioNegocio: string;
  tipoDocumento: string; // code
  documento: string;     // name
  fechaDocumento: string;

  serie: string;               // ✅ máx 4
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

  /** Id de operación para consultar socios y tipos de documento */
  @Input() operationId!: number;

  form: FormGroup;
  isSaving = false;

  businessPartners: BusinessPartner[] = [];
  documentTypes: DocumentType[] = [];

  loadingPartners = false;
  loadingDocs = false;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal,
    private weighingService: WeighingService
  ) {
    this.form = this.fb.group({
      idBusinessPartners: [null, Validators.required],
      idDocumentTypes: [null, Validators.required],

      fechaDocumento: ['', Validators.required],

      // ✅ serie: requerido, min 1, max 4
      serie: [
        '',
        [Validators.required, Validators.minLength(1), Validators.maxLength(4)],
      ],

      numeroCorrelativo: ['', Validators.required],
      pesoBrutoKg: [null, [Validators.required, Validators.min(0)]],
      pesoNetoKg: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.loadBusinessPartnersAndDocuments();

    if (this.data) {
      this.titulo = 'Editar documento relacionado';
      this.form.patchValue({
        idBusinessPartners: this.data.idBusinessPartners ?? null,
        idDocumentTypes: this.data.idDocumentTypes ?? null,
        fechaDocumento: this.toDateInputValue(this.data.fechaDocumento),
        serie: this.data.serie ?? '',
        numeroCorrelativo: this.data.numeroCorrelativo ?? '',
        pesoBrutoKg: this.data.pesoBrutoKg,
        pesoNetoKg: this.data.pesoNetoKg,
      });
    }
  }

  private loadBusinessPartnersAndDocuments(): void {
    if (!this.operationId) return;

    this.loadingPartners = true;
    this.weighingService
      .getBusinessPartnersByOperation(this.operationId)
      .subscribe({
        next: (res: any) => {
          const data = (res?.data ?? res) as BusinessPartner[] | null;
          this.businessPartners = Array.isArray(data) ? data : [];
          this.tryPatchIdsFromNamesIfEdit();
        },
        error: (err) => console.error('Error loading business partners', err),
        complete: () => (this.loadingPartners = false),
      });

    this.loadingDocs = true;
    this.weighingService.getDocumentTypesByOperation(this.operationId).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const flatDocs: DocumentType[] = [];

        if (Array.isArray(data)) {
          if (data.length && data[0]?.code && data[0]?.name) {
            flatDocs.push(...(data as DocumentType[]));
          } else {
            for (const op of data) {
              const docs = op?.documents;
              if (Array.isArray(docs)) {
                for (const d of docs) flatDocs.push(d);
              }
            }
          }
        }

        const seen = new Set<number>();
        this.documentTypes = flatDocs.filter((d: any) => {
          const id = Number(d?.id || 0);
          if (!id) return false;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        this.tryPatchIdsFromNamesIfEdit();
      },
      error: (err) => console.error('Error loading document types', err),
      complete: () => (this.loadingDocs = false),
    });
  }

  private tryPatchIdsFromNamesIfEdit(): void {
    if (!this.data) return;

    const currentBP = this.form.get('idBusinessPartners')?.value;
    const currentDT = this.form.get('idDocumentTypes')?.value;

    if (!currentBP && this.data.socioNegocio && this.businessPartners.length) {
      const name = String(this.data.socioNegocio).trim().toLowerCase();
      const bp = this.businessPartners.find(
        (x: any) => String(x.companyName || '').trim().toLowerCase() === name
      );
      if (bp?.id) {
        this.form.patchValue({ idBusinessPartners: bp.id }, { emitEvent: false });
      }
    }

    if (!currentDT && this.documentTypes.length) {
      const code = String(this.data.tipoDocumento || '').trim().toLowerCase();
      const nm = String(this.data.documento || '').trim().toLowerCase();

      const byCode = this.documentTypes.find(
        (x: any) => String(x.code || '').trim().toLowerCase() === code
      );
      const byName = this.documentTypes.find(
        (x: any) => String(x.name || '').trim().toLowerCase() === nm
      );

      const found = byCode ?? byName;
      if (found?.id) {
        this.form.patchValue({ idDocumentTypes: found.id }, { emitEvent: false });
      }
    }
  }

  /** ✅ Forzar mayúsculas y cortar a 4 */
  onSerieInput(): void {
    const ctrl = this.form.get('serie');
    const v = String(ctrl?.value || '')
      .toUpperCase()
      .replace(/\s+/g, '');
    const cut = v.substring(0, 4);
    if (cut !== ctrl?.value) ctrl?.setValue(cut, { emitEvent: false });
  }

  private toDateInputValue(value: string | Date): string {
    if (!value) return '';
    if (value instanceof Date) return value.toISOString().substring(0, 10);
    return String(value).substring(0, 10);
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

    const idBusinessPartners = Number(raw.idBusinessPartners);
    const idDocumentTypes = Number(raw.idDocumentTypes);

    const bp = this.businessPartners.find((x: any) => Number(x.id) === idBusinessPartners);
    const dt = this.documentTypes.find((x: any) => Number(x.id) === idDocumentTypes);

    if (!bp || !dt) {
      this.isSaving = false;
      this.form.markAllAsTouched();
      return;
    }

    const serie = String(raw.serie || '').trim().toUpperCase().substring(0, 4);
    const numeroCorrelativo = String(raw.numeroCorrelativo || '').trim();
    const numeroDocumento = `${serie}-${numeroCorrelativo}`;

    const result: PesadaDocumentoModel = {
      id: this.data?.id,

      idBusinessPartners,
      idDocumentTypes,

      socioNegocio: bp.companyName,
      tipoDocumento: dt.code,
      documento: dt.name,

      fechaDocumento: raw.fechaDocumento,
      serie,
      numeroCorrelativo,
      numeroDocumento,

      pesoBrutoKg: Number(raw.pesoBrutoKg),
      pesoNetoKg: Number(raw.pesoNetoKg),
    };

    this.activeModal.close(result);
  }

  get f() {
    return this.form.controls as any;
  }
}
