import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { PesadaDocumento } from '../modals/pesada-documento/pesada-documento';
import { PesadaTara } from '../modals/pesada-tara/pesada-tara';
import { PesadaPeso } from '../modals/pesada-peso/pesada-peso';
import { ToastService } from '../../../shared/components/toast/toast.service';

import {
  WeighingService,
  BuyingStation,
  OperationStation,
  Carrier,
  CarrierDriver,
  CarrierTruck,
  CarrierTrailer,
} from '../../../core/services/weighing.service';

import { StepperNav, WizardStep } from './components/stepper-nav/stepper-nav';
import { PasoDatosOperacion } from './components/paso-datos-operacion/paso-datos-operacion';
import { PasoOrigenDestino } from './components/paso-origen-destino/paso-origen-destino';
import { PasoDocumentos } from './components/paso-documentos/paso-documentos';
import { PasoTransporte } from './components/paso-transporte/paso-transporte';
import { PasoDetalleTicket } from './components/paso-detalle-ticket/paso-detalle-ticket';

import { TicketDraftService } from './services/ticket-draft.service';
import Swal from 'sweetalert2';

/* =========================================================
   INTERFACES / MODELOS LOCALES
   ========================================================= */

export interface BusinessPartnerLite {
  id: number;
  companyName: string;
}

export interface DocumentTypeLite {
  id: number;
  code: string;
  name: string;
}

export interface DocumentoRelacionado {
  id?: number;

  idDocumentTypes?: number;
  idBusinessPartners?: number;

  socioNegocio: string;
  tipoDocumento: string;
  documento: string;

  serie?: string;
  numeroCorrelativo?: string;

  fechaDocumento: string;
  numeroDocumento: string;

  pesoBrutoKg: number;
  pesoNetoKg: number;
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

  /** ✅ para resetear al “hoy” */
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

  stations: BuyingStation[] = [];
  originStations: BuyingStation[] = [];
  destinationStations: BuyingStation[] = [];
  principalStation: BuyingStation | null = null;
  operations: OperationStation[] = [];

  carriers: Carrier[] = [];
  carrierDrivers: CarrierDriver[] = [];
  carrierTrucks: CarrierTruck[] = [];
  carrierTrailers: CarrierTrailer[] = [];

  productosMock: string[] = [
    'CACAO EN GRANO HÚMEDO',
    'CACAO EN GRANO SECO',
    'CAFÉ VERDE',
  ];

  balanzasMock: string[] = [
    '001-METTLER TOLEDO PBA430',
    '002-METTLER TOLEDO PBA430',
  ];

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
  isLoading = false;

  headerSaved = false;
  headerTicketId: number | null = null;

  businessPartners: BusinessPartnerLite[] = [];
  documentTypes: DocumentTypeLite[] = [];

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
    private modalService: NgbModal,
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

  get transportistaGroup(): FormGroup { return this.transporte.get('transportista') as FormGroup; }
  get conductorGroup(): FormGroup { return this.transporte.get('conductor') as FormGroup; }
  get vehiculoGroup(): FormGroup { return this.transporte.get('vehiculo') as FormGroup; }

  /* =========================================================
     INIT
     ========================================================= */
  ngOnInit(): void {
    this.loadDraftFromStorage();

    this.loadStationsAndOperations();
    this.loadCarriers();

    const opIdInit = Number(this.datosOperacion.get('operacion')?.value || 0);
    if (opIdInit) {
      this.loadDocumentCatalogsForOperation(opIdInit);
      this.documentos = this.documentos.map(d => this.normalizeDocumentoRelacionado(d));
      this.saveDraftToStorage();
    }

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

    this.updateStepsState();

    if (this.headerSaved) {
      this.lockHeaderEdition();
    }
  }

  /* =========================================================
     ✅ REINICIAR / BORRAR DRAFT (BOTÓN X)
     ========================================================= */
  async resetDraftConfirm(): Promise<void> {
  if (this.isSavingHeader || this.isSavingFull) return;

  const ok = await this.toast.confirm(
    'Se borrará el avance guardado y se limpiarán los pasos, documentos y pesadas. Esta acción no se puede deshacer.',
    {
      title: '¿Reiniciar ticket de balanza?',
      type: 'warning', // ✅ warning como pediste
      // si tu componente soporta textos personalizados:
      // confirmText: 'Sí, reiniciar',
      // cancelText: 'Cancelar',
    }
  );

  if (!ok) return;

  this.resetAllState();

  // opcional: si quieres mensaje final (puede ser tu toast success)
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
    // 1) limpiar storage
    this.clearDraftFromStorage();

    // 2) liberar estado ticket
    this.headerSaved = false;
    this.headerTicketId = null;

    this.isSavingHeader = false;
    this.isSavingFull = false;

    // 3) limpiar colecciones
    this.documentos = [];
    this.pesadas = [];
    this.businessPartners = [];
    this.documentTypes = [];

    // 4) reset totales
    this.totalesPesadas = {
      cantidadItems: 0,
      totalPesoBruto: 0,
      totalTara: 0,
      subtotalPesoNeto: 0,
      ajusteKg: 0,
      diferenciaAjuste: 0,
      totalPesoNeto: 0,
    };

    // 5) reset form + habilitar
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

    // 6) reset stepper
    this.currentStep = 1;
    this.steps = [
      { id: 1, label: 'Datos de operación', hint: 'Fecha, operación y sede', disabled: false, completed: false },
      { id: 2, label: 'Origen / Destino', hint: 'Sede de origen y destino', disabled: true, completed: false },
      { id: 3, label: 'Documentos relacionados', hint: 'Guías y comprobantes', disabled: true, completed: false },
      { id: 4, label: 'Datos del transporte', hint: 'Empresa, conductor y vehículo', disabled: true, completed: false },
      { id: 5, label: 'Detalle del ticket', hint: 'Pesadas y taras', disabled: true, completed: false },
    ];

    // 7) reset catálogos dependientes (transporte)
    this.carrierDrivers = [];
    this.carrierTrucks = [];
    this.carrierTrailers = [];

    // 8) recargar catálogos principales (opcional pero recomendado)
    this.loadStationsAndOperations();
    this.loadCarriers();

    this.updateStepsState();
  }

  /* =========================================================
     STORAGE
     ========================================================= */
  private saveDraftToStorage(): void {
    const draft = {
      form: this.ticketForm.value,
      documentos: this.documentos,
      pesadas: this.pesadas,
      currentStep: this.currentStep,
      headerSaved: this.headerSaved,
      headerTicketId: this.headerTicketId,
    };
    this.ticketDraftService.saveDraft(draft as any);
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

      this.recalcularTotalesPesadas();
      this.updateStepsState();
    } catch (error) {
      console.error('Error aplicando borrador de ticket', error);
    }
  }

  private clearDraftFromStorage(): void {
    this.ticketDraftService.clearDraft();
  }

  /* =========================================================
     ✅ CATÁLOGOS PASO 3 (por operación)
     ========================================================= */

  private loadDocumentCatalogsForOperation(operationId: number): void {
    if (!operationId) {
      this.businessPartners = [];
      this.documentTypes = [];
      return;
    }

    this.weighingService.getBusinessPartnersByOperation(operationId).subscribe({
      next: (res: any) => {
        this.businessPartners = (res?.data || []) as BusinessPartnerLite[];
        this.documentos = this.documentos.map(d => this.normalizeDocumentoRelacionado(d));
        this.saveDraftToStorage();
      },
      error: (err) => console.error('Error cargando socios de negocio por operación', err),
    });

    this.weighingService.getDocumentTypesByOperation(operationId).subscribe({
      next: (res: any) => {
        const rows = res?.data || [];
        const flat: DocumentTypeLite[] = [];
        for (const r of rows) {
          const docs = r?.documents || [];
          for (const d of docs) {
            flat.push({ id: d.id, code: d.code, name: d.name });
          }
        }
        this.documentTypes = flat;
        this.documentos = this.documentos.map(d => this.normalizeDocumentoRelacionado(d));
        this.saveDraftToStorage();
      },
      error: (err) => console.error('Error cargando tipos de documento por operación', err),
    });
  }

  private normalizeDocumentoRelacionado(doc: DocumentoRelacionado): DocumentoRelacionado {
    const d: any = { ...doc };

    if (!d.serie || !d.numeroCorrelativo) {
      const nd = String(d.numeroDocumento || '');
      if (nd.includes('-')) {
        const [ser, cor] = nd.split('-', 2);
        d.serie = d.serie || ser?.trim();
        d.numeroCorrelativo = d.numeroCorrelativo || cor?.trim();
      }
    }

    if (d.serie && d.numeroCorrelativo) {
      d.numeroDocumento = `${d.serie}-${d.numeroCorrelativo}`;
    }

    if (!this.isValidInt(d.idBusinessPartners)) {
      const bp = this.businessPartners.find(x => this.safeEq(x.companyName, d.socioNegocio));
      if (bp) d.idBusinessPartners = bp.id;
    }

    if (!this.isValidInt(d.idDocumentTypes)) {
      const byCode = this.documentTypes.find(x => this.safeEq(x.code, d.tipoDocumento));
      const byName = this.documentTypes.find(x => this.safeEq(x.name, d.documento));
      const found = byCode || byName;
      if (found) d.idDocumentTypes = found.id;
    }

    return d as DocumentoRelacionado;
  }

  private safeEq(a: any, b: any): boolean {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  private isValidInt(val: any): boolean {
    return Number.isInteger(val) && Number(val) > 0;
  }

  private getSerialNumberFromDoc(d: DocumentoRelacionado): { serial: string; number: string } {
    const serial = String((d as any).serie || '').trim();
    const number = String((d as any).numeroCorrelativo || '').trim();

    if (serial && number) return { serial, number };

    const nd = String(d.numeroDocumento || '');
    if (nd.includes('-')) {
      const [ser, cor] = nd.split('-', 2);
      return { serial: (ser || '').trim(), number: (cor || '').trim() };
    }

    return { serial: serial || 'SN', number: number || '0' };
  }

  /* =========================================================
     SEDES / OPERACIONES
     ========================================================= */

  private loadStationsAndOperations(): void {
    this.isLoading = true;

    this.weighingService.getPrincipalBuyingStation().subscribe({
      next: (principal: BuyingStation) => {
        this.principalStation = principal;

        this.stations = [principal];
        this.destinationStations = [principal];
        this.operations = [];

        const datosOp = this.datosOperacion.value;
        const origenDest = this.origenDestino.value;

        if (!datosOp?.sedeOperacion && !datosOp?.operacion) {
          this.datosOperacion.patchValue({ sedeOperacion: null, operacion: null });
        }

        if (!origenDest?.sedeOrigen && !origenDest?.sedeDestino) {
          this.origenDestino.patchValue({ sedeOrigen: null, sedeDestino: null });
        }

        this.weighingService.getNonPrincipalBuyingStations().subscribe({
          next: (nonPrincipal: BuyingStation[]) => {
            this.stations = [principal, ...(nonPrincipal || [])];
            this.originStations = nonPrincipal || [];

            const savedStationId = Number(this.datosOperacion.get('sedeOperacion')?.value || 0);
            if (savedStationId) this.loadOperationsForStation(savedStationId, true);

            const opId = Number(this.datosOperacion.get('operacion')?.value || 0);
            if (opId) this.loadDocumentCatalogsForOperation(opId);
          },
          error: (err) => console.error('Error loading non-principal buying stations', err),
          complete: () => { this.isLoading = false; },
        });
      },
      error: (err) => {
        console.error('Error loading principal buying station', err);
        this.isLoading = false;
      },
    });
  }

  onChangeOperationStation(): void {
    if (this.headerSaved) return;

    const stationId = Number(this.datosOperacion.get('sedeOperacion')?.value || 0);
    if (!stationId) {
      this.operations = [];
      this.datosOperacion.patchValue({ operacion: null });
      this.businessPartners = [];
      this.documentTypes = [];
      return;
    }
    this.loadOperationsForStation(stationId, false);
  }

  private loadOperationsForStation(stationId: number, keepOperation: boolean = false): void {
    this.operations = [];
    if (!keepOperation) {
      this.datosOperacion.patchValue({ operacion: null });
      this.businessPartners = [];
      this.documentTypes = [];
    }

    this.weighingService.getOperationsByStation(stationId).subscribe({
      next: (ops: OperationStation[]) => {
        this.operations = ops || [];

        if (keepOperation) {
          const currentOpId = this.datosOperacion.get('operacion')?.value;
          if (currentOpId && !this.operations.some((op) => op.id === currentOpId)) {
            this.datosOperacion.patchValue({ operacion: null });
          }
        }
      },
      error: (err) => console.error('Error loading operations for station', err),
    });
  }

  onChangeOperacion(): void {
    if (this.headerSaved) return;

    const opId = Number(this.datosOperacion.get('operacion')?.value || 0);
    this.loadDocumentCatalogsForOperation(opId);

    this.documentos = this.documentos.map(d => this.normalizeDocumentoRelacionado(d));
    this.saveDraftToStorage();
  }

  /* =========================================================
     TRANSPORTE
     ========================================================= */

  private loadCarriers(): void {
    this.weighingService.getCarriers().subscribe({
      next: (data: Carrier[]) => {
        this.carriers = data || [];
        this.ensureTransportRelationsAfterLoad();
      },
      error: (err) => console.error('Error loading carriers', err),
    });
  }

  private ensureTransportRelationsAfterLoad(): void {
    const carrierId = Number(this.transportistaGroup.get('transportistaId')?.value || 0);
    if (!carrierId) return;
    this.fetchCarrierRelations(carrierId, true);
  }

  private fetchCarrierRelations(carrierId: number, keepValues: boolean): void {
    this.weighingService.getCarrierDrivers(carrierId).subscribe({
      next: (drivers: CarrierDriver[]) => {
        this.carrierDrivers = drivers || [];

        if (!keepValues) {
          this.conductorGroup.patchValue({
            conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '',
          });
        } else {
          const currentId = this.conductorGroup.get('conductorId')?.value;
          if (currentId && !this.carrierDrivers.some((d) => d.id === currentId)) {
            this.conductorGroup.patchValue({
              conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '',
            });
          }
        }
      },
      error: (err) => console.error('Error loading carrier drivers', err),
    });

    this.weighingService.getCarrierTrucks(carrierId).subscribe({
      next: (trucks: CarrierTruck[]) => {
        this.carrierTrucks = trucks || [];

        if (!keepValues) {
          this.vehiculoGroup.patchValue({ vehiculoId: null });
        } else {
          const currentId = this.vehiculoGroup.get('vehiculoId')?.value;
          if (currentId && !this.carrierTrucks.some((t) => t.id === currentId)) {
            this.vehiculoGroup.patchValue({ vehiculoId: null });
          }
        }
      },
      error: (err) => console.error('Error loading carrier trucks', err),
    });

    this.weighingService.getCarrierTrailers(carrierId).subscribe({
      next: (trailers: CarrierTrailer[]) => {
        this.carrierTrailers = trailers || [];

        if (!keepValues) {
          this.vehiculoGroup.patchValue({ ...this.vehiculoGroup.value, trailerId: null });
        } else {
          const currentId = this.vehiculoGroup.get('trailerId')?.value;
          if (currentId && !this.carrierTrailers.some((t) => t.id === currentId)) {
            this.vehiculoGroup.patchValue({ ...this.vehiculoGroup.value, trailerId: null });
          }
        }
      },
      error: (err) => console.error('Error loading carrier trailers', err),
    });
  }

  onChangeTransportista(): void {
    if (this.headerSaved) return;

    const carrierId = Number(this.transportistaGroup.get('transportistaId')?.value || 0);

    if (!carrierId) {
      this.transportistaGroup.patchValue({ nombre: '', tipoDocumento: '', numeroDocumento: '' });
      this.carrierDrivers = [];
      this.carrierTrucks = [];
      this.carrierTrailers = [];

      this.conductorGroup.patchValue({ conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' });
      this.vehiculoGroup.patchValue({ vehiculoId: null, trailerId: null });

      this.saveDraftToStorage();
      return;
    }

    const carrier = this.carriers.find((c) => c.id === carrierId);
    if (carrier) {
      this.transportistaGroup.patchValue({
        nombre: carrier.companyName,
        tipoDocumento: (carrier as any).documentTypeCode || 'RUC',
        numeroDocumento: (carrier as any).documentNumber,
      });
    }

    this.fetchCarrierRelations(carrierId, false);
    this.saveDraftToStorage();
  }

  onChangeConductor(): void {
    if (this.headerSaved) return;

    const conductorId = Number(this.conductorGroup.get('conductorId')?.value || 0);

    if (!conductorId) {
      this.conductorGroup.patchValue({ nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' });
      this.saveDraftToStorage();
      return;
    }

    const driver = this.carrierDrivers.find((d) => d.id === conductorId);
    if (!driver) return;

    this.conductorGroup.patchValue({
      nombre: (driver as any).fullName,
      tipoDocumento: (driver as any).documentTypeCode || 'DNI',
      numeroDocumento: (driver as any).documentNumber,
      licenciaConducir: (driver as any).license,
    });

    this.saveDraftToStorage();
  }

  getTruckPlate(truck: CarrierTruck): string {
    const t: any = truck as any;
    return t.plateNumber || t.plate || t.licensePlate || t.placa || t.description || '';
  }
  getTrailerPlate(trailer: CarrierTrailer): string {
    const t: any = trailer as any;
    return t.plateNumber || t.plate || t.licensePlate || t.placa || t.description || '';
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
      if (this.documentos.length === 0) {
        this.showStepWarning('Agrega al menos un documento relacionado antes de continuar.');
        return false;
      }

      const invalidIdx = this.documentos.findIndex(d => {
        const nd = this.normalizeDocumentoRelacionado(d);
        return !this.isValidInt(nd.idDocumentTypes) || !this.isValidInt(nd.idBusinessPartners);
      });

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

    if (step >= 5 && this.pesadas.length === 0) {
      this.showStepWarning('Registra al menos una pesada en el detalle del ticket.');
      return false;
    }

    return true;
  }

  private updateStepsState(): void {
    const step1Completed = this.datosOperacion.valid;
    const step2Completed = this.origenDestino.valid;
    const step3Completed = this.documentos.length > 0;
    const step4Completed = this.transporte.valid;
    const step5Completed = this.pesadas.length > 0;

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
     DOCUMENTOS (PASO 3)
     ========================================================= */
  addDocumentoRelacionado(): void {
    if (this.headerSaved) {
      this.showStepWarning('El encabezado ya fue guardado. No se pueden modificar documentos.');
      return;
    }
    this.openDocumentoModal();
  }

  editDocumentoRelacionado(row: DocumentoRelacionado, index: number): void {
    if (this.headerSaved) {
      this.showStepWarning('El encabezado ya fue guardado. No se pueden modificar documentos.');
      return;
    }
    this.openDocumentoModal(row, index);
  }

  deleteDocumentoRelacionado(index: number): void {
    if (this.headerSaved) {
      this.showStepWarning('El encabezado ya fue guardado. No se pueden modificar documentos.');
      return;
    }
    this.documentos.splice(index, 1);
    this.updateStepsState();
    this.saveDraftToStorage();
  }

  private openDocumentoModal(row?: DocumentoRelacionado, index?: number): void {
    const modalRef = this.modalService.open(PesadaDocumento, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    const opId = Number(this.datosOperacion.get('operacion')?.value || 0);

    (modalRef.componentInstance as any).operationId = opId;
    (modalRef.componentInstance as any).businessPartners = this.businessPartners;
    (modalRef.componentInstance as any).documentTypes = this.documentTypes;
    (modalRef.componentInstance as any).data = row ? this.normalizeDocumentoRelacionado(row) : null;

    modalRef.result
      .then((result: DocumentoRelacionado | null | undefined) => {
        if (!result) return;

        const fixed = this.normalizeDocumentoRelacionado(result);

        if (index != null) this.documentos[index] = fixed;
        else this.documentos.push(fixed);

        this.updateStepsState();
        this.saveDraftToStorage();
      })
      .catch(() => {});
  }

  /* =========================================================
     PESADAS (PASO 5)
     ========================================================= */
  addPesada(): void {
    this.openPesadaModal();
  }

  editPesada(row: PesadaDetalle, index: number): void {
    this.openPesadaModal(row, index);
  }

  deletePesada(index: number): void {
    this.pesadas.splice(index, 1);
    this.recalcularTotalesPesadas();
    this.updateStepsState();
    this.saveDraftToStorage();
  }

  private openPesadaModal(row?: PesadaDetalle, index?: number): void {
    const modalRef = this.modalService.open(PesadaPeso, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    (modalRef.componentInstance as any).data = {
      pesada: row ?? null,
      productos: this.productosMock,
      balanzas: this.balanzasMock,
    };

    modalRef.result
      .then((result: PesadaDetalle | null | undefined) => {
        if (!result) return;

        if (!Array.isArray(result.taras)) result.taras = [];

        result.taraTotalKg = result.taras.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;
        result.pesoNetoKg = result.pesoBrutoKg - result.taraTotalKg;

        if (index != null) this.pesadas[index] = result;
        else this.pesadas.push(result);

        this.recalcularTotalesPesadas();
        this.updateStepsState();
        this.saveDraftToStorage();
      })
      .catch(() => {});
  }

  openTarasForPesada(row: PesadaDetalle, index: number): void {
    const modalRef = this.modalService.open(PesadaTara, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    (modalRef.componentInstance as any).data = {
      pesada: row,
      taras: row.taras ?? [],
    };

    modalRef.result
      .then((result: TaraItem[] | null | undefined) => {
        if (!result) return;

        this.pesadas[index].taras = result;
        this.pesadas[index].taraTotalKg = result.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;
        this.pesadas[index].tieneTara = this.pesadas[index].taraTotalKg > 0;
        this.pesadas[index].pesoNetoKg = this.pesadas[index].pesoBrutoKg - this.pesadas[index].taraTotalKg;

        this.recalcularTotalesPesadas();
        this.updateStepsState();
        this.saveDraftToStorage();
      })
      .catch(() => {});
  }

  private recalcularTotalesPesadas(): void {
    const ajusteKg = Number(this.detalleTicket.get('ajusteKg')?.value || 0);

    const cantidadItems = this.pesadas.length;
    const totalPesoBruto = this.pesadas.reduce((acc, p) => acc + (p.pesoBrutoKg || 0), 0);
    const totalTara = this.pesadas.reduce((acc, p) => acc + (p.taraTotalKg || 0), 0);
    const subtotalPesoNeto = this.pesadas.reduce((acc, p) => acc + (p.pesoNetoKg || 0), 0);

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

  onChangeAjusteKg(): void {
    this.recalcularTotalesPesadas();
    this.saveDraftToStorage();
  }

  /* =========================================================
     PAYLOAD CABECERA
     ========================================================= */
  private buildHeaderPayload() {
    const formValue: any = this.ticketForm.value;
    const datosOp = formValue.datosOperacion;
    const origenDest = formValue.origenDestino;
    const transporte = formValue.transporte;

    const ticket = {
      idBuyingStations: datosOp.sedeOperacion,
      idBuyingStationsOrigin: origenDest.sedeOrigen,
      idBuyingStationsDestination: origenDest.sedeDestino,
      idEmployees: null,
      idOperations: datosOp.operacion,
      idBusinessPartnersCarriers: transporte.transportista.transportistaId,
      idBusinessPartnersDrivers: transporte.conductor.conductorId,
      idTrucks: transporte.vehiculo.vehiculoId,
      idTrailers: transporte.vehiculo.trailerId,
      idScaleTicketStatus: 1,
      creationDate: datosOp.fechaEmision,
    };

    const docsFixed = this.documentos.map(d => this.normalizeDocumentoRelacionado(d));

    const documents = docsFixed.map((d) => {
      const { serial, number } = this.getSerialNumberFromDoc(d);
      return {
        idDocumentTypes: Number(d.idDocumentTypes),
        idBusinessPartners: Number(d.idBusinessPartners),
        documentSerial: serial,
        documentNumber: number,
        documentDate: d.fechaDocumento,
        documentGrossWeight: d.pesoBrutoKg,
        documentNetWeight: d.pesoNetoKg,
      };
    });

    this.documentos = docsFixed;
    this.saveDraftToStorage();

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

      const payload = this.buildHeaderPayload();
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

  private buildPayloadCompleto() {
    const formValue: any = this.ticketForm.value;
    const datosOp = formValue.datosOperacion;
    const origenDest = formValue.origenDestino;
    const transporte = formValue.transporte;

    const ticket = {
      idBuyingStations: datosOp.sedeOperacion,
      idBuyingStationsOrigin: origenDest.sedeOrigen,
      idBuyingStationsDestination: origenDest.sedeDestino,
      idEmployees: null,
      idOperations: datosOp.operacion,
      idBusinessPartnersCarriers: transporte.transportista.transportistaId,
      idBusinessPartnersDrivers: transporte.conductor.conductorId,
      idTrucks: transporte.vehiculo.vehiculoId,
      idTrailers: transporte.vehiculo.trailerId,
      idScaleTicketStatus: 1,
      creationDate: datosOp.fechaEmision,
      totalGrossWeight: this.totalesPesadas.totalPesoBruto || 0,
      totalTareWeight: this.totalesPesadas.totalTara || 0,
      totalTareAdjustment: this.totalesPesadas.ajusteKg || 0,
    };

    const docsFixed = this.documentos.map(d => this.normalizeDocumentoRelacionado(d));
    const documents = docsFixed.map((d) => {
      const { serial, number } = this.getSerialNumberFromDoc(d);
      return {
        idDocumentTypes: Number(d.idDocumentTypes),
        idBusinessPartners: Number(d.idBusinessPartners),
        documentSerial: serial,
        documentNumber: number,
        documentDate: d.fechaDocumento,
        documentGrossWeight: d.pesoBrutoKg,
        documentNetWeight: d.pesoNetoKg,
      };
    });

    this.documentos = docsFixed;
    this.saveDraftToStorage();

    return { ticket, documents };
  }

  guardarTicketCompleto(): void {
    const isValid = this.validateUpToStep(this.maxStep);
    if (!isValid) {
      this.currentStep = 1;
      return;
    }

    this.recalcularTotalesPesadas();
    this.isSavingFull = true;

    const payload = this.buildPayloadCompleto();
    console.log('Payload COMPLETO ticket balanza:', payload);

    setTimeout(() => {
      this.isSavingFull = false;
      this.clearDraftFromStorage();
    }, 700);
  }
}
