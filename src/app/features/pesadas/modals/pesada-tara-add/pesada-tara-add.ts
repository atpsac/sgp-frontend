import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import {
  Subject,
  finalize,
  takeUntil,
  debounceTime,
  firstValueFrom,
} from 'rxjs';
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
  tareOrigin?: string; // UNIT | ESTIMATED | SCALE
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
  @Input() subtitle =
    'Completa los datos del empaque y su tara para esta pesada.';

  /** ✅ obligatorio */
  @Input() scaleTicketDetailsId: number | null = null;

  /** opcional edición */
  @Input() initialData: TaraItem | null = null;

  private fb = inject(FormBuilder);
  public activeModal = inject(NgbActiveModal);
  private weighingSvc = inject(WeighingService);

  private destroy$ = new Subject<void>();

  form!: FormGroup;
  isEdit = false;

  loading = false;
  loadingCatalog = false;
  loadingResolve = false;

  packagingTypes: PackagingType[] = [];

  selectedPackaging: PackagingType | null = null;
  isEstimatedOrigin = false;

  private resolve$ = new Subject<void>();
  private lastResolveErrorAt = 0;

  // ✅ LocalStorage draft
  private readonly DRAFT_KEY = 'sgp_ticket_balanza_draft';

  ngOnInit(): void {
    this.buildForm();
    this.isEdit = !!this.initialData;

    this.loadPackagingTypes();

    this.form
      .get('packagingTypesId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => {
        this.applyPackagingType(id);
        this.queueResolvePreview();
      });

    this.form
      .get('cantidad')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.queueResolvePreview());

    this.form
      .get('taraPorEmpaqueKg')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isEstimatedOrigin) this.queueResolvePreview();
      });

    this.resolve$
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => void this.resolvePackagingTare(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================
  // Helpers números (FIX PRECISIÓN)
  // =========================
  private num(v: any, fallback = 0): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  /** ✅ redondea a 2 decimales evitando 0.6000000000000001 */
  private round2(v: any): number {
    const n = this.num(v, 0);
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private int(v: any, fallback = 0): number {
    const n = parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) ? n : fallback;
  }

  // =========================
  // LocalStorage draft helpers
  // =========================
  private readDraft(): any | null {
    try {
      const raw = localStorage.getItem(this.DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private writeDraft(draft: any): void {
    try {
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // sin romper flujo
    }
  }

  /**
   * ✅ Inserta la tara en draft.pesadas[].taras del detalle actual
   * y recalcula taraTotalKg / pesoNetoKg / tieneTara.
   */
  private persistTaraToDraft(tara: TaraItem): void {
    const detailId = this.num(this.scaleTicketDetailsId, 0);
    if (!detailId) return;

    const draft = this.readDraft();
    if (!draft) return;

    if (!Array.isArray(draft.pesadas)) draft.pesadas = [];

    const idx = draft.pesadas.findIndex((p: any) => {
      const idTicketDetail = this.num(p?.idTicketDetail ?? p?.id, 0);
      return idTicketDetail === detailId;
    });

    if (idx < 0) return;

    const pesada = draft.pesadas[idx];

    if (!Array.isArray(pesada.taras)) pesada.taras = [];

    // ✅ evitar duplicados por id si existe, si no por packagingTypesId+codigo
    const taraId = this.num((tara as any)?.id, 0);
    let replaceIndex = -1;

    if (taraId) {
      replaceIndex = pesada.taras.findIndex(
        (t: any) => this.num(t?.id, 0) === taraId
      );
    } else {
      const keyA = `${this.num(tara.packagingTypesId, 0)}|${String(
        tara.codigo ?? ''
      ).trim()}`;
      replaceIndex = pesada.taras.findIndex((t: any) => {
        const keyB = `${this.num(t?.packagingTypesId, 0)}|${String(
          t?.codigo ?? ''
        ).trim()}`;
        return keyA === keyB;
      });
    }

    if (replaceIndex >= 0) pesada.taras[replaceIndex] = tara;
    else pesada.taras.push(tara);

    // ✅ recalcular totales
    const totalTara = this.round2(
      (pesada.taras as any[]).reduce(
        (acc, t) => acc + this.num(t?.taraKg, 0),
        0
      )
    );

    pesada.taraTotalKg = totalTara;

    const bruto = this.num(pesada?.pesoBrutoKg, 0);
    pesada.pesoNetoKg = this.round2(bruto - totalTara);

    pesada.tieneTara = totalTara > 0;

    // opcional: marcar requiereTara si ya está en flujo
    if (typeof pesada.requiereTara === 'boolean') {
      pesada.requiereTara = true;
    }

    this.writeDraft(draft);
  }

  // =========================
  // Form / Catalog
  // =========================
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
    const detailId = this.num(this.scaleTicketDetailsId, 0);

    if (!detailId || detailId <= 0) {
      this.packagingTypes = [];
      this.resetFormSoft();

      Swal.fire({
        icon: 'warning',
        title: 'Falta id del detalle',
        text: 'No se recibió scaleTicketDetailsId para listar tipos de empaque.',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.loadingCatalog = true;

    this.weighingSvc
      .getPackagingTypes(detailId)
      .pipe(finalize(() => (this.loadingCatalog = false)))
      .subscribe({
        next: (rows: any) => {
          const list = Array.isArray(rows) ? rows : [];

          this.packagingTypes = list.map((x: any) => ({
            id: this.num(x?.id, 0),
            code: String(x?.code ?? ''),
            name: String(x?.name ?? ''),
            unitTareWeight: x?.unitTareWeight ?? 0,
            description: x?.description ?? '',
            tareOrigin: x?.tareOrigin ?? x?.unitOrigin ?? null,
          }));

          this.resetFormSoft();

          if (this.initialData) {
            this.patchInitialData();
            this.queueResolvePreview();
          }
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

  private resetFormSoft(): void {
    this.selectedPackaging = null;
    this.isEstimatedOrigin = false;

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
        taraPorEmpaqueKg: this.round2(d.taraPorEmpaqueKg ?? 0),
        cantidad: Math.max(1, this.int(d.cantidad ?? 1, 1)),
        taraKg: this.round2(d.taraKg ?? 0),
      },
      { emitEvent: false }
    );

    if (found) {
      this.selectedPackaging = found;
      this.isEstimatedOrigin = this.getOrigin(found) === 'ESTIMATED';
    }
  }

  private applyPackagingType(id: any): void {
    const item = this.packagingTypes.find((p) => String(p.id) === String(id));
    this.selectedPackaging = item ?? null;

    if (!item) {
      this.isEstimatedOrigin = false;
      this.form.patchValue(
        { codigo: '', descripcion: '', taraPorEmpaqueKg: 0, taraKg: 0 },
        { emitEvent: false }
      );
      return;
    }

    const origin = this.getOrigin(item);
    this.isEstimatedOrigin = origin === 'ESTIMATED';

    const unit = this.round2(item.unitTareWeight);

    this.form.patchValue(
      {
        codigo: item.code,
        descripcion: (item.description || item.name || '').toString(),
        taraPorEmpaqueKg: unit,
      },
      { emitEvent: false }
    );

    const qty = Math.max(1, this.int(this.form.get('cantidad')?.value ?? 1, 1));
    this.form.patchValue({ taraKg: this.round2(unit * qty) }, { emitEvent: false });
  }

  private getOrigin(pt: PackagingType): 'UNIT' | 'ESTIMATED' | 'SCALE' | 'OTHER' {
    const o = String(pt?.tareOrigin ?? '').toUpperCase().trim();
    if (o === 'UNIT') return 'UNIT';
    if (o === 'ESTIMATED') return 'ESTIMATED';
    if (o === 'SCALE') return 'SCALE';
    return 'OTHER';
  }

  private queueResolvePreview(): void {
    if (this.loadingCatalog || this.loading || this.loadingResolve) return;

    const detailId = this.num(this.scaleTicketDetailsId, 0);
    const ptId = this.num(this.form.get('packagingTypesId')?.value, 0);
    const qty = Math.max(1, this.int(this.form.get('cantidad')?.value ?? 1, 1));

    if (!detailId || !ptId || qty <= 0) return;

    this.resolve$.next();
  }

  private resolvePackagingTare(showErrors: boolean): void {
    const detailId = this.num(this.scaleTicketDetailsId, 0);
    const ptId = this.num(this.form.get('packagingTypesId')?.value, 0);
    const qty = Math.max(1, this.int(this.form.get('cantidad')?.value ?? 1, 1));

    if (!detailId || !ptId || qty <= 0) return;

    const pt = this.packagingTypes.find((x) => Number(x.id) === ptId);
    if (!pt) return;

    const origin = this.getOrigin(pt);

    const payload: any = {
      packagingTypeId: ptId,
      quantity: qty,
    };

    if (origin === 'ESTIMATED') {
      payload.estimatedUnitTareWeight = this.round2(this.form.get('taraPorEmpaqueKg')?.value ?? 0);
    }

    this.loadingResolve = true;

    this.weighingSvc
      .resolvePackagingTare(detailId, payload)
      .pipe(finalize(() => (this.loadingResolve = false)))
      .subscribe({
        next: (apiRow: any) => {
          const unitFromApi = this.num(apiRow?.unitTareWeight, NaN);
          const totalFromApi = this.num(apiRow?.subTotalTareWeight, NaN);

          const currentUnit = this.round2(this.form.get('taraPorEmpaqueKg')?.value ?? 0);

          const safeUnit = Number.isFinite(unitFromApi)
            ? this.round2(unitFromApi)
            : (origin === 'ESTIMATED' ? currentUnit : this.round2(pt.unitTareWeight));

          const safeTotal = Number.isFinite(totalFromApi)
            ? this.round2(totalFromApi)
            : this.round2(safeUnit * qty);

          this.form.patchValue(
            { taraPorEmpaqueKg: safeUnit, taraKg: safeTotal },
            { emitEvent: false }
          );
        },
        error: async (err) => {
          const now = Date.now();
          if (!showErrors && now - this.lastResolveErrorAt < 1200) return;
          this.lastResolveErrorAt = now;

          if (showErrors) {
            await Swal.fire({
              icon: 'error',
              title: 'No se pudo resolver la tara',
              text: err?.message || 'Ocurrió un error resolviendo la tara del empaque.',
              confirmButtonText: 'OK',
            });
          }
        },
      });
  }

  private async resolvePackagingTareOnce(showErrors: boolean): Promise<void> {
    const detailId = this.num(this.scaleTicketDetailsId, 0);
    const ptId = this.num(this.form.get('packagingTypesId')?.value, 0);
    const qty = Math.max(1, this.int(this.form.get('cantidad')?.value ?? 1, 1));

    if (!detailId || !ptId || qty <= 0) return;

    const pt = this.packagingTypes.find((x) => Number(x.id) === ptId);
    if (!pt) return;

    const origin = this.getOrigin(pt);

    const payload: any = {
      packagingTypeId: ptId,
      quantity: qty,
    };

    if (origin === 'ESTIMATED') {
      payload.estimatedUnitTareWeight = this.round2(this.form.get('taraPorEmpaqueKg')?.value ?? 0);
    }

    this.loadingResolve = true;

    try {
      const apiRow: any = await firstValueFrom(
        this.weighingSvc.resolvePackagingTare(detailId, payload)
      );

      const unitFromApi = this.num(apiRow?.unitTareWeight, NaN);
      const totalFromApi = this.num(apiRow?.subTotalTareWeight, NaN);

      const currentUnit = this.round2(this.form.get('taraPorEmpaqueKg')?.value ?? 0);

      const safeUnit = Number.isFinite(unitFromApi)
        ? this.round2(unitFromApi)
        : (origin === 'ESTIMATED' ? currentUnit : this.round2(pt.unitTareWeight));

      const safeTotal = Number.isFinite(totalFromApi)
        ? this.round2(totalFromApi)
        : this.round2(safeUnit * qty);

      this.form.patchValue(
        { taraPorEmpaqueKg: safeUnit, taraKg: safeTotal },
        { emitEvent: false }
      );
    } catch (err: any) {
      if (showErrors) {
        await Swal.fire({
          icon: 'error',
          title: 'No se pudo resolver la tara',
          text: err?.message || 'Ocurrió un error resolviendo la tara del empaque.',
          confirmButtonText: 'OK',
        });
      }
    } finally {
      this.loadingResolve = false;
    }
  }

  close(): void {
    if (this.loading) return;
    this.activeModal.dismiss();
  }

  /**
   * ✅ GUARDAR:
   * 1) resolve final
   * 2) createTare(payload con 2 decimales)
   * 3) guardar en localStorage draft.pesadas[].taras[]
   * 4) cerrar modal con TaraItem
   */
  async save(): Promise<void> {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const detailId = this.num(this.scaleTicketDetailsId, 0);
    if (!detailId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta id del detalle',
        text: 'No se recibió scaleTicketDetailsId para registrar la tara.',
        confirmButtonText: 'OK',
      });
      return;
    }

    const ptId = this.num(this.form.get('packagingTypesId')?.value, 0);
    const pt = this.packagingTypes.find((x) => Number(x.id) === ptId);
    if (!ptId || !pt) {
      this.form.get('packagingTypesId')?.markAsTouched();
      return;
    }

    this.loading = true;

    try {
      await this.resolvePackagingTareOnce(true);

      const raw = this.form.getRawValue();
      const qty = Math.max(1, this.int(raw.cantidad ?? 1, 1));

      const unitTareWeight = this.round2(raw.taraPorEmpaqueKg ?? 0);
      const subTotalTareWeight = this.round2(raw.taraKg ?? (unitTareWeight * qty));

      // ✅ payload EXACTO
      const payload: any = {
        idScaleTicketDetails: detailId,
        packagingTypesId: ptId,
        packageQuantity: qty,
        unitTareWeight,
        subTotalTareWeight,
      };

      const apiRow: any = await firstValueFrom(this.weighingSvc.createTare(payload));

      const createdId =
        this.num(
          apiRow?.id ??
            apiRow?.idScaleTicketDetailsPackagingTypes ??
            apiRow?.idTicketDetailPackaging ??
            0,
          0
        ) || undefined;

      const result: TaraItem = {
        id: createdId,
        packagingTypesId: ptId,
        empaque: pt?.name ?? '',
        codigo: raw.codigo,
        descripcion: raw.descripcion,
        taraPorEmpaqueKg: unitTareWeight,
        cantidad: qty,
        taraKg: subTotalTareWeight,
      };

      // ✅ Guardar también en localStorage draft
      this.persistTaraToDraft(result);

      this.activeModal.close(result);
    } catch (_e: any) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo registrar',
        text: 'Ocurrió un error registrando la tara.',
        confirmButtonText: 'OK',
      });
    } finally {
      this.loading = false;
    }
  }

  get f() {
    return this.form.controls as any;
  }
}
