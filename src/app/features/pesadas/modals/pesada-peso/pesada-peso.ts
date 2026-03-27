/* pesada-peso.ts (CORREGIDO)
   ✅ NO envía idProduct cuando NO aplica (SOLO PALLET o cuando no hay productos para ese tipo)
   ✅ Productos se cargan recién al seleccionar Tipo de pesada
*/

import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';

import {
  ProductByOperation,
  OperationalScale,
  WeighingService,
} from '../../../../core/services/weighing.service';
import { PrintNodeAdapterService } from '../../../../core/printcode/services/printnode-adapter.service';

export interface PesadaPesoOption {
  id: number | string;
  nombre: string;
  code?: string;
}

interface TaraItemLight {
  id?: number;
  empaque?: string;
  codigo?: string;
  descripcion?: string;
  taraPorEmpaqueKg?: number;
  cantidad?: number;
  taraKg?: number;
}

type PrintNodeStatusUI = 'VALIDANDO' | 'CONECTADO' | 'DESCONECTADO' | 'ERROR';

type ScaleConfig = {
  id: string | number;
  nombre: string;

  apiKey: string;
  computerId: number;
  deviceName: string;
  deviceNum: number;

  statusId?: number | null;
  statusName?: string;
  enabled: boolean;
};

type WeighingType = {
  weighingTypeId: number;
  name: string;
  code: string;
  description?: string;
  isTest?: boolean;
};

@Component({
  selector: 'app-pesada-peso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-peso.html',
  styleUrls: ['./pesada-peso.scss'],
})
export class PesadaPeso implements OnInit, OnDestroy {
  @Input() operationId: number | null = null;
  @Input() data: any;

  @Input() title = 'Agregar pesada';
  @Input() subtitle =
    'Completa los datos de la pesada. El peso bruto se mostrará en el visor de la derecha.';

  private fb = inject(FormBuilder);
  public activeModal = inject(NgbActiveModal);

  private svc = inject(PrintNodeAdapterService);
  private weighingSvc = inject(WeighingService);

  private destroy$ = new Subject<void>();

  // ========= ticket / stable uuid =========
  headerTicketId: number | null = null;
  stableWeightId = '';

  // ========= opciones =========
  productoOptions: PesadaPesoOption[] = [];
  balanzaOptions: PesadaPesoOption[] = [];

  weighingTypeOptions: WeighingType[] = [];
  loadingWeighingTypes = false;

  // ✅ productos se cargan recién al seleccionar tipo
  loadingProductos = false;
  hasProductsForType = true;

  public scales: ScaleConfig[] = [];
  public scalesById = new Map<string | number, ScaleConfig>();

  private existingPesada: any | null = null;

  // ========= form =========
  form!: FormGroup;
  loading = false;
  loadingData = false;

  // ========= visor =========
  pesoActual = 0;
  isStable = false;
  lastStableKg = 0;

  statusUI: PrintNodeStatusUI = 'DESCONECTADO';
  statusRaw = '';
  processing = false;

  private weighingStarted = false;
  private lastErrorShownAt = 0;

  private readonly API_KEY = 'LWv4BzHIRmydcxcp5n-KK8lNV-bT4AuKBbkMt8yxOGE';

  // ✅ para edición: guardar selección hasta que recién se carguen productos
  private pendingProductoInit: any = null;

  async ngOnInit(): Promise<void> {
    this.existingPesada = this.data?.pesada ?? null;

    // 1) headerTicketId
    this.headerTicketId = this.resolveHeaderTicketId();

    // 2) UUID estable al abrir modal
    this.stableWeightId = this.createUUID();

    // 3) construir form
    this.buildForm();
    this.form.get('PesoBruto')?.disable({ emitEvent: false });

    // 4) cortar sesión previa
    this.safeDisconnect();
    this.weighingStarted = false;
    this.statusUI = 'DESCONECTADO';
    this.statusRaw = 'init';
    this.processing = false;

    // 5) reset visor
    this.resetWeighingState();

    // ✅ NO cargar productos aquí. Guardamos init si es edición.
    this.pendingProductoInit = this.existingPesada?.productoId ?? null;

    this.form.patchValue(
      {
        ProductoId: null, // ✅ vacío al inicio
        BalanzaId: null,
        WeighingTypeId: null,
        PesoBruto: 0,
        BalanzaEstado: '—',
        Observaciones: this.existingPesada?.observaciones ?? '',
      },
      { emitEvent: false }
    );

    // escuchar cambios de balanza
    this.form
      .get('BalanzaId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => void this.onBalanzaChange(id));

    // ✅ escuchar cambios de tipo de pesada => cargar productos recién aquí
    this.form
      .get('WeighingTypeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => void this.onWeighingTypeChange(id, true));

    // escuchar PrintNode (pero ignorar si no se inició pesada)
    this.svc.status$.pipe(takeUntil(this.destroy$)).subscribe((st) => this.applyStatus(st));
    this.svc.reading$.pipe(takeUntil(this.destroy$)).subscribe((r) => this.applyReading(r));
    this.svc.error$.pipe(takeUntil(this.destroy$)).subscribe((err) => this.applyError(err));

    // cargar balanzas
    await this.loadOperationalScales();

    // si edición: setear balanza y cargar tipos
    const balanzaInit =
      this.existingPesada?.balanzaId ??
      this.matchOptionIdByName(this.balanzaOptions, this.existingPesada?.balanza) ??
      null;

    if (balanzaInit != null) {
      this.form.patchValue({ BalanzaId: balanzaInit }, { emitEvent: false });
      this.syncBalanzaEstado(balanzaInit);
      await this.loadWeighingTypesForScale(Number(balanzaInit), true);

      // ✅ forzar carga de productos según el tipo ya seteado (emitEvent fue false)
      const wtId = Number(this.form.get('WeighingTypeId')?.value || 0);
      if (wtId) {
        await this.onWeighingTypeChange(wtId, true);
      }
    } else {
      // sin balanza: producto deshabilitado
      this.disableProducto(true);
    }

    if (!this.headerTicketId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Ticket no encontrado',
        text: 'No se encontró headerTicketId (cabecera). Cierra y vuelve a abrir el flujo de Ticket.',
        confirmButtonText: 'OK',
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.safeDisconnect();
  }

  // =========================
  // Getters UI
  // =========================
  get selectedWeighingType(): WeighingType | null {
    const id = Number(this.form?.get('WeighingTypeId')?.value ?? 0);
    return this.weighingTypeOptions.find((x) => Number(x.weighingTypeId) === id) ?? null;
  }

  get isSoloPallet(): boolean {
    const wt = this.selectedWeighingType;
    if (!wt) return false;

    const name = String(wt.name || '').toUpperCase();
    const code = String(wt.code || '').toUpperCase();

    if (name.includes('SOLO')) return true;
    if (name.includes('PALLET') && !name.includes('PRODUCT')) return true;

    if (code === 'PAL' || code === 'PLT' || code === 'P') return true;

    return false;
  }

  // ✅ Si realmente aplica seleccionar/enviar producto
  get requiresProduct(): boolean {
    if (this.isSoloPallet) return false;
    if (!this.hasProductsForType) return false;
    return (this.productoOptions?.length || 0) > 0;
  }

  get scaleStatusLabel(): string {
    return String(this.form?.get('BalanzaEstado')?.value ?? '—') || '—';
  }

  get scaleStatusClass(): string {
    const up = this.scaleStatusLabel.toUpperCase();
    if (up.includes('OPERAT')) return 'uxf-status--ok';
    if (up.includes('CALIB')) return 'uxf-status--warn';
    if (up.includes('MANT')) return 'uxf-status--warn';
    if (up.includes('FUERA') || up.includes('INOP') || up.includes('ERROR')) return 'uxf-status--bad';
    return 'uxf-status--muted';
  }

  // =========================
  // UI Actions
  // =========================
  close(): void {
    if (this.loading || this.processing) return;
    this.safeDisconnect();
    this.weighingStarted = false;
    this.activeModal.dismiss();
  }

  async startWeighing(): Promise<void> {
    if (this.processing || this.loading || this.loadingData || this.loadingWeighingTypes || this.loadingProductos) return;
    if (this.statusUI === 'CONECTADO') return;

    const balanzaId = Number(this.form.get('BalanzaId')?.value || 0);
    const weighingTypeId = Number(this.form.get('WeighingTypeId')?.value || 0);

    if (!balanzaId) {
      this.form.get('BalanzaId')?.markAsTouched();
      await Swal.fire({
        icon: 'warning',
        title: 'Selecciona una balanza',
        text: 'Debes seleccionar una balanza antes de iniciar la pesada.',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (!weighingTypeId) {
      this.form.get('WeighingTypeId')?.markAsTouched();
      await Swal.fire({
        icon: 'warning',
        title: 'Selecciona un tipo de pesada',
        text: 'Debes seleccionar un tipo de pesada antes de iniciar.',
        confirmButtonText: 'OK',
      });
      return;
    }

    if (!this.headerTicketId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Ticket inválido',
        text: 'No se encontró el headerTicketId para esta pesada.',
        confirmButtonText: 'OK',
      });
      return;
    }

    this.weighingStarted = true;
    await this.kickoffForSelectedScale(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.canSave()) return;

    if (!this.headerTicketId) {
      await Swal.fire({
        icon: 'error',
        title: 'No hay ticket',
        text: 'No se encontró el headerTicketId para registrar la pesada.',
        confirmButtonText: 'OK',
      });
      return;
    }

    // ✅ validación extra: si requiere producto, asegúrate que sea válido
    if (this.requiresProduct) {
      const pid = Number(this.form.get('ProductoId')?.value || 0);
      if (!pid) {
        this.form.get('ProductoId')?.markAsTouched();
        await Swal.fire({
          icon: 'warning',
          title: 'Selecciona un producto',
          text: 'Este tipo de pesada requiere seleccionar un producto.',
          confirmButtonText: 'OK',
        });
        return;
      }
    }

    this.loading = true;

    try {
      const value = this.form.getRawValue();

      const balanzaCfg = this.scalesById.get(value.BalanzaId);
      const productoOpt = this.productoOptions.find(
        (p) => String(p.id) === String(value.ProductoId)
      );

      const pesoBruto = Number(this.lastStableKg || 0);

      const idScale = Number(value.BalanzaId);
      const idWeighingType = Number(value.WeighingTypeId);

      // ✅ PAYLOAD: NO ENVÍES idProduct si NO aplica (ni null)
      const payload: any = {
        idScale,
        idWeighingType,
        idStableWeight: this.stableWeightId,
        measurementWeight: pesoBruto,
        observations: (value.Observaciones || '').toString().trim() || null,
      };

      if (this.requiresProduct) {
        payload.idProduct = Number(value.ProductoId);
      }
      // 👆 Si NO requiere producto, no se agrega la propiedad idProduct

      const created = await firstValueFrom(
        this.weighingSvc.createMeasurement(this.headerTicketId, payload)
      );

      const prev = this.existingPesada || {};
      const taras: TaraItemLight[] = Array.isArray(prev.taras) ? prev.taras : [];

      const taraTotalKg =
        typeof prev.taraTotalKg === 'number'
          ? prev.taraTotalKg
          : taras.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;

      const pesoNetoKg = pesoBruto - taraTotalKg;

      const detailId =
        Number((created as any)?.idTicketDetail ?? (created as any)?.idScaleTicketDetails ?? 0) ||
        undefined;

      const tipoText = this.selectedWeighingType?.name || '—';

      const productoTexto = this.requiresProduct
        ? (productoOpt?.nombre || prev.producto || '')
        : 'SOLO PALLET';

      const result: any = {
        id: detailId,
        scaleTicketDetailsId: detailId,

        tipoPesada: this.isSoloPallet
          ? 'SOLO_PALLET'
          : (tipoText.toUpperCase().includes('PALLET') ? 'PALLET_CON_PRODUCTO' : 'OTRO'),
        tipoPesadaLabel: tipoText,

        producto: productoTexto,
        balanza: balanzaCfg?.nombre || '',
        productoId: this.requiresProduct ? value.ProductoId : null,
        balanzaId: value.BalanzaId,

        idWeighingType,
        BalanzaEstado: this.scaleStatusLabel,

        pesoBrutoKg: pesoBruto,
        taraTotalKg,
        pesoNetoKg,

        observaciones: (value.Observaciones || '').toString().trim() || '-',
        tieneTara: taraTotalKg > 0 || !!prev.tieneTara,
        estado: prev.estado || 'EN REGISTRO',
        taras,
      };

      this.safeDisconnect();
      this.weighingStarted = false;
      this.activeModal.close(result);
    } catch (e: any) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar',
        text: e?.message || 'Ocurrió un error registrando la pesada.',
        confirmButtonText: 'OK',
      });
    } finally {
      this.loading = false;
    }
  }

  // =========================
  // Internals
  // =========================
  private buildForm(): void {
    this.form = this.fb.group({
      BalanzaId: [null, Validators.required],
      WeighingTypeId: [null, Validators.required],

      // ✅ inicia deshabilitado y sin required
      ProductoId: [{ value: null, disabled: true }],

      BalanzaEstado: ['—', Validators.required],
      PesoBruto: [0, [Validators.required, Validators.min(0)]],
      Observaciones: [''],
    });
  }

  private async onWeighingTypeChange(rawId: any, resetSelection: boolean): Promise<void> {
    const weighingTypeId = Number(rawId || 0);

    // cada cambio: limpiar productos/selección
    this.productoOptions = [];
    this.hasProductsForType = true;

    // si no hay tipo, o es solo pallet => producto no aplica
    if (!weighingTypeId || this.isSoloPallet) {
      this.disableProducto(true);
      return;
    }

    // cargar productos recién aquí
    await this.loadProductsForWeighingType(weighingTypeId, resetSelection);
  }

  private disableProducto(clearValue: boolean): void {
    const ctrl = this.form.get('ProductoId');
    if (!ctrl) return;

    ctrl.disable({ emitEvent: false });
    ctrl.clearValidators();
    if (clearValue) ctrl.setValue(null, { emitEvent: false });
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private enableProductoRequired(): void {
    const ctrl = this.form.get('ProductoId');
    if (!ctrl) return;

    ctrl.enable({ emitEvent: false });
    ctrl.setValidators([Validators.required]);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  private async loadProductsForWeighingType(
    weighingTypeId: number,
    resetSelection: boolean
  ): Promise<void> {
    this.loadingProductos = true;
    this.disableProducto(true); // mientras carga

    try {
      let payload: any = null;
      const anySvc: any = this.weighingSvc as any;

      // ✅ si tienes endpoint por operación + tipo (ideal)
      if (typeof anySvc.getProductsByOperation === 'function') {
        payload = await firstValueFrom(
          anySvc.getProductsByOperation(Number(this.operationId || 0), weighingTypeId)
        );
      } else if (typeof anySvc.getProductsByWeighingType === 'function') {
        payload = await firstValueFrom(
          anySvc.getProductsByWeighingType(Number(this.operationId || 0), weighingTypeId)
        );
      } else {
        // fallback: lo que venga en data (pero recién al seleccionar tipo)
        payload = this.data?.productos ?? this.data?.products ?? this.data ?? null;
      }

      const mapped = this.mapProductosPayloadToOptions(payload);
      this.hasProductsForType = mapped.hasProducts;
      this.productoOptions = mapped.options;

      // si backend dice que no aplica producto o viene vacío
      if (!this.hasProductsForType || this.productoOptions.length === 0) {
        this.disableProducto(true);
        return;
      }

      // habilitar + required
      this.enableProductoRequired();

      if (resetSelection) {
        const initId = this.pendingProductoInit;
        const ok =
          initId != null &&
          this.productoOptions.some((o) => String(o.id) === String(initId));

        this.form.patchValue({ ProductoId: ok ? initId : null }, { emitEvent: false });
        this.pendingProductoInit = null;
      }
    } catch (e: any) {
      this.productoOptions = [];
      this.hasProductsForType = true;
      this.disableProducto(true);

      await Swal.fire({
        icon: 'error',
        title: 'Error cargando productos',
        text: e?.message || 'No se pudo obtener la lista de productos.',
        confirmButtonText: 'OK',
      });
    } finally {
      this.loadingProductos = false;
    }
  }

  private async onBalanzaChange(id: any): Promise<void> {
    this.safeDisconnect();
    this.weighingStarted = false;

    this.resetWeighingState();
    this.statusUI = 'DESCONECTADO';
    this.statusRaw = 'selected';

    // al cambiar balanza, limpiar productos
    this.productoOptions = [];
    this.hasProductsForType = true;
    this.disableProducto(true);

    const scalesId = Number(id || 0);
    if (!scalesId) {
      this.form.patchValue(
        { BalanzaEstado: '—', WeighingTypeId: null, ProductoId: null },
        { emitEvent: false }
      );
      this.weighingTypeOptions = [];
      return;
    }

    this.syncBalanzaEstado(scalesId);
    await this.loadWeighingTypesForScale(scalesId, true);

    // ✅ como WeighingTypeId se setea con emitEvent:false, forzamos carga productos
    const wtId = Number(this.form.get('WeighingTypeId')?.value || 0);
    if (wtId) await this.onWeighingTypeChange(wtId, true);
  }

  private syncBalanzaEstado(scaleId: any): void {
    const cfg = this.scalesById.get(scaleId);
    const status = String(cfg?.statusName ?? '—') || '—';
    this.form.patchValue({ BalanzaEstado: status }, { emitEvent: false });
  }

  private async loadWeighingTypesForScale(scalesId: number, resetSelection: boolean): Promise<void> {
    this.loadingWeighingTypes = true;
    try {
      const list = await firstValueFrom(this.weighingSvc.getWeighingTypes(scalesId));
      this.weighingTypeOptions = Array.isArray(list) ? list : [];

      if (resetSelection) {
        const firstId = this.weighingTypeOptions[0]?.weighingTypeId ?? null;
        this.form.patchValue({ WeighingTypeId: firstId }, { emitEvent: false });
      }
    } catch (e: any) {
      this.weighingTypeOptions = [];
      this.form.patchValue({ WeighingTypeId: null }, { emitEvent: false });

      await Swal.fire({
        icon: 'error',
        title: 'Error cargando tipos de pesada',
        text: e?.message || 'No se pudo obtener la lista de tipos de pesada.',
        confirmButtonText: 'OK',
      });
    } finally {
      this.loadingWeighingTypes = false;
    }
  }

  private async kickoffForSelectedScale(showInvalidAlert: boolean): Promise<void> {
    const id = this.form.get('BalanzaId')?.value;
    const cfg = this.scalesById.get(id);

    const scalesId = Number(this.form.get('BalanzaId')?.value || 0);
    const weighingTypeId = Number(this.form.get('WeighingTypeId')?.value || 0);

    this.safeDisconnect();

    this.processing = true;
    this.statusUI = 'VALIDANDO';
    this.statusRaw = 'initialize';

    if (!cfg) {
      this.processing = false;
      this.statusUI = 'ERROR';
      this.statusRaw = 'no-config';
      this.weighingStarted = false;
      return;
    }

    if (!cfg.enabled) {
      this.processing = false;
      this.statusUI = 'DESCONECTADO';
      this.statusRaw = 'disabled';
      this.isStable = false;
      this.lastStableKg = 0;
      this.weighingStarted = false;

      if (showInvalidAlert) {
        await Swal.fire({
          icon: 'error',
          title: 'Balanza no operativa',
          text: `Estado actual: ${cfg.statusName || '—'}. Solo se permite OPERATIVO.`,
          confirmButtonText: 'OK',
        });
      }
      return;
    }

    try {
      const device: any = await firstValueFrom(
        this.weighingSvc.initializeScale(scalesId, weighingTypeId)
      );

      this.svc.setConfig({
        apiKey: cfg.apiKey,
        computerId: Number(device?.idComputer ?? cfg.computerId),
        deviceName: String(device?.deviceName ?? cfg.deviceName),
        deviceNum: Number(device?.deviceNumber ?? cfg.deviceNum),
      });

      await this.svc.validateDevice();
      this.svc.connect();
      this.statusRaw = 'connecting';
    } catch (e: any) {
      this.processing = false;
      this.statusUI = 'ERROR';
      this.statusRaw = 'initialize/validate/connect error';
      this.weighingStarted = false;
      this.showErrorOnce(e?.message || 'No se pudo inicializar/validar/conectar la balanza.');
    }
  }

  private applyStatus(st: any): void {
    if (!this.weighingStarted) {
      this.statusUI = 'DESCONECTADO';
      this.processing = false;
      this.statusRaw = 'idle';
      return;
    }

    const raw = String(st ?? '');
    this.statusRaw = raw;
    const up = raw.toUpperCase();

    if (up.includes('VALID')) {
      this.statusUI = 'VALIDANDO';
      this.processing = true;
      return;
    }

    if (up.includes('CONNECT')) {
      this.statusUI = 'CONECTADO';
      this.processing = false;
      return;
    }

    if (up.includes('DISCONNECT')) {
      this.statusUI = 'DESCONECTADO';
      this.processing = false;
      this.isStable = false;
      return;
    }
  }

  private applyReading(r: any): void {
    if (!this.weighingStarted || !r) return;

    this.processing = false;

    const kg = Number(r.weightKg ?? 0);
    const stable = !!r.isStable;

    this.pesoActual = isFinite(kg) ? kg : 0;
    this.isStable = stable;

    if (stable) this.lastStableKg = this.pesoActual;

    this.form.get('PesoBruto')?.setValue(this.pesoActual, { emitEvent: false });
  }

  private applyError(err: any): void {
    if (!this.weighingStarted || !err) return;

    this.processing = false;
    this.statusUI = 'ERROR';
    this.showErrorOnce(err?.message || 'Ocurrió un error con la balanza.');
  }

  private showErrorOnce(message: string): void {
    const now = Date.now();
    if (now - this.lastErrorShownAt < 1200) return;
    this.lastErrorShownAt = now;

    Swal.fire({
      icon: 'error',
      title: 'Error de balanza',
      text: message,
      confirmButtonText: 'OK',
    });
  }

  private resetWeighingState(): void {
    this.pesoActual = 0;
    this.isStable = false;
    this.lastStableKg = 0;
    this.processing = false;

    if (!this.form) return;
    this.form.get('PesoBruto')?.setValue(0, { emitEvent: false });
  }

  private safeDisconnect(): void {
    try {
      this.svc.disconnect();
    } catch {}
  }

  // =========================
  // UI Helpers
  // =========================
  canSave(): boolean {
    return this.statusUI === 'CONECTADO' && this.isStable && this.lastStableKg > 0;
  }

  get statusLabel(): string {
    switch (this.statusUI) {
      case 'VALIDANDO': return 'VALIDANDO';
      case 'CONECTADO': return 'CONECTADO';
      case 'DESCONECTADO': return 'DESCONECTADO';
      case 'ERROR': return 'ERROR';
      default: return '—';
    }
  }

  get statusClass(): string {
    switch (this.statusUI) {
      case 'VALIDANDO': return 'badge--info';
      case 'CONECTADO': return 'badge--ok';
      case 'DESCONECTADO': return 'badge--bad';
      case 'ERROR': return 'badge--warn';
      default: return 'badge--muted';
    }
  }

  get currentScaleName(): string {
    const id = this.form.get('BalanzaId')?.value;
    const cfg = this.scalesById.get(id);
    return cfg ? `${cfg.nombre} - #${cfg.id}` : '';
  }

  get lockScaleSelect(): boolean {
    return this.processing || this.statusUI === 'CONECTADO' || this.loading || this.loadingData;
  }

  get startBtnDisabled(): boolean {
    const hasScale = !!this.form.get('BalanzaId')?.value;
    const hasType = !!this.form.get('WeighingTypeId')?.value;

    if (!hasScale) return true;
    if (!hasType) return true;
    if (!this.headerTicketId) return true;
    if (this.statusUI === 'CONECTADO') return true;

    return this.processing || this.loading || this.loadingData || this.loadingWeighingTypes || this.loadingProductos;
  }

  get startBtnText(): string {
    return this.statusUI === 'CONECTADO' ? 'Pesada en curso' : 'Iniciar pesada';
  }

  get startBtnIcon(): string {
    return this.statusUI === 'CONECTADO' ? 'lock' : 'play_circle';
  }

  get f() {
    return this.form.controls as any;
  }

  private matchOptionIdByName(options: PesadaPesoOption[], name: any): any {
    const n = String(name || '').trim().toLowerCase();
    const found = options.find((o) => String(o.nombre || '').trim().toLowerCase() === n);
    return found?.id ?? null;
  }

  // ✅ parsea múltiples formas (incluyendo tu payload nuevo)
  private mapProductosPayloadToOptions(payload: any): { options: PesadaPesoOption[]; hasProducts: boolean } {
    let hasProducts = true;
    let p = payload;

    // si viene objeto { status, data: [...] }
    if (p && typeof p === 'object' && !Array.isArray(p)) {
      if (Array.isArray(p.data)) p = p.data;
      else if (Array.isArray(p.products)) p = p.products;
    }

    // si viene array con {hasProducts, products}
    if (Array.isArray(p) && p.length > 0) {
      const first = p[0] as any;
      if (first && typeof first === 'object' && 'hasProducts' in first && 'products' in first) {
        hasProducts = !!first.hasProducts;
        p = Array.isArray(first.products) ? first.products : [];
      }
    }

    if (!Array.isArray(p) || p.length === 0) {
      return { options: [], hasProducts };
    }

    const first = p[0] as any;

    // objetos con productId / name
    if (typeof first === 'object' && first) {
      // tu caso: { productId, code, name, description }
      if ('productId' in first) {
        const options = (p as any[]).map((x) => ({
          id: x.productId,
          nombre: String(x.productName ?? x.name ?? '').trim(),
          code: x.code ? String(x.code) : undefined,
        })).filter(o => o.id != null && !!o.nombre);
        return { options, hasProducts };
      }
    }

    // strings
    const options = (p as any[]).map((n) => ({ id: n, nombre: String(n) }));
    return { options, hasProducts };
  }

  // =========================
  // Carga balanzas API
  // =========================
  private async loadOperationalScales(): Promise<void> {
    this.loadingData = true;
    try {
      if (!this.headerTicketId) {
        this.scales = [];
        this.scalesById.clear();
        this.balanzaOptions = [];
        return;
      }

      const list = await firstValueFrom(
        this.weighingSvc.getOperationalScales(this.headerTicketId)
      );

      const mapped: ScaleConfig[] = (list || []).map((s: OperationalScale) => {
        const rawStatus = (s as any)?.status ?? null;
        const statusName = String(rawStatus?.name ?? '—').toUpperCase().trim();
        const enabled = statusName === 'OPERATIVO';

        return {
          id: (s as any)?.id,
          nombre: String((s as any)?.deviceName ?? ''),
          apiKey: this.API_KEY,
          computerId: Number((s as any)?.idComputer ?? 0),
          deviceName: String((s as any)?.deviceName ?? ''),
          deviceNum: Number((s as any)?.deviceNumber ?? 0),
          statusId: rawStatus?.id ?? null,
          statusName,
          enabled,
        };
      });

      this.scales = mapped;
      this.scalesById.clear();
      this.scales.forEach((s) => this.scalesById.set(s.id, s));

      this.balanzaOptions = this.scales.map((s) => ({
        id: s.id,
        nombre: `${s.nombre} - #${s.id}`,
      }));
    } catch (e: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error cargando balanzas',
        text: e?.message || 'No se pudo obtener la lista de balanzas.',
        confirmButtonText: 'OK',
      });
      this.scales = [];
      this.scalesById.clear();
      this.balanzaOptions = [];
    } finally {
      this.loadingData = false;
    }
  }

  // =========================
  // ticketId + uuid helpers
  // =========================
  private resolveHeaderTicketId(): number | null {
    const fromInput = Number(
      this.data?.headerTicketId ??
        this.data?.ticketId ??
        this.data?.scaleTicketId ??
        this.data?.idScaleTicket ??
        null
    );

    if (Number.isFinite(fromInput) && fromInput > 0) return fromInput;

    try {
      const raw = localStorage.getItem('sgp_ticket_balanza_draft');
      if (!raw) return null;

      const obj = JSON.parse(raw);
      const id = Number(
        obj?.headerTicketId ??
          obj?.headerTicketIdSaved ??
          obj?.headerTicket?.id ??
          null
      );
      if (Number.isFinite(id) && id > 0) return id;
    } catch {}

    return null;
  }

  private createUUID(): string {
    const g: any = globalThis as any;
    const uuid = g?.crypto?.randomUUID?.();
    if (uuid) return String(uuid);

    const s4 = () =>
      Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);

    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  }
}
