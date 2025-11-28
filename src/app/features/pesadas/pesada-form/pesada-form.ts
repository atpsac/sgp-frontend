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
  stations: BuyingStation[] = [];            // todas las sedes (p/ paso 1)
  originStations: BuyingStation[] = [];      // solo sedes de origen (no principal)
  destinationStations: BuyingStation[] = []; // solo sedes destino (principal)
  principalStation: BuyingStation | null = null;
  operations: OperationStation[] = [];

  /* -------------------------------------
   * Datos mock
   * ----------------------------------- */
  transportistasMock: { id: number; nombre: string; ruc: string }[] = [
    {
      id: 1,
      nombre: 'TRANSPORTES Y LOGÍSTICA CAMAC E.I.R.L.',
      ruc: '20621451241',
    },
    { id: 2, nombre: 'TRANSPORTES AMAZONAS S.A.C.', ruc: '20567890123' },
  ];

  conductoresMock: {
    id: number;
    nombre: string;
    tipoDocumento: string;
    numeroDocumento: string;
    licencia: string;
  }[] = [
    {
      id: 1,
      nombre: 'CRISTIAN PAUL ANGULO ANYOSA',
      tipoDocumento: 'DNI',
      numeroDocumento: '45865258',
      licencia: 'Q4568528',
    },
    {
      id: 2,
      nombre: 'JUAN CARLOS PÉREZ RAMÍREZ',
      tipoDocumento: 'DNI',
      numeroDocumento: '42345678',
      licencia: 'B7896541',
    },
  ];

  vehiculosMock: { id: number; placa: string; placaTrailer?: string }[] = [
    { id: 1, placa: 'A0Z-547', placaTrailer: 'XDF-453' },
    { id: 2, placa: 'B1Z-123', placaTrailer: 'YGH-789' },
  ];

  trailerMock: { id: number; placa: string; placaTrailer?: string }[] = [
    { id: 1, placa: 'XDF-458', placaTrailer: 'XDF-453' },
    { id: 2, placa: 'XDF-459', placaTrailer: 'YGH-789' },
  ];

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
        sedeOrigen: [null, Validators.required],   // solo no principal
        sedeDestino: [null, Validators.required],  // solo principal
      }),

      // 4) Transporte
      transporte: this.fb.group({
        transportista: this.fb.group({
          transportistaId: [
            this.transportistasMock[0]?.id ?? null,
            Validators.required,
          ],
          nombre: [
            this.transportistasMock[0]?.nombre ?? '',
            Validators.required,
          ],
          tipoDocumento: ['RUC', Validators.required],
          numeroDocumento: [
            this.transportistasMock[0]?.ruc ?? '',
            Validators.required,
          ],
        }),

        conductor: this.fb.group({
          conductorId: [
            this.conductoresMock[0]?.id ?? null,
            Validators.required,
          ],
          nombre: [
            this.conductoresMock[0]?.nombre ?? '',
            Validators.required,
          ],
          tipoDocumento: [
            this.conductoresMock[0]?.tipoDocumento ?? 'DNI',
            Validators.required,
          ],
          numeroDocumento: [
            this.conductoresMock[0]?.numeroDocumento ?? '',
            Validators.required,
          ],
          licenciaConducir: [
            this.conductoresMock[0]?.licencia ?? '',
            Validators.required,
          ],
        }),

        vehiculo: this.fb.group({
          vehiculoId: [this.vehiculosMock[0]?.id ?? null, Validators.required],
          trailerId: [this.trailerMock[0]?.id ?? null, Validators.required],
        }),
      }),

      // 5) Detalle ticket
      detalleTicket: this.fb.group({
        ajusteKg: [0],
      }),
    });
  }

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

  /* Ciclo de vida */
  ngOnInit(): void {
    this.loadStationsAndOperations();
  }

  /* =========================================================
     CARGA DE SEDES Y OPERACIONES
     ========================================================= */
  private loadStationsAndOperations(): void {
    this.isLoading = true;

    // 1) Sede principal
    this.weighingService.getPrincipalBuyingStation().subscribe({
      next: (principal) => {
        this.principalStation = principal;

        // Para paso 1: todas las sedes (luego se agregan las no principales)
        this.stations = [principal];

        // Para destino en paso 2: solo la principal
        this.destinationStations = [principal];

        // Defaults:
        this.datosOperacion.patchValue({
          sedeOperacion: principal.id,
        });
        this.origenDestino.patchValue({
          sedeDestino: principal.id, // destino = ATP LIMA
        });

        // 2) Sedes NO principales (origen en paso 2)
        this.weighingService.getNonPrincipalBuyingStations().subscribe({
          next: (nonPrincipal) => {
            this.stations = [principal, ...nonPrincipal]; // para paso 1
            this.originStations = nonPrincipal || [];

            // Default de origen: primera no principal si existe
            if (this.originStations.length > 0) {
              this.origenDestino.patchValue({
                sedeOrigen: this.originStations[0].id,
              });
            } else {
              // Si por alguna razón no hay no-principal, fallback a principal
              this.origenDestino.patchValue({
                sedeOrigen: principal.id,
              });
            }
          },
          error: (err) => {
            console.error('Error loading non-principal buying stations', err);
          },
          complete: () => {
            this.isLoading = false;
          },
        });

        // 3) Operaciones para la sede principal
        this.loadOperationsForStation(principal.id);
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
      next: (ops) => {
        this.operations = ops || [];
        if (this.operations.length > 0) {
          this.datosOperacion.patchValue({
            operacion: this.operations[0].id,
          });
        }
      },
      error: (err) => {
        console.error('Error loading operations for station', err);
      },
    });
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

  private openDocumentoModal(row?: DocumentoRelacionado, index?: number): void {
    const modalRef = this.modalService.open(PesadaDocumento, {
      size: 'xl',
      centered: true,
      backdrop: 'static',
    });

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
    // TODO: llamada al API
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
