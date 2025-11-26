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

/* =========================================================
   INTERFACES / MODELOS LOCALES
   ========================================================= */

export interface DocumentoRelacionado {
  id?: number; // opcional, para cuando venga de BD
  socioNegocio: string;
  tipoDocumento: string; // EG, FA, BV, etc.
  documento: string; // Guía de remisión electrónica, etc.
  fechaDocumento: string; // 'YYYY-MM-DD'
  numeroDocumento: string; // combinado serie-numero o como quieras
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
  estado: string; // EN REGISTRO, CERRADA, ANULADA, etc.
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
  /* -------------------------------------
   * Paso actual (1 a 5)
   * ----------------------------------- */
  currentStep = 1;
  readonly maxStep = 5;

  /* -------------------------------------
   * Reactive Form principal (encabezado)
   * ----------------------------------- */
  ticketForm: FormGroup;

  /* -------------------------------------
   * Datos de combos (mock)
   * ----------------------------------- */
  sedeOptions: string[] = [
    'ATP - LIMA PLANTA',
    'ATP - BAGUA GRANDE',
    'ATP - SAN ALEJANDRO',
    'ATP - SATIPO',
    'ATP - PICHARI',
  ];

  operacionOptions: string[] = [
    'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL',
    'DESPACHO DE PRODUCTO - PLANTA PRINCIPAL',
    'RECEPCIÓN DE PRODUCTO - SEDE DE ACOPIO',
    'REPEAJE - SEDE DE ACOPIO',
  ];

  transportistasMock: { id: number; nombre: string; ruc: string }[] = [
    { id: 1, nombre: 'TRANSPORTES Y LOGÍSTICA CAMAC E.I.R.L.', ruc: '20621451241' },
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
   * Tablas (arrays en memoria)
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
    ajusteKg: 0, // se puede editar desde el form (detalleTicket.ajusteKg)
    diferenciaAjuste: 0,
    totalPesoNeto: 0,
  };

  /* -------------------------------------
   * Flags de UI
   * ----------------------------------- */
  isSavingHeader = false; // para guardar hasta paso 4 (encabezado)
  isSavingFull = false;   // para guardar todo el ticket
  isLoading = false;

  /* -------------------------------------
   * Constructor
   * ----------------------------------- */
  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    public toast: ToastService
  ) {
    const today = new Date().toISOString().substring(0, 10);

    this.ticketForm = this.fb.group({
      // 1) Datos de operación
      datosOperacion: this.fb.group({
        fechaEmision: [today, Validators.required],
        operacion: [this.operacionOptions[0] ?? '', Validators.required],
        sedeOperacion: [this.sedeOptions[0] ?? '', Validators.required],
      }),

      // 2) Origen / destino
      origenDestino: this.fb.group({
        sedeOrigen: [this.sedeOptions[0] ?? '', Validators.required],
        sedeDestino: ['ATP - LIMA PLANTA', Validators.required],
      }),

      // 4) Datos del transporte (grupo completo)
      transporte: this.fb.group({
        transportista: this.fb.group({
          transportistaId: [this.transportistasMock[0]?.id ?? null, Validators.required],
          nombre: [this.transportistasMock[0]?.nombre ?? '', Validators.required],
          tipoDocumento: ['RUC', Validators.required],
          numeroDocumento: [this.transportistasMock[0]?.ruc ?? '', Validators.required],
        }),

        conductor: this.fb.group({
          conductorId: [this.conductoresMock[0]?.id ?? null, Validators.required],
          nombre: [this.conductoresMock[0]?.nombre ?? '', Validators.required],
          tipoDocumento: [this.conductoresMock[0]?.tipoDocumento ?? 'DNI', Validators.required],
          numeroDocumento: [this.conductoresMock[0]?.numeroDocumento ?? '', Validators.required],
          licenciaConducir: [this.conductoresMock[0]?.licencia ?? '', Validators.required],
        }),

        vehiculo: this.fb.group({
          vehiculoId: [this.vehiculosMock[0]?.id ?? null, Validators.required],
          trailerId: [this.trailerMock[0]?.id ?? null, Validators.required],
          // placaVehiculo: [this.vehiculosMock[0]?.placa ?? '', Validators.required],
          // placaTrailer: [this.vehiculosMock[0]?.placaTrailer ?? ''],
        }),
      }),

      // 5) Detalle del ticket (campos de cabecera de totales)
      detalleTicket: this.fb.group({
        ajusteKg: [0], // manual si quieres
      }),
    });
  }

  /* -------------------------------------
   * Getters rápidos
   * ----------------------------------- */
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

  /* -------------------------------------
   * Ciclo de vida
   * ----------------------------------- */
  ngOnInit(): void {
    // Aquí podrías cargar combos desde servicios cuando tengas API.
  }

  /* =========================================================
     NAVEGACIÓN DE PASOS
     ========================================================= */

  goToStep(step: number): void {
    if (step < 1 || step > this.maxStep) return;

    // Validar si intento ir hacia adelante
    if (step > this.currentStep) {
      const isValid = this.validateUpToStep(step - 1);
      if (!isValid) return;
    }

    this.currentStep = step;
  }

  nextStep(): void {
    if (this.currentStep >= this.maxStep) return;
    const target = this.currentStep + 1;
    this.goToStep(target);
  }

  prevStep(): void {
    if (this.currentStep <= 1) return;
    this.currentStep = this.currentStep - 1;
  }

  /**
   * Valida todos los grupos necesarios hasta determinado paso.
   * Si algo es inválido, marca como touched para mostrar errores.
   */
  private validateUpToStep(step: number): boolean {
    let isValid = true;

    if (step >= 1) {
      if (this.datosOperacion.invalid) {
        this.datosOperacion.markAllAsTouched();
        isValid = false;
      }
    }

    if (step >= 2) {
      if (this.origenDestino.invalid) {
        this.origenDestino.markAllAsTouched();
        isValid = false;
      }
    }

    if (step >= 4) {
      if (this.transporte.invalid) {
        this.transporte.markAllAsTouched();
        isValid = false;
      }
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

    // Pasar data inicial al modal (para editar)
    (modalRef.componentInstance as any).data = row ?? null;

    modalRef.result
      .then((result: DocumentoRelacionado | null | undefined) => {
        if (!result) return;

        // Si vino índice -> es edición
        if (index != null) {
          this.documentos[index] = result;
        } else {
          this.documentos.push(result);
        }
      })
      .catch(() => {
        // cerrado sin guardar
      });
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

  /**
   * Modal para agregar/editar una pesada.
   * Debe devolver un PesadaDetalle (sin taras o con taras iniciales).
   */
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

        // Aseguramos estructura mínima
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
      .catch(() => {
        // cerrado sin guardar
      });
  }

  /**
   * Abre el modal de taras para una pesada específica.
   */
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

        // Actualizar taras de la pesada
        this.pesadas[index].taras = result;
        this.pesadas[index].taraTotalKg =
          result.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;
        this.pesadas[index].tieneTara = this.pesadas[index].taraTotalKg > 0;
        this.pesadas[index].pesoNetoKg =
          this.pesadas[index].pesoBrutoKg - this.pesadas[index].taraTotalKg;

        this.recalcularTotalesPesadas();
      })
      .catch(() => {
        // cerrado sin cambios
      });
  }

  /**
   * Recalcula los totales de la sección Detalle del ticket.
   */
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

  /**
   * Cuando el usuario cambia manualmente el ajuste en el form.
   */
  onChangeAjusteKg(): void {
    this.recalcularTotalesPesadas();
  }

  /* =========================================================
     GUARDAR / ENVIAR
     ========================================================= */

  /**
   * Guardar solo encabezado (hasta paso 4).
   * Útil si luego el API maneja "crear ticket" y después se van agregando detalles.
   */
  async guardarEncabezado() {


    const ok = await this.toast.confirm(
    '¿Desea guardar el ticket de balanza?',
    {
      title: 'Enviar a revisión - Ticket de balanza',
      type: 'success',
    }
  );

  if (!ok) return;



    // const isValid = this.validateUpToStep(4);
    // if (!isValid) {
    //   this.currentStep = 1;
    //   return;
    // }

    // this.isSavingHeader = true;

    // const payloadEncabezado = {
    //   ...this.ticketForm.value,
    //   documentos: this.documentos, // podrías excluir todavía si quieres
    // };

    // // TODO: llamar a tu servicio HTTP para guardar encabezado.
    // console.log('Payload encabezado ticket balanza:', payloadEncabezado);

    // // Simulación
    // setTimeout(() => {
    //   this.isSavingHeader = false;
    // }, 500);
  }

  /**
   * Guardar ticket completo con detalles de pesadas y taras.
   */
  guardarTicketCompleto(): void {
    const isValid = this.validateUpToStep(this.maxStep);
    if (!isValid) {
      // Si algo falla, me voy al primer paso
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

    // TODO: reemplazar por llamada real a tu API
    console.log('Payload COMPLETO ticket balanza:', payload);

    setTimeout(() => {
      this.isSavingFull = false;
      // Aquí podrías redirigir al listado o mostrar Swal de éxito
    }, 700);
  }
}
