import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, finalize, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { WeighingService } from '../../../../core/services/weighing.service';

export interface TaraItem {
  id?: number;
  empaque: string;
  codigo: string;
  descripcion: string;
  taraPorEmpaqueKg: number;
  cantidad: number;
  taraKg: number;

  packagingTypesId?: number;
}

export interface PackagingType {
  id: number;
  code: string;
  name: string;
  unitTareWeight: string | number;
  description?: string;
  unitOrigin?: string; // ✅ nuevo (ej: "UNIT")
}

export interface CreateTarePayload {
  idScaleTicketDetails: number;
  packagingTypesId: number;
  packageQuantity: number;
}

@Component({
  selector: 'app-pesada-tara-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-tara-add.html',
  styleUrl: './pesada-tara-add.scss',
})
export class PesadaTaraAdd implements OnInit, OnDestroy {
  @Input() title = 'Agregar tara';
  @Input() subtitle = 'Completa los datos del empaque y su tara para esta pesada.';

  /** ✅ lo manda el padre (OBLIGATORIO para listar empaques y crear tara) */
  @Input() scaleTicketDetailsId: number | null = null;

  /** opcional: edición (si luego implementas update) */
  @Input() initialData: TaraItem | null = null;

  private fb = inject(FormBuilder);
  public activeModal = inject(NgbActiveModal);
  private weighingSvc = inject(WeighingService);

  private destroy$ = new Subject<void>();

  form!: FormGroup;

  isEdit = false;

  loading = false;
  loadingCatalog = false;

  packagingTypes: PackagingType[] = [];

  ngOnInit(): void {
    this.buildForm();
    this.isEdit = !!this.initialData;

    // ✅ cargar catálogo con el NUEVO endpoint (requiere scaleTicketDetailsId)
    this.loadPackagingTypes();

    // listeners
    this.form
      .get('packagingTypesId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.applyPackagingType(id));

    this.form
      .get('cantidad')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalcularTara());

    this.form
      .get('taraPorEmpaqueKg')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.recalcularTara());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      packagingTypesId: [null, Validators.required],

      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],

      taraPorEmpaqueKg: [0, [Validators.required, Validators.min(0)]],

      cantidad: [1, [Validators.required, Validators.min(1)]],

      taraKg: [{ value: 0, disabled: true }],
    });
  }

  private loadPackagingTypes(): void {
    const detailId = Number(this.scaleTicketDetailsId ?? 0);

    if (!detailId || detailId <= 0) {
      // No podemos listar sin el id del detalle
      this.packagingTypes = [];
      this.form.patchValue(
        {
          packagingTypesId: null,
          codigo: '',
          descripcion: '',
          taraPorEmpaqueKg: 0,
          cantidad: 1,
          taraKg: 0,
        },
        { emitEvent: false }
      );

      Swal.fire({
        icon: 'warning',
        title: 'Falta id del detalle',
        text: 'No se recibió scaleTicketDetailsId para listar tipos de empaque.',
        confirmButtonText: 'OK',
      });

      return;
    }

    this.loadingCatalog = true;

    // ✅ NUEVO: getPackagingTypes(scaleTicketDetailId)
    this.weighingSvc
      .getPackagingTypes(detailId)
      .pipe(finalize(() => (this.loadingCatalog = false)))
      .subscribe({
        next: (rows) => {
          // Seguridad: normalizar campos por si el servicio no los mapeó
          this.packagingTypes = (Array.isArray(rows) ? rows : []).map((x: any) => ({
            id: Number(x?.id ?? 0),
            code: String(x?.code ?? ''),
            name: String(x?.name ?? ''),
            unitTareWeight: x?.unitTareWeight ?? 0,
            description: x?.description ?? '',
            unitOrigin: x?.unitOrigin ?? null,
          }));

          // ✅ iniciar SIN selección
          this.form.patchValue(
            {
              packagingTypesId: null,
              codigo: '',
              descripcion: '',
              taraPorEmpaqueKg: 0,
              cantidad: 1,
              taraKg: 0,
            },
            { emitEvent: false }
          );

          // si viene edición
          if (this.initialData) {
            this.patchInitialData();
          }

          this.recalcularTara();
        },
        error: async (err) => {
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.message || 'No se pudo obtener la lista de empaques.',
            confirmButtonText: 'OK',
          });
        },
      });
  }

  private patchInitialData(): void {
    const d = this.initialData!;
    const found = this.packagingTypes.find(
      (x) => x.id === d.packagingTypesId || x.code === d.codigo || x.name === d.empaque
    );

    this.form.patchValue(
      {
        packagingTypesId: found ? found.id : null,
        codigo: d.codigo ?? '',
        descripcion: d.descripcion ?? '',
        taraPorEmpaqueKg: Number(d.taraPorEmpaqueKg ?? 0),
        cantidad: Number(d.cantidad ?? 1),
      },
      { emitEvent: false }
    );

    this.recalcularTara();
  }

  private applyPackagingType(id: any): void {
    const item = this.packagingTypes.find((p) => String(p.id) === String(id));

    if (!item) {
      this.form.patchValue(
        {
          codigo: '',
          descripcion: '',
          taraPorEmpaqueKg: 0,
        },
        { emitEvent: false }
      );
      this.recalcularTara();
      return;
    }

    const unit = Number(item.unitTareWeight) || 0;

    this.form.patchValue(
      {
        codigo: item.code,
        descripcion: (item.description || item.name || '').toString(),
        taraPorEmpaqueKg: unit,
      },
      { emitEvent: false }
    );

    this.recalcularTara();
  }

  private recalcularTara(): void {
    const raw = this.form.getRawValue();

    const unit = Number(raw.taraPorEmpaqueKg) || 0;
    const qty = Number(raw.cantidad) || 0;

    const total = unit * qty;

    this.form.patchValue({ taraKg: total }, { emitEvent: false });
  }

  close(): void {
    if (this.loading) return;
    this.activeModal.dismiss();
  }

  save(): void {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.scaleTicketDetailsId || this.scaleTicketDetailsId <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta id del detalle',
        text: 'No se recibió scaleTicketDetailsId para registrar la tara.',
        confirmButtonText: 'OK',
      });
      return;
    }

    const raw = this.form.getRawValue();
    const packagingTypesId = Number(raw.packagingTypesId);

    if (!packagingTypesId) {
      this.form.get('packagingTypesId')?.markAsTouched();
      return;
    }

    const qty = Math.max(1, Number(raw.cantidad) || 1);

    const payload: CreateTarePayload = {
      idScaleTicketDetails: this.scaleTicketDetailsId,
      packagingTypesId,
      packageQuantity: qty,
    };

    this.loading = true;

    this.weighingSvc
      .createTare(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (apiRow: any) => {
          const pt = this.packagingTypes.find((p) => p.id === packagingTypesId);

          const createdId =
            Number(
              apiRow?.id ??
                apiRow?.idScaleTicketDetailsPackagingTypes ??
                apiRow?.idTicketDetailPackaging ??
                0
            ) || undefined;

          const taraUnit = Number(raw.taraPorEmpaqueKg) || 0;
          const taraKg = taraUnit * qty;

          const result: TaraItem = {
            id: createdId,
            packagingTypesId,

            empaque: pt?.name ?? '',
            codigo: raw.codigo,
            descripcion: raw.descripcion,
            taraPorEmpaqueKg: taraUnit,
            cantidad: qty,
            taraKg,
          };

          this.activeModal.close(result);
        },
        error: async (_err) => {
          await Swal.fire({
            icon: 'warning',
            title: 'No se pudo registrar',
            text: 'Registro duplicado',
            confirmButtonText: 'OK',
          });
        },
      });
  }

  get f() {
    return this.form.controls as any;
  }
}
