import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

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

  // datos PrintNode
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

  // ========= opciones =========
  productoOptions: PesadaPesoOption[] = [];
  balanzaOptions: PesadaPesoOption[] = [];
  private scales: ScaleConfig[] = [];
  private scalesById = new Map<string | number, ScaleConfig>();

  private existingPesada: any | null = null;

  // ========= form =========
  form!: FormGroup;
  loading = false; // guardando
  loadingData = false;

  // ========= visor =========
  pesoActual = 0;
  isStable = false;
  lastStableKg = 0;

  statusUI: PrintNodeStatusUI = 'DESCONECTADO';
  statusRaw = '';
  processing = false; // spinner en visor (validando/conectando/esperando lectura)
  deviceLine = ''; // "Device: ..."

  private lastErrorShownAt = 0;

  // ====== API KEY principal (tu key) ======
  private readonly API_KEY = 'LWv4BzHIRmydcxcp5n-KK8lNV-bT4AuKBbkMt8yxOGE';

  ngOnInit(): void {
    this.existingPesada = this.data?.pesada ?? null;

    // ============ productos ============
    const productosRaw: Array<ProductByOperation | string> = this.data?.productos ?? [];
    this.productoOptions = this.mapProductosToOptions(productosRaw);

    // ============ balanzas (configs) ============
    // Si mañana traes esto desde API, pásalo por data.balanzasConfig
    const fromData: ScaleConfig[] = Array.isArray(this.data?.balanzasConfig) ? this.data.balanzasConfig : [];

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

    // ============ form ============
    this.buildForm();

    // valores iniciales
    const productoInit =
      this.existingPesada?.productoId ??
      this.matchOptionIdByName(this.productoOptions, this.existingPesada?.producto) ??
      this.productoOptions[0]?.id ??
      null;

    const balanzaInit =
      this.existingPesada?.balanzaId ??
      this.matchOptionIdByName(this.balanzaOptions, this.existingPesada?.balanza) ??
      this.balanzaOptions[0]?.id ??
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

    // Bloquear input de PesoBruto (SIEMPRE)
    this.form.get('PesoBruto')?.disable({ emitEvent: false });

    // escuchar cambios de balanza: reset + reconectar
    this.form.get('BalanzaId')?.valueChanges.subscribe((id) => {
      this.onBalanzaChange(id);
    });

    // escuchar servicio (status/reading/error)
    this.svc.status$.subscribe((st) => this.applyStatus(st));
    this.svc.reading$.subscribe((r) => this.applyReading(r));
    this.svc.error$.subscribe((err) => this.applyError(err));

    // iniciar con la balanza seleccionada
    // (auto validar + conectar)
    this.kickoffForSelectedScale(false);
  }

  ngOnDestroy(): void {
    this.safeDisconnect();
  }

  // =========================
  // UI Actions
  // =========================
  close(): void {
    if (this.loading) return;
    this.safeDisconnect();
    this.activeModal.dismiss();
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // no permitir guardar si no está estable / conectado
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

    this.safeDisconnect();
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

  private async onBalanzaChange(id: any): Promise<void> {
    // reset necesarios y reconectar
    this.resetWeighingState();
    await this.kickoffForSelectedScale(true);
  }

  private async kickoffForSelectedScale(showInvalidAlert: boolean): Promise<void> {
    const id = this.form.get('BalanzaId')?.value;
    const cfg = this.scalesById.get(id);

    this.safeDisconnect();
    this.processing = true;
    this.statusUI = 'VALIDANDO';
    this.statusRaw = 'validando';
    this.deviceLine = '';

    if (!cfg) {
      this.processing = false;
      this.statusUI = 'ERROR';
      return;
    }

    // Línea de dispositivo (siempre visible)
    this.deviceLine = `Device: ${cfg.deviceName} · #${cfg.deviceNum} · Computer: ${cfg.computerId}`;

    if (!cfg.enabled) {
      this.processing = false;
      this.statusUI = 'DESCONECTADO';
      this.statusRaw = 'disabled';
      this.isStable = false;
      this.lastStableKg = 0;

      // Si quieren alert al cambiar, se muestra
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
      // set config + validar + conectar (automático)
      this.svc.setConfig({
        apiKey: cfg.apiKey,
        computerId: Number(cfg.computerId),
        deviceName: cfg.deviceName,
        deviceNum: Number(cfg.deviceNum),
      });

      this.statusUI = 'VALIDANDO';
      await this.svc.validateDevice();

      // conectar
      this.svc.connect();
      // la lectura llegará por reading$
    } catch (e: any) {
      this.processing = false;
      this.statusUI = 'ERROR';
      this.statusRaw = 'validate/connect error';
      this.showErrorOnce(e?.message || 'No se pudo validar/conectar la balanza.');
    }
  }

  private applyStatus(st: any): void {
    const raw = String(st ?? '');
    this.statusRaw = raw;

    // Ajusta aquí si tu servicio usa otros textos
    const up = raw.toUpperCase();

    if (up.includes('VALID')) {
      this.statusUI = 'VALIDANDO';
      this.processing = true;
      return;
    }

    if (up.includes('CONNECT')) {
      this.statusUI = 'CONECTADO';
      // seguimos en processing hasta recibir lectura
      return;
    }

    if (up.includes('DISCONNECT')) {
      this.statusUI = 'DESCONECTADO';
      this.processing = false;
      this.isStable = false;
      return;
    }

    // fallback
    if (!raw) return;
  }

  private applyReading(r: any): void {
    if (!r) return;

    // ya hay lectura: apagar “Procesando...”
    this.processing = false;

    const kg = Number(r.weightKg ?? 0);
    const stable = !!r.isStable;

    this.pesoActual = isFinite(kg) ? kg : 0;
    this.isStable = stable;

    // si estable, guardamos el último estable (para guardar)
    if (stable) this.lastStableKg = this.pesoActual;

    // siempre reflejar en input (pero está disabled)
    this.form.get('PesoBruto')?.setValue(this.pesoActual, { emitEvent: false });
  }

  private applyError(err: any): void {
    if (!err) return;
    this.processing = false;
    this.statusUI = 'ERROR';
    this.showErrorOnce(err?.message || 'Ocurrió un error con la balanza.');
  }

  private showErrorOnce(message: string): void {
    const now = Date.now();
    // evita spam si el socket manda muchos errores seguidos
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

    this.form.get('PesoBruto')?.setValue(0, { emitEvent: false });
    this.form.get('PesoBruto')?.markAsPristine();
    this.form.get('PesoBruto')?.markAsUntouched();
  }

  private safeDisconnect(): void {
    try {
      this.svc.disconnect();
    } catch {}
  }

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

  get f() {
    return this.form.controls;
  }

  // =========================
  // Helpers productos/balanzas
  // =========================
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
