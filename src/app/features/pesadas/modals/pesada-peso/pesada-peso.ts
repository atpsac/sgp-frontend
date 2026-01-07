import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

import { ProductByOperation } from '../../../../core/services/weighing.service';
import { PrintNodeAdapterService } from '../../../../core/printcode/services/printnode-adapter.service';

export interface PesadaPesoOption {
  id: number | string;
  nombre: string;
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

interface PesadaDetalleResult {
  id?: number;
  producto: string;
  balanza: string;
  pesoBrutoKg: number;
  taraTotalKg: number;
  pesoNetoKg: number;
  observaciones: string;
  tieneTara: boolean;
  estado: string;
  taras: TaraItemLight[];

  productoId?: number | string;
  balanzaId?: number | string;
}

type PrintNodeStatusUI = 'VALIDANDO' | 'CONECTADO' | 'DESCONECTADO' | 'ERROR';

type ScaleConfig = {
  id: string | number;
  nombre: string;

  apiKey: string;
  computerId: number;
  deviceName: string;
  deviceNum: number;

  enabled: boolean;
};

@Component({
  selector: 'app-pesada-peso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-peso.html',
  styleUrl: './pesada-peso.scss',
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

  private destroy$ = new Subject<void>();

  // ========= opciones =========
  productoOptions: PesadaPesoOption[] = [];
  balanzaOptions: PesadaPesoOption[] = [];
  private scales: ScaleConfig[] = [];
  private scalesById = new Map<string | number, ScaleConfig>();

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

  // ✅ Solo aceptamos status/lecturas cuando el usuario inicia pesada
  private weighingStarted = false;

  private lastErrorShownAt = 0;

  private readonly API_KEY = 'LWv4BzHIRmydcxcp5n-KK8lNV-bT4AuKBbkMt8yxOGE';

  ngOnInit(): void {
    this.existingPesada = this.data?.pesada ?? null;

    // ✅ 1) construir form primero
    this.buildForm();
    this.form.get('PesoBruto')?.disable({ emitEvent: false });

    // ✅ 2) cortar sesión previa
    this.safeDisconnect();
    this.weighingStarted = false;
    this.statusUI = 'DESCONECTADO';
    this.statusRaw = 'init';
    this.processing = false;

    // ✅ 3) reset visor
    this.resetWeighingState();

    // ============ productos ============
    const productosRaw: Array<ProductByOperation | string> = this.data?.productos ?? [];
    this.productoOptions = this.mapProductosToOptions(productosRaw);

    // ============ balanzas ============
    const fromData: ScaleConfig[] = Array.isArray(this.data?.balanzasConfig)
      ? this.data.balanzasConfig
      : [];

    const fallback: ScaleConfig[] = [
      {
        id: 'REAL_COM3',
        nombre: 'COM3 Precix Weight 8513',
        apiKey: this.API_KEY,
        computerId: 709782,
        deviceName: 'COM3 Precix Weight 8513',
        deviceNum: 0,
        enabled: true,
      },
      {
        id: 'TEST_999',
        nombre: '999 - BALANZA DE PRUEBA (NO VÁLIDA)',
        apiKey: this.API_KEY,
        computerId: 999999,
        deviceName: 'TEST-SCALE',
        deviceNum: 99,
        enabled: false,
      },
    ];

    this.scales = (fromData.length ? fromData : fallback).map((s) => ({
      ...s,
      apiKey: s.apiKey || this.API_KEY,
    }));

    this.scalesById.clear();
    this.scales.forEach((s) => this.scalesById.set(s.id, s));
    this.balanzaOptions = this.scales.map((s) => ({ id: s.id, nombre: s.nombre }));

    // ✅ precargar si edición
    const productoInit =
      this.existingPesada?.productoId ??
      this.matchOptionIdByName(this.productoOptions, this.existingPesada?.producto) ??
      null;

    const balanzaInit =
      this.existingPesada?.balanzaId ??
      this.matchOptionIdByName(this.balanzaOptions, this.existingPesada?.balanza) ??
      null;

    this.form.patchValue(
      {
        ProductoId: productoInit,
        BalanzaId: balanzaInit,
        PesoBruto: 0,
        Observaciones: this.existingPesada?.observaciones ?? '',
      },
      { emitEvent: false }
    );

    // ✅ cambios de balanza: NO iniciar pesada
    this.form
      .get('BalanzaId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((id) => this.onBalanzaChange(id));

    // ✅ escuchar servicio (pero ignorar si no se inició pesada)
    this.svc.status$.pipe(takeUntil(this.destroy$)).subscribe((st) => this.applyStatus(st));
    this.svc.reading$.pipe(takeUntil(this.destroy$)).subscribe((r) => this.applyReading(r));
    this.svc.error$.pipe(takeUntil(this.destroy$)).subscribe((err) => this.applyError(err));

    // queda desconectado hasta “Iniciar”
    this.statusUI = 'DESCONECTADO';
    this.processing = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.safeDisconnect();
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

  /**
   * ✅ SOLO INICIA.
   * ❌ Ya NO se permite detener desde el botón (queda bloqueado al conectar).
   */
  async startWeighing(): Promise<void> {
    if (this.processing || this.loading || this.loadingData) return;

    // si ya conectó, no hacemos nada (botón quedará disabled)
    if (this.statusUI === 'CONECTADO') return;

    const balanzaId = this.form.get('BalanzaId')?.value;

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

    this.weighingStarted = true;
    await this.kickoffForSelectedScale(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.canSave()) return;

    this.loading = true;

    const value = this.form.getRawValue();

    const productoOpt = this.productoOptions.find((p) => p.id === value.ProductoId);
    const balanzaOpt = this.balanzaOptions.find((b) => b.id === value.BalanzaId);

    const pesoBruto = Number(this.lastStableKg || 0);

    const prev = this.existingPesada || {};
    const taras: TaraItemLight[] = Array.isArray(prev.taras) ? prev.taras : [];

    const taraTotalKg =
      typeof prev.taraTotalKg === 'number'
        ? prev.taraTotalKg
        : taras.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;

    const pesoNetoKg = pesoBruto - taraTotalKg;

    const result: PesadaDetalleResult = {
      id: prev.id,
      producto: productoOpt?.nombre || prev.producto || '',
      balanza: balanzaOpt?.nombre || prev.balanza || '',
      productoId: value.ProductoId,
      balanzaId: value.BalanzaId,
      pesoBrutoKg: pesoBruto,
      taraTotalKg,
      pesoNetoKg,
      observaciones: (value.Observaciones || '').toString().trim() || '-',
      tieneTara: taraTotalKg > 0 || !!prev.tieneTara,
      estado: prev.estado || 'EN REGISTRO',
      taras,
    };

    // ✅ al guardar recién desconectamos
    this.safeDisconnect();
    this.weighingStarted = false;

    this.activeModal.close(result);
    this.loading = false;
  }

  // =========================
  // Internals
  // =========================
  private buildForm(): void {
    this.form = this.fb.group({
      ProductoId: [null, Validators.required],
      BalanzaId: [null, Validators.required],
      PesoBruto: [0, [Validators.required, Validators.min(0)]],
      Observaciones: [''],
    });
  }

  private onBalanzaChange(_: any): void {
    // si cambia balanza, reseteamos sesión (igual el select estará bloqueado cuando conecte)
    this.safeDisconnect();
    this.weighingStarted = false;

    this.resetWeighingState();
    this.statusUI = 'DESCONECTADO';
    this.statusRaw = 'selected';
  }

  private async kickoffForSelectedScale(showInvalidAlert: boolean): Promise<void> {
    const id = this.form.get('BalanzaId')?.value;
    const cfg = this.scalesById.get(id);

    this.safeDisconnect();

    this.processing = true;
    this.statusUI = 'VALIDANDO';
    this.statusRaw = 'validando';

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
          title: 'Balanza no válida',
          text: 'Esta balanza es de prueba y no está habilitada.',
          confirmButtonText: 'OK',
        });
      }
      return;
    }

    try {
      this.svc.setConfig({
        apiKey: cfg.apiKey,
        computerId: Number(cfg.computerId),
        deviceName: cfg.deviceName,
        deviceNum: Number(cfg.deviceNum),
      });

      await this.svc.validateDevice();
      this.svc.connect();
    } catch (e: any) {
      this.processing = false;
      this.statusUI = 'ERROR';
      this.statusRaw = 'validate/connect error';
      this.weighingStarted = false;
      this.showErrorOnce(e?.message || 'No se pudo validar/conectar la balanza.');
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
    if (!this.weighingStarted) return;
    if (!r) return;

    this.processing = false;

    const kg = Number(r.weightKg ?? 0);
    const stable = !!r.isStable;

    this.pesoActual = isFinite(kg) ? kg : 0;
    this.isStable = stable;

    if (stable) this.lastStableKg = this.pesoActual;

    this.form.get('PesoBruto')?.setValue(this.pesoActual, { emitEvent: false });
  }

  private applyError(err: any): void {
    if (!this.weighingStarted) return;
    if (!err) return;

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
    this.form.get('PesoBruto')?.markAsPristine();
    this.form.get('PesoBruto')?.markAsUntouched();
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
      case 'VALIDANDO':
        return 'VALIDANDO';
      case 'CONECTADO':
        return 'CONECTADO';
      case 'DESCONECTADO':
        return 'DESCONECTADO';
      case 'ERROR':
        return 'ERROR';
      default:
        return '—';
    }
  }

  get statusClass(): string {
    switch (this.statusUI) {
      case 'VALIDANDO':
        return 'badge--info';
      case 'CONECTADO':
        return 'badge--ok';
      case 'DESCONECTADO':
        return 'badge--bad';
      case 'ERROR':
        return 'badge--warn';
      default:
        return 'badge--muted';
    }
  }

  get currentScaleName(): string {
    const id = this.form.get('BalanzaId')?.value;
    return this.balanzaOptions.find((x) => x.id === id)?.nombre || '';
  }

  get lockScaleSelect(): boolean {
    // ✅ cuando conecte (o validando/procesando) ya no se puede cambiar balanza
    return this.processing || this.statusUI === 'CONECTADO' || this.loading || this.loadingData;
  }

  /**
   * ✅ Botón “Iniciar pesada”
   * - Requiere balanza
   * - Se deshabilita mientras procesa
   * - ✅ Y se deshabilita cuando ya está CONECTADO (NO se permite “detener”)
   */
  get startBtnDisabled(): boolean {
    const hasScale = !!this.form.get('BalanzaId')?.value;
    if (!hasScale) return true;
    if (this.statusUI === 'CONECTADO') return true; // 🔒 clave del requerimiento
    return this.processing || this.loading || this.loadingData;
  }

  get startBtnText(): string {
    return this.statusUI === 'CONECTADO' ? 'Pesada en curso' : 'Iniciar pesada';
  }

  get startBtnIcon(): string {
    return this.statusUI === 'CONECTADO' ? 'lock' : 'play_circle';
  }

  get f() {
    return this.form.controls;
  }

  private mapProductosToOptions(raw: Array<ProductByOperation | string>): PesadaPesoOption[] {
    if (!Array.isArray(raw) || raw.length === 0) {
      return [
        { id: 'CACAO EN GRANO HÚMEDO', nombre: 'CACAO EN GRANO HÚMEDO' },
        { id: 'CACAO EN GRANO SECO', nombre: 'CACAO EN GRANO SECO' },
      ];
    }

    const first = raw[0] as any;

    if (typeof first === 'object' && first && 'productId' in first) {
      return (raw as ProductByOperation[]).map((p) => ({ id: p.productId, nombre: p.productName }));
    }

    return (raw as string[]).map((nombre) => ({ id: nombre, nombre }));
  }

  private matchOptionIdByName(options: PesadaPesoOption[], name: any): any {
    const n = String(name || '').trim().toLowerCase();
    const found = options.find((o) => String(o.nombre || '').trim().toLowerCase() === n);
    return found?.id ?? null;
  }
}
