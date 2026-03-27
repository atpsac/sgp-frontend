import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { Router } from '@angular/router';

import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  WeighingService,
  BuyingStation,
} from '../../../core/services/weighing.service';

import { StepperNav, WizardStep } from './components/stepper-nav/stepper-nav';
import { PasoDatosOperacion } from './components/paso-datos-operacion/paso-datos-operacion';
import { PasoOrigenDestino } from './components/paso-origen-destino/paso-origen-destino';
import { PasoDocumentos } from './components/paso-documentos/paso-documentos';
import { PasoTransporte } from './components/paso-transporte/paso-transporte';
import { PasoDetalleTicket } from './components/paso-detalle-ticket/paso-detalle-ticket';

import { TicketDraftService } from './services/ticket-draft.service';

import { TicketBalanzaPdfService } from '../../../core/pdf/ticket-balanza-pdf.service';
import { TicketBalanzaReport } from '../../../core/models/ticket-balanza-report.model';

/* =========================================================
   MODELOS
   ========================================================= */

export interface DocumentoRelacionado {
  id?: number;
  socioNegocio?: string | null;
  tipoDocumento?: string | null;
  documento?: string | null;
  fechaDocumento?: string | Date | null;
  numeroDocumento?: string | null;
  pesoBrutoKg?: number | null;
  pesoNetoKg?: number | null;

  idBusinessPartners?: number | null;
  idDocumentTypes?: number | null;
  serie?: string | null;
  numeroCorrelativo?: string | null;
}

export interface TaraItem {
  id?: number;
  empaque: string;
  codigo: string;
  descripcion: string;
  taraPorEmpaqueKg: number;
  cantidad: number;
  taraKg: number;
}

export interface PesadaDetalle {
  id?: number;
  idTicketDetail?: number;
  producto: string;
  balanza: string;
  tipoPesadaLabel?: string;

  pesoBrutoKg: number;
  taraTotalKg: number;
  pesoNetoKg: number;
  observaciones: string;

  requiereTara?: boolean;
  tieneTara: boolean;

  estado: string;
  taras: TaraItem[];
}

export interface TotalesPesadas {
  cantidadItems: number;
  totalPesoBruto: number;
  totalTara: number;
  subtotalPesoNeto: number;
  ajusteKg: number;
  diferenciaAjuste: number;
  totalPesoNeto: number;
}

@Component({
  selector: 'app-pesada-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepperNav,
    PasoDatosOperacion,
    PasoOrigenDestino,
    PasoDocumentos,
    PasoTransporte,
    PasoDetalleTicket,
  ],
  templateUrl: './pesada-form.html',
  styleUrls: ['./pesada-form.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PesadaForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  minFechaEmision!: string;
  maxFechaEmision!: string;
  private todayStr!: string;

  currentStep = 1;
  readonly maxStep = 5;
  showValidation = false;

  operationIdSelected: number | null = null;

  /**
   * El hijo PasoDetalleTicket espera string[]
   */
  balanzasMock: string[] = ['Balanza 01', 'Balanza 02', 'Balanza 03'];

  steps: WizardStep[] = [
    {
      id: 1,
      label: 'Datos de operación',
      hint: 'Fecha, operación y sede',
      disabled: false,
      completed: false,
    },
    {
      id: 2,
      label: 'Origen / Destino',
      hint: 'Sede de origen y destino',
      disabled: true,
      completed: false,
    },
    {
      id: 3,
      label: 'Documentos relacionados',
      hint: 'Guías y comprobantes',
      disabled: true,
      completed: false,
    },
    {
      id: 4,
      label: 'Datos del transporte',
      hint: 'Empresa, conductor y vehículo',
      disabled: true,
      completed: false,
    },
    {
      id: 5,
      label: 'Detalle del ticket',
      hint: 'Pesadas y taras',
      disabled: true,
      completed: false,
    },
  ];

  ticketForm: FormGroup;

  originStations: BuyingStation[] = [];
  destinationStations: BuyingStation[] = [];

  documentos: DocumentoRelacionado[] = [];
  pesadas: PesadaDetalle[] = [];

  totalesPesadas: TotalesPesadas = {
    cantidadItems: 0,
    totalPesoBruto: 0,
    totalTara: 0,
    subtotalPesoNeto: 0,
    ajusteKg: 0,
    diferenciaAjuste: 0,
    totalPesoNeto: 0,
  };

  isSavingHeader = false;
  isSavingFull = false;

  headerSaved = false;
  headerTicketId: number | null = null;

  get hasDraft(): boolean {
    return (
      this.headerSaved ||
      this.headerTicketId != null ||
      this.currentStep > 1 ||
      (this.documentos?.length || 0) > 0 ||
      (this.pesadas?.length || 0) > 0
    );
  }

  constructor(
  private fb: FormBuilder,
  public toast: ToastService,
  private weighingService: WeighingService,
  private ticketDraftService: TicketDraftService,
  private pdf: TicketBalanzaPdfService,
  private router: Router
) {
  const today = new Date();
  this.minFechaEmision = this.shiftDateLocal(today, -3);
  this.maxFechaEmision = this.shiftDateLocal(today, 3);
  this.todayStr = this.shiftDateLocal(today, 0);

  this.ticketForm = this.fb.group({
    datosOperacion: this.fb.group({
      fechaEmision: [this.todayStr, Validators.required],
      operacion: [null, Validators.required],
      sedeOperacion: [null, Validators.required],
    }),
    origenDestino: this.fb.group({
      sedeOrigen: [null, Validators.required],
      sedeDestino: [null, Validators.required],
    }),
    transporte: this.fb.group({
      transportista: this.fb.group({
        transportistaId: [null, Validators.required],
        nombre: [{ value: '', disabled: true }],
        tipoDocumento: [{ value: '', disabled: true }],
        numeroDocumento: [{ value: '', disabled: true }],
      }),
      conductor: this.fb.group({
        conductorId: [null, Validators.required],
        nombre: [{ value: '', disabled: true }],
        tipoDocumento: [{ value: '', disabled: true }],
        numeroDocumento: [{ value: '', disabled: true }],
        licenciaConducir: [{ value: '', disabled: true }],
      }),
      vehiculo: this.fb.group({
        vehiculoId: [null, Validators.required],
        trailerId: [null],
      }),
    }),
    detalleTicket: this.fb.group({
      ajusteKg: [0],
    }),
  });
}

  /* =========================================================
     GETTERS
     ========================================================= */

  get datosOperacion(): FormGroup {
    return this.ticketForm.get('datosOperacion') as FormGroup;
  }

  get origenDestino(): FormGroup {
    return this.ticketForm.get('origenDestino') as FormGroup;
  }

  get transporte(): FormGroup {
    return this.ticketForm.get('transporte') as FormGroup;
  }

  get detalleTicket(): FormGroup {
    return this.ticketForm.get('detalleTicket') as FormGroup;
  }

  /* =========================================================
     CICLO DE VIDA
     ========================================================= */

  ngOnInit(): void {
    this.loadDraftFromStorage();
    this.recalcularTotalesPesadas();

    this.datosOperacion
      .get('operacion')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((v) => this.syncOperationIdSelected(v));

    this.datosOperacion.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStepsState();
        this.saveDraftToStorage();
      });

    this.origenDestino.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStepsState();
        this.saveDraftToStorage();
      });

    this.transporte.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateStepsState();
        this.saveDraftToStorage();
      });

    this.detalleTicket.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.recalcularTotalesPesadas();
        this.saveDraftToStorage();
      });

    if (this.headerSaved) {
      this.lockHeaderEdition();
    }

    this.updateStepsState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* =========================================================
     HELPERS FECHA
     ========================================================= */

  private shiftDateLocal(base: Date, days: number): string {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return this.formatLocalDate(d);
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDateDdMmYyyy(yyyyMmDd: string): string {
    const s = String(yyyyMmDd || '').trim();
    if (!s || !s.includes('-')) return s || '—';

    const [y, m, d] = s.split('-', 3);
    return `${d}/${m}/${y}`;
  }

  /* =========================================================
     HANDLERS USADOS POR EL HTML
     ========================================================= */

  onStepChange(stepId: number): void {
    this.goToStep(stepId);
  }

  onOperationChange(value: any): void {
    this.syncOperationIdSelected(value);
    this.saveDraftToStorage();
  }

  private syncOperationIdSelected(raw: any): void {
    const n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
        ? Number(raw)
        : Number(raw?.id ?? raw?.operationId ?? raw?.idOperations ?? raw?.value);

    this.operationIdSelected = Number.isFinite(n) && n > 0 ? n : null;
  }

  async resetDraftConfirm(): Promise<void> {
    if (!this.hasDraft) return;

    const ok = await this.toast.confirm(
      'Se borrará el avance del ticket (borrador local). ¿Deseas continuar?',
      { title: 'Reiniciar ticket', type: 'warning' }
    );

    if (!ok) return;

    this.resetDraftHard();

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Borrador reiniciado.',
      showConfirmButton: false,
      timer: 1600,
    });
  }

  /* =========================================================
     EVENTOS DESDE HIJOS
     ========================================================= */

  onStationsReady(payload: {
    principal: BuyingStation;
    nonPrincipal: BuyingStation[];
    all: BuyingStation[];
  }): void {
    this.destinationStations = payload?.principal ? [payload.principal] : [];
    this.originStations = payload?.nonPrincipal || [];
    this.saveDraftToStorage();
  }

  onDocumentosChange(list: DocumentoRelacionado[]): void {
    if (this.headerSaved) return;

    this.documentos = list || [];
    this.updateStepsState();
    this.saveDraftToStorage();
  }

  onPesadasChange(list: PesadaDetalle[]): void {
    this.pesadas = list || [];
    this.recalcularTotalesPesadas();
    this.updateStepsState();
    this.saveDraftToStorage();
  }

  onChangeAjusteKg(): void {
    this.recalcularTotalesPesadas();
    this.saveDraftToStorage();
  }

  /* =========================================================
     STORAGE
     ========================================================= */

  private saveDraftToStorage(): void {
    const draft = {
      form: this.ticketForm.getRawValue(),
      documentos: this.documentos,
      pesadas: this.pesadas,
      currentStep: this.currentStep,
      headerSaved: this.headerSaved,
      headerTicketId: this.headerTicketId,
      originStations: this.originStations,
      destinationStations: this.destinationStations,
      operationIdSelected: this.operationIdSelected,
    };

    this.ticketDraftService.saveDraft(draft as any);
  }

  private loadDraftFromStorage(): void {
    const draft: any = this.ticketDraftService.loadDraft();
    if (!draft) return;

    try {
      if (draft.form) {
        this.ticketForm.patchValue(draft.form);
      }

      this.documentos = draft.documentos || [];
      this.pesadas = draft.pesadas || [];
      this.currentStep = draft.currentStep || 1;

      this.headerSaved = !!draft.headerSaved;
      this.headerTicketId =
        typeof draft.headerTicketId === 'number' ? draft.headerTicketId : null;

      this.originStations = draft.originStations || [];
      this.destinationStations = draft.destinationStations || [];

      const op =
        draft.operationIdSelected ??
        draft?.form?.datosOperacion?.operacion ??
        this.datosOperacion.get('operacion')?.value;

      this.syncOperationIdSelected(op);

      if (this.headerSaved) {
        this.lockHeaderEdition();
      }
    } catch (error) {
      console.error('Error aplicando borrador de ticket', error);
    }
  }

  private getDraftSnapshot(): any | null {
    this.saveDraftToStorage();
    return this.ticketDraftService.loadDraft();
  }

  private clearDraftStorage(): void {
    const svc: any = this.ticketDraftService as any;

    if (typeof svc.clearDraft === 'function') {
      svc.clearDraft();
    } else {
      this.ticketDraftService.saveDraft(null as any);
    }
  }

  private resetDraftHard(): void {
    this.clearDraftStorage();

    this.headerSaved = false;
    this.headerTicketId = null;
    this.currentStep = 1;
    this.showValidation = false;

    this.operationIdSelected = null;
    this.originStations = [];
    this.destinationStations = [];
    this.documentos = [];
    this.pesadas = [];

    this.ticketForm.enable({ emitEvent: false });

    this.ticketForm.reset(
      {
        datosOperacion: {
          fechaEmision: this.todayStr,
          operacion: null,
          sedeOperacion: null,
        },
        origenDestino: {
          sedeOrigen: null,
          sedeDestino: null,
        },
        transporte: {
          transportista: {
            transportistaId: null,
            nombre: '',
            tipoDocumento: '',
            numeroDocumento: '',
          },
          conductor: {
            conductorId: null,
            nombre: '',
            tipoDocumento: '',
            numeroDocumento: '',
            licenciaConducir: '',
          },
          vehiculo: {
            vehiculoId: null,
            trailerId: null,
          },
        },
        detalleTicket: {
          ajusteKg: 0,
        },
      },
      { emitEvent: false }
    );

    this.recalcularTotalesPesadas();
    this.updateStepsState();
  }

  /* =========================================================
     VALIDACIONES / STEPS
     ========================================================= */

  private ok(ctrl: AbstractControl | null | undefined): boolean {
    if (!ctrl) return false;
    return ctrl.valid || ctrl.disabled;
  }

  private validateUpToStep(step: number): boolean {
    if (step >= 1 && this.datosOperacion.invalid) return false;
    if (step >= 2 && this.origenDestino.invalid) return false;
    if (step >= 3 && (this.documentos?.length || 0) === 0) return false;
    if (step >= 4 && this.transporte.invalid) return false;
    if (step >= 5 && (this.pesadas?.length || 0) === 0) return false;
    return true;
  }

  private updateStepsState(): void {
    const step1Completed = this.ok(this.datosOperacion);
    const step2Completed = this.ok(this.origenDestino);
    const step3Completed = (this.documentos?.length || 0) > 0;
    const step4Completed = this.ok(this.transporte);
    const step5Completed = (this.pesadas?.length || 0) > 0;

    this.steps = this.steps.map((step) => {
      const updated: WizardStep = { ...step };

      switch (step.id) {
        case 1:
          updated.disabled = false;
          updated.completed = step1Completed;
          break;

        case 2:
          updated.disabled = !step1Completed;
          updated.completed = step2Completed;
          break;

        case 3:
          updated.disabled = !(step1Completed && step2Completed);
          updated.completed = step3Completed;
          break;

        case 4:
          updated.disabled = !(step1Completed && step2Completed && step3Completed);
          updated.completed = step4Completed;
          break;

        case 5:
          updated.disabled = !(
            step1Completed &&
            step2Completed &&
            step3Completed &&
            step4Completed &&
            this.headerSaved
          );
          updated.completed = step5Completed;
          break;
      }

      return updated;
    });
  }

  private lockHeaderEdition(): void {
    try {
      this.datosOperacion.disable({ emitEvent: false });
      this.origenDestino.disable({ emitEvent: false });
      this.transporte.disable({ emitEvent: false });
    } catch {}
  }

  private markAllTouched(ctrl: AbstractControl | null): void {
    if (!ctrl) return;

    const anyCtrl = ctrl as any;

    if (typeof anyCtrl.markAllAsTouched === 'function') {
      anyCtrl.markAllAsTouched();
      return;
    }

    ctrl.markAsTouched({ onlySelf: true });

    if (anyCtrl.controls) {
      Object.values(anyCtrl.controls).forEach((c: any) => this.markAllTouched(c));
    }
  }

  prevStep(): void {
    if (this.currentStep <= 1) return;

    this.currentStep = Math.max(1, this.currentStep - 1);
    this.saveDraftToStorage();
  }

  async nextStep(): Promise<void> {
    this.showValidation = true;

    if (this.currentStep === 1) this.markAllTouched(this.datosOperacion);
    if (this.currentStep === 2) this.markAllTouched(this.origenDestino);
    if (this.currentStep === 4) this.markAllTouched(this.transporte);

    const valid = this.validateUpToStep(this.currentStep);
    if (!valid) {
      Swal.fire({
        icon: 'warning',
        title: 'Completa los datos requeridos antes de continuar.',
      });
      return;
    }

    if (this.currentStep === 4 && !this.headerSaved) {
      const ok = await this.confirmAndSaveHeader();
      if (!ok) {
        Swal.fire({
          icon: 'error',
          title: 'No se pudo guardar el encabezado.',
        });
        return;
      }
    }

    const next = this.currentStep + 1;

    if (next === 5 && (!this.headerSaved || !this.headerTicketId)) {
      Swal.fire({
        icon: 'warning',
        title: 'Primero guarda el encabezado (Paso 4).',
      });
      return;
    }

    const stepObj = this.steps.find((s) => s.id === next);
    if (stepObj?.disabled) return;

    this.currentStep = Math.min(this.maxStep, next);
    this.saveDraftToStorage();
  }

  goToStep(stepId: number): void {
    const target = Number(stepId);
    if (!Number.isFinite(target)) return;
    if (target < 1 || target > this.maxStep) return;

    const stepObj = this.steps.find((s) => s.id === target);
    if (stepObj?.disabled) return;

    const validPrev = this.validateUpToStep(target - 1);
    if (!validPrev) {
      this.showValidation = true;
      Swal.fire({
        icon: 'warning',
        title: 'Completa los pasos previos antes de avanzar.',
      });
      return;
    }

    if (target === 5 && (!this.headerSaved || !this.headerTicketId)) {
      Swal.fire({
        icon: 'warning',
        title: 'Primero guarda el encabezado (Paso 4).',
      });
      return;
    }

    this.currentStep = target;
    this.saveDraftToStorage();
  }

  /* =========================================================
     TOTALES
     ========================================================= */

  private round2(n: any): number {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  private recalcularTotalesPesadas(): void {
    const ajusteKg = Number(this.detalleTicket.get('ajusteKg')?.value || 0);

    const cantidadItems = this.pesadas?.length || 0;

    const totalPesoBruto = (this.pesadas || []).reduce(
      (acc, p) => acc + Number(p.pesoBrutoKg || 0),
      0
    );

    const totalTara = (this.pesadas || []).reduce(
      (acc, p) => acc + Number(p.taraTotalKg || 0),
      0
    );

    const subtotalPesoNeto = (this.pesadas || []).reduce(
      (acc, p) => acc + Number(p.pesoNetoKg || 0),
      0
    );

    const totalPesoNeto = subtotalPesoNeto + ajusteKg;
    const diferenciaAjuste = totalPesoNeto - subtotalPesoNeto;

    this.totalesPesadas = {
      cantidadItems,
      totalPesoBruto: this.round2(totalPesoBruto),
      totalTara: this.round2(totalTara),
      subtotalPesoNeto: this.round2(subtotalPesoNeto),
      ajusteKg: this.round2(ajusteKg),
      diferenciaAjuste: this.round2(diferenciaAjuste),
      totalPesoNeto: this.round2(totalPesoNeto),
    };
  }

  /* =========================================================
     GUARDAR CABECERA
     ========================================================= */

  private async confirmAndSaveHeader(): Promise<boolean> {
    if (this.headerSaved) return true;

    const isValid = this.validateUpToStep(4);
    if (!isValid) return false;

    const ok = await this.toast.confirm('¿Desea crear el ticket de balanza?', {
      title: 'Ticket de balanza - Nuevo',
      type: 'success',
    });

    if (!ok) return false;

    try {
      this.isSavingHeader = true;

      const v: any = this.ticketForm.value;

      const payload: any = {
        ticket: {
          idBuyingStations: v.datosOperacion.sedeOperacion,
          idBuyingStationsOrigin: v.origenDestino.sedeOrigen,
          idBuyingStationsDestination: v.origenDestino.sedeDestino,
          idEmployees: null,
          idOperations: v.datosOperacion.operacion,
          idBusinessPartnersCarriers: v.transporte.transportista.transportistaId,
          idBusinessPartnersDrivers: v.transporte.conductor.conductorId,
          idTrucks: v.transporte.vehiculo.vehiculoId,
          idTrailers: v.transporte.vehiculo.trailerId,
          idScaleTicketStatus: 1,
          creationDate: v.datosOperacion.fechaEmision,
        },
        documents: (this.documentos || []).map((d) => ({
          idDocumentTypes: Number(d.idDocumentTypes),
          idBusinessPartners: Number(d.idBusinessPartners),
          documentSerial: String(d.serie || 'SN').trim(),
          documentNumber: String(d.numeroCorrelativo || '0').trim(),
          documentDate: d.fechaDocumento,
          documentGrossWeight: Number(d.pesoBrutoKg || 0),
          documentNetWeight: Number(d.pesoNetoKg || 0),
        })),
      };

      const res: any = await firstValueFrom(
        this.weighingService.createScaleTicketHeader(payload)
      );

      const row = res?.data?.[0] ?? res?.data ?? res;

      const idNum = Number(
        row?.id ?? row?.ticketId ?? row?.idScaleTicket ?? row?.idScaleTickets ?? 0
      );

      this.headerTicketId = Number.isFinite(idNum) && idNum > 0 ? idNum : null;

      if (!this.headerTicketId) {
        throw new Error('No se recibió el ID del ticket creado.');
      }

      this.headerSaved = true;
      this.lockHeaderEdition();
      this.updateStepsState();
      this.saveDraftToStorage();

      return true;
    } catch (err) {
      console.error('Error guardando encabezado', err);
      return false;
    } finally {
      this.isSavingHeader = false;
    }
  }

  /* =========================================================
     CERRAR TICKET EN SERVIDOR
     ========================================================= */

  private async cerrarTicketServidor(ticketId: number): Promise<any> {
    if (!ticketId) {
      throw new Error('No se encontró el ID del ticket para cerrar.');
    }

    const res = await firstValueFrom(
      this.weighingService.closeScaleTicket(ticketId)
    );

    return res ?? null;
  }

  /* =========================================================
     HELPERS PDF
     ========================================================= */

  private assetUrl(path: string): string {
    try {
      return new URL(path, document.baseURI).toString();
    } catch {
      return path;
    }
  }

  private loadImageAsDataUrlCanvas(path: string): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = this.assetUrl(path);
    });
  }

  private safeText(v: any, fallback = '—'): string {
    const s = String(v ?? '').trim();
    return s ? s : fallback;
  }

  private normalizeDate(v: any): string {
    if (!v) return this.todayStr;
    if (typeof v === 'string') return v;

    try {
      const d = new Date(v);
      if (isNaN(d.getTime())) return this.todayStr;
      return this.formatLocalDate(d);
    } catch {
      return this.todayStr;
    }
  }

  private fallbackTaraIfNeeded(p: PesadaDetalle): TaraItem[] {
    const taras = Array.isArray(p?.taras) ? p.taras : [];
    if (taras.length > 0) return taras;

    const tieneTara = !!p?.tieneTara;
    const taraTotal = Number(p?.taraTotalKg ?? 0);

    if (!tieneTara || taraTotal <= 0) return [];

    const unit = 0.2;
    const qty = Math.max(1, Math.round(taraTotal / unit));
    const total = this.round2(unit * qty);

    return [
      {
        empaque: 'SACO PLASTICO CREMA 200GR',
        codigo: 'PCB',
        descripcion:
          'USADO REGULARMENTE PARA EMPACAR MATERIA PRIMA PROVENIENTE DE SEDES DE ACOPIO',
        taraPorEmpaqueKg: unit,
        cantidad: qty,
        taraKg: total,
      },
    ];
  }

  private buildReportFromDraft(
    draft: any,
    qrDataUrl?: string | null
  ): TicketBalanzaReport {
    const form = draft?.form ?? this.ticketForm.getRawValue();
    const documentos: DocumentoRelacionado[] = draft?.documentos ?? this.documentos ?? [];
    const pesadas: PesadaDetalle[] = draft?.pesadas ?? this.pesadas ?? [];

    const fechaEmision = this.normalizeDate(form?.datosOperacion?.fechaEmision);
    const ticketId = String(this.headerTicketId ?? draft?.headerTicketId ?? '—');

    const tr = form?.transporte ?? {};
    const transportista = tr?.transportista ?? {};
    const conductor = tr?.conductor ?? {};

    const report: TicketBalanzaReport = {
      empresa: {
        razonSocial: 'AMAZONAS TRADING PERU S.A.C.',
        ruc: '20521137682',
        direccion:
          'CAL. LOS BRILLANTES URB. LA CAPITANA LOTE S15B MZ C1 LURIGANCHO - LIMA',
      },

      ticket: {
        numeroTicket: ticketId,
        fechaEmision: this.formatDateDdMmYyyy(fechaEmision),
        sedeOperacion: this.safeText(form?.datosOperacion?.sedeOperacion),
        operacion: this.safeText(form?.datosOperacion?.operacion),
        estado: undefined,
        chofer: this.safeText(conductor?.nombre),
        transporte: this.safeText(transportista?.nombre),
      } as any,

      origenDestino: {
        sedeOrigen: this.safeText(form?.origenDestino?.sedeOrigen),
        sedeDestino: this.safeText(form?.origenDestino?.sedeDestino),
      },

      documentos: (documentos || []).map((d, idx) => ({
        item: idx + 1,
        socioNegocio: this.safeText(d?.socioNegocio),
        tipoDoc: this.safeText(d?.tipoDocumento),
        documento: this.safeText(d?.documento),
        fechaDoc: this.formatDateDdMmYyyy(this.normalizeDate(d?.fechaDocumento)),
        numeroDocumento: this.safeText(d?.numeroDocumento),
        pesoBrutoKg: this.round2(d?.pesoBrutoKg ?? 0),
        pesoNetoKg: this.round2(d?.pesoNetoKg ?? 0),
      })),

      transporte: {
        transportista: {
          razonSocial: this.safeText(transportista?.nombre),
          ruc: this.safeText(transportista?.numeroDocumento),
        },
        conductor: {
          nombreCompleto: this.safeText(conductor?.nombre),
          tipoDocumento: this.safeText(conductor?.tipoDocumento),
          numeroDocumento: this.safeText(conductor?.numeroDocumento),
          licencia: this.safeText(conductor?.licenciaConducir),
        },
        vehiculo: {
          placa: this.safeText(tr?.vehiculo?.vehiculoId),
          trailer: this.safeText(tr?.vehiculo?.trailerId),
        },
      },

      resumen: {
        cantidadItems: pesadas.length,
        totalPesoBrutoKg: this.round2(
          pesadas.reduce((a, p) => a + Number(p?.pesoBrutoKg ?? 0), 0)
        ),
        totalTaraKg: this.round2(
          pesadas.reduce((a, p) => a + Number(p?.taraTotalKg ?? 0), 0)
        ),
        subtotalPesoNetoKg: this.round2(
          pesadas.reduce((a, p) => a + Number(p?.pesoNetoKg ?? 0), 0)
        ),
        ajusteKg: this.round2(Number(form?.detalleTicket?.ajusteKg ?? 0)),
        totalPesoNetoKg: this.round2(
          pesadas.reduce((a, p) => a + Number(p?.pesoNetoKg ?? 0), 0) +
            Number(form?.detalleTicket?.ajusteKg ?? 0)
        ),
      },

      pesadas: (pesadas || []).map((p, i) => {
        const tarasFinal = this.fallbackTaraIfNeeded(p);

        return {
          item: i + 1,
          producto: this.safeText(p?.producto),
          balanza: this.safeText(p?.balanza),
          pesoBrutoKg: this.round2(p?.pesoBrutoKg ?? 0),
          taraKg: this.round2(p?.taraTotalKg ?? 0),
          pesoNetoKg: this.round2(p?.pesoNetoKg ?? 0),
          estado: this.safeText(p?.estado),

          taras: (tarasFinal || []).map((t) => ({
            empaque: this.safeText(t?.empaque),
            codigo: this.safeText(t?.codigo),
            taraEmpaqueKg: this.round2(t?.taraPorEmpaqueKg ?? 0),
            cantidad: Number(t?.cantidad ?? 0),
            taraTotalKg: this.round2(t?.taraKg ?? 0),
          })),

          layoutMode: 'ROW_WITH_DETAILS',
        } as any;
      }),
    };

    (report as any).qrDataUrl = qrDataUrl || undefined;
    (report as any).signatures = {
      leftLabel: 'Responsable',
      rightLabel: 'Conductor / Transportista',
    };

    return report;
  }

  private async generatePdfFromReport(
    report: TicketBalanzaReport,
    filename: string
  ): Promise<void> {
    const svc: any = this.pdf as any;

    const blob: Blob = await (typeof svc.generateAsync === 'function'
      ? svc.generateAsync(report)
      : svc.generate(report));

    if (typeof svc.download === 'function') {
      svc.download(blob, filename);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* =========================================================
     GUARDAR TICKET COMPLETO
     ========================================================= */

  async guardarTicketCompleto(): Promise<void> {
  if (this.isSavingFull || this.isSavingHeader) return;

  this.showValidation = true;

  const isValid = this.validateUpToStep(this.maxStep);
  if (!isValid) {
    Swal.fire({
      icon: 'warning',
      title: 'Completa todos los datos requeridos antes de guardar el ticket.',
    });
    return;
  }

  if (!this.headerSaved || !this.headerTicketId) {
    Swal.fire({
      icon: 'warning',
      title: 'Primero guarda el encabezado (Paso 4).',
    });
    return;
  }

  const ok = await this.toast.confirm(
    'Se cerrará el ticket de balanza y luego se generará el reporte PDF. ¿Deseas continuar?',
    {
      title: `Guardar ticket #${this.headerTicketId}`,
      type: 'success',
    }
  );

  if (!ok) return;

  let ticketCerrado = false;

  try {
    this.isSavingFull = true;

    // 1) Cerrar ticket en servidor
    await this.cerrarTicketServidor(this.headerTicketId);
    ticketCerrado = true;

    // 2) Tomar snapshot actual del borrador
    const draft = this.getDraftSnapshot();
    if (!draft) {
      throw new Error('No se encontró borrador para generar el reporte.');
    }

    // 3) Generar PDF
    const qrDataUrl = await this.loadImageAsDataUrlCanvas('assets/qrcode.png');
    const report = this.buildReportFromDraft(draft, qrDataUrl);

    const filename = `TICKET_BALANZA_${this.headerTicketId}.pdf`;
    await this.generatePdfFromReport(report, filename);

    // 4) Limpiar proceso y redirigir
    await Swal.fire({
      icon: 'success',
      title: 'Ticket guardado correctamente',
      text: 'El proceso se completó y serás redirigido al listado.',
      confirmButtonText: 'Aceptar',
    });

    this.resetDraftHard();
    await this.router.navigate(['/pesadas/listar']);

  } catch (e: any) {
    console.error(e);

    if (ticketCerrado) {
      Swal.fire({
        icon: 'warning',
        title: 'El ticket fue guardado, pero no se pudo generar el PDF.',
        text: e?.message || 'Revisa la generación del reporte.',
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: e?.message || 'No se pudo guardar/cerrar el ticket.',
      });
    }
  } finally {
    this.isSavingFull = false;
  }
}

}