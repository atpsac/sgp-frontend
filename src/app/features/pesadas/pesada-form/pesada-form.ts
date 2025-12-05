import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

/* =========================================================
   INTERFACES / MODELOS LOCALES
   ========================================================= */

export interface DocumentoRelacionado {
  id?: number;
  socioNegocio: string;
  tipoDocumento: string;
  documento: string;
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

/* =========================================================
   COMPONENTE
   ========================================================= */

@Component({
  selector: 'app-pesada-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-form.html',
  styleUrl: './pesada-form.scss',
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
   * Reactive Form principal
   * ----------------------------------- */
  ticketForm: FormGroup;

  /* -------------------------------------
   * Datos de combos desde API
   * ----------------------------------- */
  // Sedes / operaciones
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
  totalesPesadas = {
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
    private weighingService: WeighingService
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

  /* Ciclo de vida */
  ngOnInit(): void {
    this.loadStationsAndOperations();
    this.loadCarriers();
  }

  /* =========================================================
     CARGA DE SEDES Y OPERACIONES
     ========================================================= */
  private loadStationsAndOperations(): void {
    this.isLoading = true;

    this.weighingService.getPrincipalBuyingStation().subscribe({
      next: (principal: BuyingStation) => {
        this.principalStation = principal;

        // Sedes disponibles, pero SIN asignar por defecto en el formulario
        this.stations = [principal];
        this.destinationStations = [principal];
        this.operations = [];

        // Aseguramos que los controles sigan en null
        this.datosOperacion.patchValue({
          sedeOperacion: null,
          operacion: null,
        });
        this.origenDestino.patchValue({
          sedeOrigen: null,
          sedeDestino: null,
        });

        // Sedes NO principales
        this.weighingService.getNonPrincipalBuyingStations().subscribe({
          next: (nonPrincipal: BuyingStation[]) => {
            this.stations = [principal, ...(nonPrincipal || [])];
            this.originStations = nonPrincipal || [];
          },
          error: (err) => {
            console.error('Error loading non-principal buying stations', err);
          },
          complete: () => {
            this.isLoading = false;
          },
        });

        // OJO: ya NO cargamos operaciones de la sede principal por defecto.
        // Solo se cargarán cuando el usuario seleccione una sede en el combo.
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
    this.loadOperationsForStation(stationId);
  }

  private loadOperationsForStation(stationId: number): void {
    this.operations = [];
    this.datosOperacion.patchValue({ operacion: null });

    this.weighingService.getOperationsByStation(stationId).subscribe({
      next: (ops: OperationStation[]) => {
        this.operations = ops || [];
        // Ya NO seleccionamos la primera operación por defecto.
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

        // Todo en null al inicio
        this.transportistaGroup.patchValue({
          transportistaId: null,
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
      },
      error: (err) => {
        console.error('Error loading carriers', err);
      },
    });
  }

  onChangeTransportista(): void {
    const carrierId = Number(
      this.transportistaGroup.get('transportistaId')?.value || 0
    );

    if (!carrierId) {
      // Limpia dependientes
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

    // Conductores
    this.weighingService.getCarrierDrivers(carrierId).subscribe({
      next: (drivers: CarrierDriver[]) => {
        this.carrierDrivers = drivers || [];
        this.conductorGroup.patchValue({
          conductorId: null,
          nombre: '',
          tipoDocumento: '',
          numeroDocumento: '',
          licenciaConducir: '',
        });
        // Usuario elegirá el conductor manualmente
      },
      error: (err) => {
        console.error('Error loading carrier drivers', err);
      },
    });

    // Camiones
    this.weighingService.getCarrierTrucks(carrierId).subscribe({
      next: (trucks: CarrierTruck[]) => {
        this.carrierTrucks = trucks || [];
        this.vehiculoGroup.patchValue({
          vehiculoId: null,
          // trailerId lo resetea la llamada de trailers
        });
        // Usuario elegirá el vehículo manualmente
      },
      error: (err) => {
        console.error('Error loading carrier trucks', err);
      },
    });

    // Trailers
    this.weighingService.getCarrierTrailers(carrierId).subscribe({
      next: (trailers: CarrierTrailer[]) => {
        this.carrierTrailers = trailers || [];
        this.vehiculoGroup.patchValue({
          ...this.vehiculoGroup.value,
          trailerId: null,
        });
        // Usuario elegirá el trailer manualmente
      },
      error: (err) => {
        console.error('Error loading carrier trailers', err);
      },
    });
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
  goToStep(step: number): void {
    if (step < 1 || step > this.maxStep) return;

    if (step > this.currentStep) {
      const isValid = this.validateUpToStep(step - 1);
      if (!isValid) return;
    }

    this.currentStep = step;
  }

  nextStep(): void {
    if (this.currentStep >= this.maxStep) return;
    this.goToStep(this.currentStep + 1);
  }

  prevStep(): void {
    if (this.currentStep <= 1) return;
    this.currentStep = this.currentStep - 1;
  }

  private validateUpToStep(step: number): boolean {
    let isValid = true;

    if (step >= 1 && this.datosOperacion.invalid) {
      this.datosOperacion.markAllAsTouched();
      isValid = false;
    }

    if (step >= 2 && this.origenDestino.invalid) {
      this.origenDestino.markAllAsTouched();
      isValid = false;
    }

    if (step >= 4 && this.transporte.invalid) {
      this.transporte.markAllAsTouched();
      isValid = false;
    }

    return isValid;
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
    // TODO: llamada al API real
  }

  guardarTicketCompleto(): void {
    const isValid = this.validateUpToStep(this.maxStep);
    if (!isValid) {
      this.currentStep = 1;
      return;
    }

    this.recalcularTotalesPesadas();
    this.isSavingFull = true;

    const payload = {
      ...this.ticketForm.value,
      documentos: this.documentos,
      pesadas: this.pesadas,
      totalesPesadas: this.totalesPesadas,
    };

    console.log('Payload COMPLETO ticket balanza:', payload);

    setTimeout(() => {
      this.isSavingFull = false;
    }, 700);
  }
}
