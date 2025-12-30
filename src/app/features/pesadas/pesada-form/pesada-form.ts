import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';

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

/* =========================================================
   MODELOS (se exportan porque los pasos los importan)
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
  producto: string;
  balanza: string;
  pesoBrutoKg: number;
  taraTotalKg: number;
  pesoNetoKg: number;
  observaciones: string;
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

/* =========================================================
   COMPONENTE
   ========================================================= */

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
  styleUrl: './pesada-form.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PesadaForm implements OnInit {
  minFechaEmision!: string;
  maxFechaEmision!: string;
  private todayStr!: string;

  currentStep = 1;
  readonly maxStep = 5;

  steps: WizardStep[] = [
    { id: 1, label: 'Datos de operación', hint: 'Fecha, operación y sede', disabled: false, completed: false },
    { id: 2, label: 'Origen / Destino', hint: 'Sede de origen y destino', disabled: true, completed: false },
    { id: 3, label: 'Documentos relacionados', hint: 'Guías y comprobantes', disabled: true, completed: false },
    { id: 4, label: 'Datos del transporte', hint: 'Empresa, conductor y vehículo', disabled: true, completed: false },
    { id: 5, label: 'Detalle del ticket', hint: 'Pesadas y taras', disabled: true, completed: false },
  ];

  ticketForm: FormGroup;

  // estaciones para paso 2 (vienen del paso 1)
  originStations: BuyingStation[] = [];
  destinationStations: BuyingStation[] = [];

  // data de pasos 3 y 5
  documentos: DocumentoRelacionado[] = [];
  pesadas: PesadaDetalle[] = [];

  // totales paso 5
  totalesPesadas: TotalesPesadas = {
    cantidadItems: 0,
    totalPesoBruto: 0,
    totalTara: 0,
    subtotalPesoNeto: 0,
    ajusteKg: 0,
    diferenciaAjuste: 0,
    totalPesoNeto: 0,
  };

  // estados
  isSavingHeader = false;
  isSavingFull = false;

  headerSaved = false;
  headerTicketId: number | null = null;

  // mocks (puedes cambiarlos luego a catálogo real)
  productosMock: string[] = ['CACAO EN GRANO HÚMEDO', 'CACAO EN GRANO SECO', 'CAFÉ VERDE'];
  balanzasMock: string[] = ['001-METTLER TOLEDO PBA430', '002-METTLER TOLEDO PBA430'];

  /** ✅ botón reiniciar solo si hay algo guardado/cargando */
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
    private ticketDraftService: TicketDraftService
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
          nombre: ['', Validators.required],
          tipoDocumento: ['', Validators.required],
          numeroDocumento: ['', Validators.required],
        }),
        conductor: this.fb.group({
          conductorId: [null, Validators.required],
          nombre: ['', Validators.required],
          tipoDocumento: ['', Validators.required],
          numeroDocumento: ['', Validators.required],
          licenciaConducir: ['', Validators.required],
        }),
        vehiculo: this.fb.group({
          vehiculoId: [null, Validators.required],
          trailerId: [null, Validators.required],
        }),
      }),
      detalleTicket: this.fb.group({
        ajusteKg: [0],
      }),
    });
  }

  /* -------------------------------------
   * Helpers fecha
   * ----------------------------------- */
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

  /* Getters */
  get datosOperacion(): FormGroup { return this.ticketForm.get('datosOperacion') as FormGroup; }
  get origenDestino(): FormGroup { return this.ticketForm.get('origenDestino') as FormGroup; }
  get transporte(): FormGroup { return this.ticketForm.get('transporte') as FormGroup; }
  get detalleTicket(): FormGroup { return this.ticketForm.get('detalleTicket') as FormGroup; }

  /** ✅ helper: un control DISABLED debe contar como “ok” */
  private ok(ctrl: AbstractControl | null | undefined): boolean {
    if (!ctrl) return false;
    return ctrl.valid || ctrl.disabled;
  }

  /* =========================================================
     INIT
     ========================================================= */
  ngOnInit(): void {
    this.loadDraftFromStorage();

    // recalcular totales (por si venía del draft)
    this.recalcularTotalesPesadas();

    // cambios relevantes para draft y stepper
    this.datosOperacion.valueChanges.subscribe(() => {
      this.updateStepsState();
      this.saveDraftToStorage();
    });

    this.origenDestino.valueChanges.subscribe(() => {
      this.updateStepsState();
      this.saveDraftToStorage();
    });

    this.transporte.valueChanges.subscribe(() => {
      this.updateStepsState();
      this.saveDraftToStorage();
    });

    this.detalleTicket.valueChanges.subscribe(() => {
      this.recalcularTotalesPesadas();
      this.saveDraftToStorage();
    });

    // si ya estaba guardado, bloquear edición del header
    if (this.headerSaved) this.lockHeaderEdition();

    this.updateStepsState();
  }

  /* =========================================================
     ✅ EVENTOS DESDE HIJOS
     ========================================================= */

  onStationsReady(payload: { principal: BuyingStation; nonPrincipal: BuyingStation[]; all: BuyingStation[] }) {
    // Paso 2: origen = no principal, destino = principal (según tu regla)
    this.destinationStations = payload?.principal ? [payload.principal] : [];
    this.originStations = payload?.nonPrincipal || [];
    this.saveDraftToStorage();
  }

  onOperationChange(opId: number) {
    if (this.headerSaved) return;

    // si cambia la operación: limpiar docs para evitar inconsistencias
    this.documentos = [];
    this.updateStepsState();
    this.saveDraftToStorage();
  }

  onDocumentosChange(list: DocumentoRelacionado[]) {
    if (this.headerSaved) return; // seguridad (aunque el hijo ya debería bloquear)
    this.documentos = list || [];
    this.updateStepsState();
    this.saveDraftToStorage();
  }

  onPesadasChange(list: PesadaDetalle[]) {
    // OJO: NO BLOQUEAR por headerSaved (la cabecera guardada NO debe bloquear pesadas)
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
     ✅ REINICIAR / BORRAR DRAFT (BOTÓN X)
     ========================================================= */
  async resetDraftConfirm(): Promise<void> {
    if (this.isSavingHeader || this.isSavingFull) return;

    const ok = await this.toast.confirm(
      'Se borrará el avance guardado y se limpiarán los pasos, documentos y pesadas. Esta acción no se puede deshacer.',
      { title: '¿Reiniciar ticket de balanza?', type: 'warning' }
    );
    if (!ok) return;

    this.resetAllState();

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Avance borrado. Puedes crear un nuevo ticket.',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  }

  private resetAllState(): void {
    this.clearDraftFromStorage();

    this.headerSaved = false;
    this.headerTicketId = null;

    this.isSavingHeader = false;
    this.isSavingFull = false;

    this.documentos = [];
    this.pesadas = [];

    this.originStations = [];
    this.destinationStations = [];

    this.totalesPesadas = {
      cantidadItems: 0,
      totalPesoBruto: 0,
      totalTara: 0,
      subtotalPesoNeto: 0,
      ajusteKg: 0,
      diferenciaAjuste: 0,
      totalPesoNeto: 0,
    };

    this.ticketForm.enable({ emitEvent: false });
    this.ticketForm.reset(
      {
        datosOperacion: { fechaEmision: this.todayStr, operacion: null, sedeOperacion: null },
        origenDestino: { sedeOrigen: null, sedeDestino: null },
        transporte: {
          transportista: { transportistaId: null, nombre: '', tipoDocumento: '', numeroDocumento: '' },
          conductor: { conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
          vehiculo: { vehiculoId: null, trailerId: null },
        },
        detalleTicket: { ajusteKg: 0 },
      },
      { emitEvent: false }
    );

    this.currentStep = 1;
    this.steps = [
      { id: 1, label: 'Datos de operación', hint: 'Fecha, operación y sede', disabled: false, completed: false },
      { id: 2, label: 'Origen / Destino', hint: 'Sede de origen y destino', disabled: true, completed: false },
      { id: 3, label: 'Documentos relacionados', hint: 'Guías y comprobantes', disabled: true, completed: false },
      { id: 4, label: 'Datos del transporte', hint: 'Empresa, conductor y vehículo', disabled: true, completed: false },
      { id: 5, label: 'Detalle del ticket', hint: 'Pesadas y taras', disabled: true, completed: false },
    ];

    this.updateStepsState();
  }

  /* =========================================================
     STORAGE (draft)
     ========================================================= */
  private saveDraftToStorage(): void {
    const draft = {
      // form: this.ticketForm.value,
      form: this.ticketForm.getRawValue(),
      documentos: this.documentos,
      pesadas: this.pesadas,
      currentStep: this.currentStep,
      headerSaved: this.headerSaved,
      headerTicketId: this.headerTicketId,
      originStations: this.originStations,
      destinationStations: this.destinationStations,
    };
    this.ticketDraftService.saveDraft(draft as any);
  }


  get operationIdSelected(): number {
  // raw para no depender de disabled
  const raw: any = this.datosOperacion.getRawValue?.() ?? this.datosOperacion.value;
  const v = raw?.operacion;

  // si viniera objeto {id,...}
  if (v && typeof v === 'object' && 'id' in v) return Number((v as any).id || 0);

  return Number(v || 0);
}



  private loadDraftFromStorage(): void {
    const draft: any = this.ticketDraftService.loadDraft();
    if (!draft) return;

    try {
      if (draft.form) this.ticketForm.patchValue(draft.form);

      this.documentos = draft.documentos || [];
      this.pesadas = draft.pesadas || [];
      this.currentStep = draft.currentStep || 1;

      this.headerSaved = !!draft.headerSaved;
      this.headerTicketId = typeof draft.headerTicketId === 'number' ? draft.headerTicketId : null;

      this.originStations = draft.originStations || [];
      this.destinationStations = draft.destinationStations || [];

      if (this.headerSaved) this.lockHeaderEdition();
    } catch (error) {
      console.error('Error aplicando borrador de ticket', error);
    }
  }

  private clearDraftFromStorage(): void {
    this.ticketDraftService.clearDraft();
  }

  /* =========================================================
     NAV
     ========================================================= */
  onStepChange(stepId: number): void {
    this.goToStep(stepId);
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.maxStep) return;

    if (step > this.currentStep) {
      const isValid = this.validateUpToStep(step - 1);
      if (!isValid) return;
    }

    const target = this.steps.find((s) => s.id === step);
    if (target?.disabled) return;

    this.currentStep = step;
    this.saveDraftToStorage();
  }

  async nextStep(): Promise<void> {
    if (this.currentStep >= this.maxStep) return;

    // al salir del paso 4: guardar cabecera
    if (this.currentStep === 4) {
      const ok = await this.confirmAndSaveHeader();
      if (!ok) return;
      this.goToStep(5);
      return;
    }

    this.goToStep(this.currentStep + 1);
  }

  prevStep(): void {
    if (this.currentStep <= 1) return;
    this.currentStep = this.currentStep - 1;
    this.saveDraftToStorage();
  }

  /* =========================================================
     VALIDACIONES
     ========================================================= */
  private showStepWarning(message: string): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }

  private validateUpToStep(step: number): boolean {
    if (step >= 1 && this.datosOperacion.invalid) {
      this.datosOperacion.markAllAsTouched();
      this.showStepWarning('Completa los datos de operación antes de continuar.');
      return false;
    }

    if (step >= 2 && this.origenDestino.invalid) {
      this.origenDestino.markAllAsTouched();
      this.showStepWarning('Completa el origen y destino antes de continuar.');
      return false;
    }

    if (step >= 3) {
      if ((this.documentos?.length || 0) === 0) {
        this.showStepWarning('Agrega al menos un documento relacionado antes de continuar.');
        return false;
      }

      const invalidIdx = this.documentos.findIndex(d =>
        !this.isValidInt(d.idDocumentTypes) || !this.isValidInt(d.idBusinessPartners)
      );

      if (invalidIdx >= 0) {
        this.showStepWarning(`Revisa el documento #${invalidIdx + 1}: falta seleccionar Socio de Negocio o Tipo de Documento.`);
        return false;
      }
    }

    if (step >= 4 && this.transporte.invalid) {
      this.transporte.markAllAsTouched();
      this.showStepWarning('Completa los datos del transporte antes de continuar.');
      return false;
    }

    if (step >= 5 && (this.pesadas?.length || 0) === 0) {
      this.showStepWarning('Registra al menos una pesada en el detalle del ticket.');
      return false;
    }

    return true;
  }

  /** ✅ Stepper: paso 5 se habilita cuando headerSaved=true */
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

    const current = this.steps.find((s) => s.id === this.currentStep);
    if (current?.disabled) {
      const lastEnabled = [...this.steps].reverse().find((s) => !s.disabled);
      this.currentStep = lastEnabled?.id ?? 1;
    }
  }

  /* =========================================================
     PESADAS: totales
     ========================================================= */
  private recalcularTotalesPesadas(): void {
    const ajusteKg = Number(this.detalleTicket.get('ajusteKg')?.value || 0);

    const cantidadItems = this.pesadas?.length || 0;
    const totalPesoBruto = (this.pesadas || []).reduce((acc, p) => acc + Number(p.pesoBrutoKg || 0), 0);
    const totalTara = (this.pesadas || []).reduce((acc, p) => acc + Number(p.taraTotalKg || 0), 0);
    const subtotalPesoNeto = (this.pesadas || []).reduce((acc, p) => acc + Number(p.pesoNetoKg || 0), 0);

    const totalPesoNeto = subtotalPesoNeto + ajusteKg;
    const diferenciaAjuste = totalPesoNeto - subtotalPesoNeto;

    this.totalesPesadas = {
      cantidadItems,
      totalPesoBruto,
      totalTara,
      subtotalPesoNeto,
      ajusteKg,
      diferenciaAjuste,
      totalPesoNeto,
    };
  }

  /* =========================================================
     GUARDAR CABECERA (al final del paso 4)
     ========================================================= */

  private isValidInt(val: any): boolean {
    return Number.isInteger(Number(val)) && Number(val) > 0;
  }

  private getSerialNumberFromDoc(d: DocumentoRelacionado): { serial: string; number: string } {
    const serial = String(d.serie || '').trim();
    const number = String(d.numeroCorrelativo || '').trim();
    if (serial && number) return { serial, number };

    const nd = String(d.numeroDocumento || '').trim();
    if (nd.includes('-')) {
      const [ser, cor] = nd.split('-', 2);
      return { serial: (ser || '').trim(), number: (cor || '').trim() };
    }

    return { serial: 'SN', number: '0' };
  }

  private buildHeaderPayload() {
    const v: any = this.ticketForm.value;

    const ticket = {
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
    };

    const documents = (this.documentos || []).map((d) => {
      const { serial, number } = this.getSerialNumberFromDoc(d);
      return {
        idDocumentTypes: Number(d.idDocumentTypes),
        idBusinessPartners: Number(d.idBusinessPartners),
        documentSerial: serial,
        documentNumber: number,
        documentDate: d.fechaDocumento,
        documentGrossWeight: Number(d.pesoBrutoKg || 0),
        documentNetWeight: Number(d.pesoNetoKg || 0),
      };
    });

    return { ticket, documents };
  }

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

      const payload: any = this.buildHeaderPayload();
      const res: any = await firstValueFrom(
        this.weighingService.createScaleTicketHeader(payload)
      );

      const row = res?.data?.[0] ?? res?.data ?? null;
      const possibleId =
        row?.id ||
        row?.ticketId ||
        row?.idScaleTicket ||
        row?.idScaleTickets ||
        null;

      this.headerTicketId = typeof possibleId === 'number' ? possibleId : null;
      this.headerSaved = true;

      this.lockHeaderEdition();
      this.updateStepsState();
      this.saveDraftToStorage();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Encabezado guardado correctamente.',
        showConfirmButton: false,
        timer: 2500,
      });

      return true;
    } catch (err) {
      console.error('Error guardando encabezado', err);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'No se pudo guardar el encabezado. Inténtalo nuevamente.',
        showConfirmButton: false,
        timer: 3000,
      });

      return false;
    } finally {
      this.isSavingHeader = false;
    }
  }

  private lockHeaderEdition(): void {
    try {
      this.datosOperacion.disable({ emitEvent: false });
      this.origenDestino.disable({ emitEvent: false });
      this.transporte.disable({ emitEvent: false });
    } catch {}
  }

  /* =========================================================
     GUARDAR COMPLETO (solo ejemplo - tu endpoint final lo conectamos después)
     ========================================================= */
  async guardarTicketCompleto(): Promise<void> {
    const isValid = this.validateUpToStep(this.maxStep);
    if (!isValid) return;

    if (!this.headerSaved || !this.headerTicketId) {
      this.showStepWarning('Primero debes guardar el encabezado (Paso 4).');
      return;
    }

    this.recalcularTotalesPesadas();

    try {
      this.isSavingFull = true;

      // Aquí armas tu payload final (según tu backend)
      const payload = {
        ticketId: this.headerTicketId,
        ajusteKg: this.totalesPesadas.ajusteKg,
        totalGrossWeight: this.totalesPesadas.totalPesoBruto,
        totalTareWeight: this.totalesPesadas.totalTara,
        totalNetWeight: this.totalesPesadas.totalPesoNeto,
        details: this.pesadas,
      };

      console.log('Payload FINAL ticket balanza:', payload);

      // TODO: conectar endpoint real:
      // await firstValueFrom(this.weighingService.saveScaleTicketDetail(payload));

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Ticket guardado (demo). Conecta el endpoint final.',
        showConfirmButton: false,
        timer: 2500,
      });

      // limpiar draft al finalizar
      this.clearDraftFromStorage();
    } catch (e) {
      console.error('Error guardando ticket completo', e);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'No se pudo guardar el ticket completo.',
        showConfirmButton: false,
        timer: 3000,
      });
    } finally {
      this.isSavingFull = false;
    }
  }
}
