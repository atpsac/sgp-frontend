import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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

import {
  StepperNav,
  WizardStep,
} from './components/stepper-nav/stepper-nav';
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

export interface DocumentoRelacionado {
  id?: number;

  // IDs para el payload
  idDocumentTypes?: number;
  idBusinessPartners?: number;

  // Campos de UI
  socioNegocio: string;
  tipoDocumento: string;
  documento: string; // serie o código
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
  // Límites para el date
  minFechaEmision!: string;
  maxFechaEmision!: string;

  /* -------------------------------------
   * Paso actual (1 a 5)
   * ----------------------------------- */
  currentStep = 1;
  readonly maxStep = 5;

  /* -------------------------------------
   * Stepper dinámico
   * ----------------------------------- */
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

  /* -------------------------------------
   * Reactive Form principal
   * ----------------------------------- */
  ticketForm: FormGroup;

  /* -------------------------------------
   * Datos de combos desde API
   * ----------------------------------- */
  stations: BuyingStation[] = [];
  originStations: BuyingStation[] = [];
  destinationStations: BuyingStation[] = [];
  principalStation: BuyingStation | null = null;
  operations: OperationStation[] = [];

  // Transporte desde API
  carriers: Carrier[] = [];
  carrierDrivers: CarrierDriver[] = [];
  carrierTrucks: CarrierTruck[] = [];
  carrierTrailers: CarrierTrailer[] = [];

  /* -------------------------------------
   * Datos mock (productos / balanzas)
   * ----------------------------------- */
  productosMock: string[] = [
    'CACAO EN GRANO HÚMEDO',
    'CACAO EN GRANO SECO',
    'CAFÉ VERDE',
  ];

  balanzasMock: string[] = [
    '001-METTLER TOLEDO PBA430',
    '002-METTLER TOLEDO PBA430',
  ];

  /* -------------------------------------
   * Tablas en memoria
   * ----------------------------------- */
  documentos: DocumentoRelacionado[] = [];
  pesadas: PesadaDetalle[] = [];

  /* -------------------------------------
   * Totales de pesadas
   * ----------------------------------- */
  totalesPesadas: TotalesPesadas = {
    cantidadItems: 0,
    totalPesoBruto: 0,
    totalTara: 0,
    subtotalPesoNeto: 0,
    ajusteKg: 0,
    diferenciaAjuste: 0,
    totalPesoNeto: 0,
  };

  /* -------------------------------------
   * Flags UI
   * ----------------------------------- */
  isSavingHeader = false;
  isSavingFull = false;
  isLoading = false;

  /* -------------------------------------
   * Constructor
   * ----------------------------------- */
  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    public toast: ToastService,
    private weighingService: WeighingService,
    private ticketDraftService: TicketDraftService
  ) {
    const today = new Date(); // hora local Perú

    this.minFechaEmision = this.shiftDateLocal(today, -3);
    this.maxFechaEmision = this.shiftDateLocal(today, 3);
    const todayStr = this.shiftDateLocal(today, 0);

    this.ticketForm = this.fb.group({
      // 1) Datos de operación
      datosOperacion: this.fb.group({
        fechaEmision: [todayStr, Validators.required],
        operacion: [null, Validators.required],
        sedeOperacion: [null, Validators.required],
      }),

      // 2) Origen / destino
      origenDestino: this.fb.group({
        sedeOrigen: [null, Validators.required],
        sedeDestino: [null, Validators.required],
      }),

      // 4) Transporte
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

      // 5) Detalle ticket
      detalleTicket: this.fb.group({
        ajusteKg: [0],
      }),
    });
  }

  /* -------------------------------------
   * Helpers de fecha
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

  /* Getters rápidos */
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

  get transportistaGroup(): FormGroup {
    return this.transporte.get('transportista') as FormGroup;
  }

  get conductorGroup(): FormGroup {
    return this.transporte.get('conductor') as FormGroup;
  }

  get vehiculoGroup(): FormGroup {
    return this.transporte.get('vehiculo') as FormGroup;
  }

  /* =========================================================
     CICLO DE VIDA
     ========================================================= */
  ngOnInit(): void {
    // 1) Cargar borrador primero
    this.loadDraftFromStorage();

    // 2) Cargar catálogos
    this.loadStationsAndOperations();
    this.loadCarriers();

    // 3) Suscripciones para persistir
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

    // 4) Estado inicial de pasos
    this.updateStepsState();
  }

  /* =========================================================
     BORRADOR EN LOCALSTORAGE
     ========================================================= */
  private saveDraftToStorage(): void {
    const draft = {
      form: this.ticketForm.value,
      documentos: this.documentos,
      pesadas: this.pesadas,
      currentStep: this.currentStep,
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
     CARGA DE SEDES Y OPERACIONES
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
          this.datosOperacion.patchValue({
            sedeOperacion: null,
            operacion: null,
          });
        }

        if (!origenDest?.sedeOrigen && !origenDest?.sedeDestino) {
          this.origenDestino.patchValue({
            sedeOrigen: null,
            sedeDestino: null,
          });
        }

        this.weighingService.getNonPrincipalBuyingStations().subscribe({
          next: (nonPrincipal: BuyingStation[]) => {
            this.stations = [principal, ...(nonPrincipal || [])];
            this.originStations = nonPrincipal || [];

            // Si el borrador ya tenía sedeOperacion, recargar operaciones y mantener operación
            const savedStationId = Number(
              this.datosOperacion.get('sedeOperacion')?.value || 0
            );
            if (savedStationId) {
              this.loadOperationsForStation(savedStationId, true);
            }
          },
          error: (err) => {
            console.error('Error loading non-principal buying stations', err);
          },
          complete: () => {
            this.isLoading = false;
          },
        });
      },
      error: (err) => {
        console.error('Error loading principal buying station', err);
        this.isLoading = false;
      },
    });
  }

  onChangeOperationStation(): void {
    const stationId = Number(
      this.datosOperacion.get('sedeOperacion')?.value || 0
    );
    if (!stationId) {
      this.operations = [];
      this.datosOperacion.patchValue({ operacion: null });
      return;
    }
    // Cambio del usuario → NO conservar operación
    this.loadOperationsForStation(stationId, false);
  }

  /** keepOperation = true cuando venimos de borrador y debemos mantener la operación seleccionada */
  private loadOperationsForStation(
    stationId: number,
    keepOperation: boolean = false
  ): void {
    this.operations = [];
    if (!keepOperation) {
      this.datosOperacion.patchValue({ operacion: null });
    }

    this.weighingService.getOperationsByStation(stationId).subscribe({
      next: (ops: OperationStation[]) => {
        this.operations = ops || [];

        if (keepOperation) {
          const currentOpId = this.datosOperacion.get('operacion')?.value;
          if (
            currentOpId &&
            !this.operations.some((op) => op.id === currentOpId)
          ) {
            this.datosOperacion.patchValue({ operacion: null });
          }
        }
      },
      error: (err) => {
        console.error('Error loading operations for station', err);
      },
    });
  }

  /* =========================================================
     CARGA DE TRANSPORTISTAS / CONDUCTORES / VEHÍCULOS
     ========================================================= */
  private loadCarriers(): void {
    this.weighingService.getCarriers().subscribe({
      next: (data: Carrier[]) => {
        this.carriers = data || [];
        this.ensureTransportRelationsAfterLoad();
      },
      error: (err) => {
        console.error('Error loading carriers', err);
      },
    });
  }

  private ensureTransportRelationsAfterLoad(): void {
    const carrierId = Number(
      this.transportistaGroup.get('transportistaId')?.value || 0
    );
    if (!carrierId) return;

    this.fetchCarrierRelations(carrierId, true);
  }

  private fetchCarrierRelations(carrierId: number, keepValues: boolean): void {
    // Conductores
    this.weighingService.getCarrierDrivers(carrierId).subscribe({
      next: (drivers: CarrierDriver[]) => {
        this.carrierDrivers = drivers || [];

        if (!keepValues) {
          this.conductorGroup.patchValue({
            conductorId: null,
            nombre: '',
            tipoDocumento: '',
            numeroDocumento: '',
            licenciaConducir: '',
          });
        } else {
          const currentId = this.conductorGroup.get('conductorId')?.value;
          if (currentId && !this.carrierDrivers.some((d) => d.id === currentId)) {
            this.conductorGroup.patchValue({
              conductorId: null,
              nombre: '',
              tipoDocumento: '',
              numeroDocumento: '',
              licenciaConducir: '',
            });
          }
        }
      },
      error: (err) => {
        console.error('Error loading carrier drivers', err);
      },
    });

    // Camiones
    this.weighingService.getCarrierTrucks(carrierId).subscribe({
      next: (trucks: CarrierTruck[]) => {
        this.carrierTrucks = trucks || [];

        if (!keepValues) {
          this.vehiculoGroup.patchValue({
            vehiculoId: null,
          });
        } else {
          const currentId = this.vehiculoGroup.get('vehiculoId')?.value;
          if (currentId && !this.carrierTrucks.some((t) => t.id === currentId)) {
            this.vehiculoGroup.patchValue({
              vehiculoId: null,
            });
          }
        }
      },
      error: (err) => {
        console.error('Error loading carrier trucks', err);
      },
    });

    // Trailers
    this.weighingService.getCarrierTrailers(carrierId).subscribe({
      next: (trailers: CarrierTrailer[]) => {
        this.carrierTrailers = trailers || [];

        if (!keepValues) {
          this.vehiculoGroup.patchValue({
            ...this.vehiculoGroup.value,
            trailerId: null,
          });
        } else {
          const currentId = this.vehiculoGroup.get('trailerId')?.value;
          if (
            currentId &&
            !this.carrierTrailers.some((t) => t.id === currentId)
          ) {
            this.vehiculoGroup.patchValue({
              ...this.vehiculoGroup.value,
              trailerId: null,
            });
          }
        }
      },
      error: (err) => {
        console.error('Error loading carrier trailers', err);
      },
    });
  }

  onChangeTransportista(): void {
    const carrierId = Number(
      this.transportistaGroup.get('transportistaId')?.value || 0
    );

    if (!carrierId) {
      this.transportistaGroup.patchValue({
        nombre: '',
        tipoDocumento: '',
        numeroDocumento: '',
      });
      this.carrierDrivers = [];
      this.carrierTrucks = [];
      this.carrierTrailers = [];

      this.conductorGroup.patchValue({
        conductorId: null,
        nombre: '',
        tipoDocumento: '',
        numeroDocumento: '',
        licenciaConducir: '',
      });

      this.vehiculoGroup.patchValue({
        vehiculoId: null,
        trailerId: null,
      });

      this.saveDraftToStorage();
      return;
    }

    const carrier = this.carriers.find((c) => c.id === carrierId);
    if (carrier) {
      this.transportistaGroup.patchValue({
        nombre: carrier.companyName,
        tipoDocumento: carrier.documentTypeCode || 'RUC',
        numeroDocumento: carrier.documentNumber,
      });
    }

    this.fetchCarrierRelations(carrierId, false);

    this.saveDraftToStorage();
  }

  onChangeConductor(): void {
    const conductorId = Number(
      this.conductorGroup.get('conductorId')?.value || 0
    );

    if (!conductorId) {
      this.conductorGroup.patchValue({
        nombre: '',
        tipoDocumento: '',
        numeroDocumento: '',
        licenciaConducir: '',
      });
      this.saveDraftToStorage();
      return;
    }

    const driver = this.carrierDrivers.find((d) => d.id === conductorId);
    if (!driver) return;

    this.conductorGroup.patchValue({
      nombre: driver.fullName,
      tipoDocumento: driver.documentTypeCode || 'DNI',
      numeroDocumento: driver.documentNumber,
      licenciaConducir: driver.license,
    });

    this.saveDraftToStorage();
  }

  /* =========================================================
     HELPERS PARA MOSTRAR PLACA
     ========================================================= */
  getTruckPlate(truck: CarrierTruck): string {
    const t: any = truck as any;
    return (
      t.plateNumber ||
      t.plate ||
      t.licensePlate ||
      t.placa ||
      t.description ||
      ''
    );
  }

  getTrailerPlate(trailer: CarrierTrailer): string {
    const t: any = trailer as any;
    return (
      t.plateNumber ||
      t.plate ||
      t.licensePlate ||
      t.placa ||
      t.description ||
      ''
    );
  }

  /* =========================================================
     NAVEGACIÓN DE PASOS
     ========================================================= */
  onStepChange(stepId: number): void {
    this.goToStep(stepId);
  }

  goToStep(step: number): void {
    if (step < 1 || step > this.maxStep) return;

    // ⚠️ PRIMERO validamos si estamos intentando avanzar
    if (step > this.currentStep) {
      const isValid = this.validateUpToStep(step - 1);
      if (!isValid) {
        // si no es válido, NO avanzamos y ya se mostró el Swal
        return;
      }
    }

    // Luego respetamos el disabled (para no saltar pasos desde el encabezado)
    const target = this.steps.find((s) => s.id === step);
    if (target?.disabled) {
      return;
    }

    this.currentStep = step;
    this.saveDraftToStorage();
  }

  nextStep(): void {
    if (this.currentStep >= this.maxStep) return;
    this.goToStep(this.currentStep + 1);
  }

  prevStep(): void {
    if (this.currentStep <= 1) return;
    this.currentStep = this.currentStep - 1;
    this.saveDraftToStorage();
  }

  /* =========================================================
     ALERTA (SWEETALERT TOAST)
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
      this.showStepWarning(
        'Completa los datos de operación antes de continuar.'
      );
      return false;
    }

    if (step >= 2 && this.origenDestino.invalid) {
      this.origenDestino.markAllAsTouched();
      this.showStepWarning('Completa el origen y destino antes de continuar.');
      return false;
    }

    if (step >= 3 && this.documentos.length === 0) {
      this.showStepWarning(
        'Agrega al menos un documento relacionado antes de continuar.'
      );
      return false;
    }

    if (step >= 4 && this.transporte.invalid) {
      this.transporte.markAllAsTouched();
      this.showStepWarning(
        'Completa los datos del transporte antes de continuar.'
      );
      return false;
    }

    if (step >= 5 && this.pesadas.length === 0) {
      this.showStepWarning(
        'Registra al menos una pesada en el detalle del ticket.'
      );
      return false;
    }

    return true;
  }

  /** Actualiza disabled / completed de cada step */
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
            step4Completed
          );
          updated.completed = step5Completed;
          break;
      }

      return updated;
    });

    const current = this.steps.find((s) => s.id === this.currentStep);
    if (current?.disabled) {
      const lastEnabled = [...this.steps].reverse().find((s) => !s.disabled);
      if (lastEnabled) {
        this.currentStep = lastEnabled.id;
      } else {
        this.currentStep = 1;
      }
    }
  }

  /* =========================================================
     DOCUMENTOS RELACIONADOS (PASO 3)
     ========================================================= */
  addDocumentoRelacionado(): void {
    this.openDocumentoModal();
  }

  editDocumentoRelacionado(row: DocumentoRelacionado, index: number): void {
    this.openDocumentoModal(row, index);
  }

  deleteDocumentoRelacionado(index: number): void {
    this.documentos.splice(index, 1);
    this.updateStepsState();
    this.saveDraftToStorage();
  }

  private openDocumentoModal(
    row?: DocumentoRelacionado,
    index?: number
  ): void {
    const modalRef = this.modalService.open(PesadaDocumento, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

    const opId = Number(this.datosOperacion.get('operacion')?.value || 0);
    (modalRef.componentInstance as any).operationId = opId;
    (modalRef.componentInstance as any).data = row ?? null;

    modalRef.result
      .then((result: DocumentoRelacionado | null | undefined) => {
        if (!result) return;

        if (index != null) {
          this.documentos[index] = result;
        } else {
          this.documentos.push(result);
        }

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

        if (!Array.isArray(result.taras)) {
          result.taras = [];
        }

        result.taraTotalKg =
          result.taras.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;
        result.pesoNetoKg = result.pesoBrutoKg - result.taraTotalKg;

        if (index != null) {
          this.pesadas[index] = result;
        } else {
          this.pesadas.push(result);
        }

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
        this.pesadas[index].taraTotalKg =
          result.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;
        this.pesadas[index].tieneTara = this.pesadas[index].taraTotalKg > 0;
        this.pesadas[index].pesoNetoKg =
          this.pesadas[index].pesoBrutoKg - this.pesadas[index].taraTotalKg;

        this.recalcularTotalesPesadas();
        this.updateStepsState();
        this.saveDraftToStorage();
      })
      .catch(() => {});
  }

  private recalcularTotalesPesadas(): void {
    const ajusteKg = Number(this.detalleTicket.get('ajusteKg')?.value || 0);

    const cantidadItems = this.pesadas.length;
    const totalPesoBruto = this.pesadas.reduce(
      (acc, p) => acc + (p.pesoBrutoKg || 0),
      0
    );
    const totalTara = this.pesadas.reduce(
      (acc, p) => acc + (p.taraTotalKg || 0),
      0
    );
    const subtotalPesoNeto = this.pesadas.reduce(
      (acc, p) => acc + (p.pesoNetoKg || 0),
      0
    );

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
     ARMADO DE PAYLOAD
     ========================================================= */
  private buildPayload() {
    const formValue: any = this.ticketForm.value;
    const datosOp = formValue.datosOperacion;
    const origenDest = formValue.origenDestino;
    const transporte = formValue.transporte;

    const ticket = {
      idBuyingStations: datosOp.sedeOperacion,
      idBuyingStationsOrigin: origenDest.sedeOrigen,
      idBuyingStationsDestination: origenDest.sedeDestino,
      idEmployees: null, // TODO: id empleado logueado
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

    const documents = this.documentos.map((d) => ({
      idDocumentTypes: d.idDocumentTypes ?? null,
      idBusinessPartners: d.idBusinessPartners ?? null,
      documentSerial: d.documento,
      documentNumber: d.numeroDocumento,
      documentDate: d.fechaDocumento,
      documentGrossWeight: d.pesoBrutoKg,
      documentNetWeight: d.pesoNetoKg,
    }));

    return {
      ticket,
      documents,
    };
  }

  /* =========================================================
     GUARDAR
     ========================================================= */
  async guardarEncabezado() {
    const ok = await this.toast.confirm(
      '¿Desea guardar el ticket de balanza?',
      {
        title: 'Enviar a revisión - Ticket de balanza',
        type: 'success',
      }
    );

    if (!ok) return;
    // TODO: llamada al API real solo de encabezado
  }

  guardarTicketCompleto(): void {
    const isValid = this.validateUpToStep(this.maxStep);
    if (!isValid) {
      this.currentStep = 1;
      return;
    }

    this.recalcularTotalesPesadas();
    this.isSavingFull = true;

    const payload = this.buildPayload();

    console.log('Payload COMPLETO ticket balanza:', payload);

    // TODO: reemplazar por llamada real al API
    setTimeout(() => {
      this.isSavingFull = false;
      this.clearDraftFromStorage();
    }, 700);
  }
}
