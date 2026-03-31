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
import {
  firstValueFrom,
  Subject,
  takeUntil,
} from 'rxjs';
import Swal from 'sweetalert2';

import { ActivatedRoute, Router } from '@angular/router';

import { ToastService } from '../../../shared/components/toast/toast.service';
import {
  WeighingService,
  BuyingStation,
  ScaleTicketHeaderData,
  ScaleTicketHeaderDocument,
  ScaleTicketDetail,
  ScaleTicketDetailPackaging,
  ScaleTicketDetailsTotals,
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
  private isHydrating = false;

  minFechaEmision!: string;
  maxFechaEmision!: string;
  private todayStr!: string;

  currentStep = 1;
  readonly maxStep = 5;
  showValidation = false;

  operationIdSelected: number | null = null;

  loading = false;
  loadingMessage = 'Cargando ticket...';
  loadErrorMessage = '';

  isEditMode = false;
  routeTicketId: number | null = null;

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
    private router: Router,
    private route: ActivatedRoute
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


    get ticketDisplayCode(): string {
    const id = this.headerTicketId ?? this.routeTicketId ?? null;
    if (!id) return '';
    return `TKP - ${String(id).padStart(6, '0')}`;
  }

  get pageTitle(): string {
    const id = this.headerTicketId ?? this.routeTicketId ?? null;

    if (this.isEditMode && id) {
      return `Ticket de balanza - ${this.ticketDisplayCode}`;
    }

    return 'Ticket de balanza - Nuevo';
  }

  
  /* =========================================================
     CICLO DE VIDA
     ========================================================= */

  ngOnInit(): void {
    this.setupFormSubscriptions();
    this.listenRouteParams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* =========================================================
     INICIALIZACIÓN
     ========================================================= */

  private setupFormSubscriptions(): void {
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
  }

  private listenRouteParams(): void {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const rawId = params.get('id');
        const ticketId = this.parsePositiveInt(rawId);
        void this.initializeComponent(ticketId);
      });
  }

  private async initializeComponent(ticketId: number | null): Promise<void> {
    this.loadErrorMessage = '';
    this.routeTicketId = ticketId;
    this.isEditMode = !!ticketId;

    this.resetFormStateOnly();

    if (ticketId) {
      await this.loadTicketForEdit(ticketId);
      return;
    }

    this.loadDraftFromStorage();
    this.recalcularTotalesPesadas();

    if (this.headerSaved) {
      this.lockHeaderEdition();
    }

    this.updateStepsState();
  }

  private async loadTicketForEdit(ticketId: number): Promise<void> {
    this.loading = true;
    this.isHydrating = true;
    this.loadingMessage = `Cargando ticket #${ticketId}...`;

    try {
      this.loadingMessage = 'Cargando cabecera del ticket...';

      const header = await firstValueFrom(
        this.weighingService.getScaleTicketHeader(ticketId)
      );

      await this.applyHeaderDataToForm(header, ticketId);

      this.loadingMessage = 'Cargando detalle del ticket...';
      await this.loadStep5ForEdit(ticketId);

      this.headerTicketId = ticketId;
      this.headerSaved = true;
      this.currentStep = 1;
      this.showValidation = false;

      this.lockHeaderEdition();
      this.recalcularTotalesPesadas();
      this.updateStepsState();
    } catch (error: any) {
      console.error('Error cargando ticket para edición', error);

      this.loadErrorMessage =
        error?.message || 'No se pudo cargar la información del ticket.';

      Swal.fire({
        icon: 'error',
        title: 'No se pudo cargar el ticket',
        text: this.loadErrorMessage,
      });
    } finally {
      this.isHydrating = false;
      this.loading = false;
    }
  }

  private async applyHeaderDataToForm(
    header: ScaleTicketHeaderData,
    ticketId: number
  ): Promise<void> {
    const fechaEmision = this.toDateInputValue(
      header?.scaleTicket?.creationDate
    );

    const sedeOperacion = this.createStationLite(
      header?.buyingStation?.id ?? null,
      header?.buyingStation?.name ?? '',
      true
    );

    const sedeOrigen = this.createStationLite(
      header?.buyingStationOrigin?.id ?? null,
      header?.buyingStationOrigin?.name ?? '',
      false
    );

    const sedeDestino = this.createStationLite(
      header?.buyingStationDestination?.id ?? null,
      header?.buyingStationDestination?.name ?? '',
      true
    );

    this.originStations = this.mergeStations(
      sedeOrigen ? [sedeOrigen] : [],
      this.originStations
    );

    this.destinationStations = this.mergeStations(
      sedeDestino ? [sedeDestino] : [],
      sedeOperacion ? [sedeOperacion, ...this.destinationStations] : this.destinationStations
    );

    this.ticketForm.patchValue(
      {
        datosOperacion: {
          fechaEmision,
          operacion: this.asSelectValue(header?.operation?.id),
          sedeOperacion: this.asSelectValue(header?.buyingStation?.id),
        },
        origenDestino: {
          sedeOrigen: this.asSelectValue(header?.buyingStationOrigin?.id),
          sedeDestino: this.asSelectValue(header?.buyingStationDestination?.id),
        },
        transporte: {
          transportista: {
            transportistaId: this.asSelectValue(header?.carrier?.idBusinessPartners),
            nombre: header?.carrier?.companyName ?? '',
            tipoDocumento: header?.carrier?.identityDocumentTypeName ?? '',
            numeroDocumento: header?.carrier?.documentNumber ?? '',
          },
          conductor: {
            conductorId: this.asSelectValue(header?.driver?.idBusinessPartners),
            nombre: header?.driver?.companyName ?? '',
            tipoDocumento: header?.driver?.identityDocumentTypeName ?? '',
            numeroDocumento: header?.driver?.documentNumber ?? '',
            licenciaConducir:
              header?.driver?.idLicense != null
                ? String(header.driver.idLicense)
                : '',
          },
          vehiculo: {
            vehiculoId: this.asSelectValue(header?.truck?.id),
            trailerId: this.asSelectValue(header?.trailer?.id),
          },
        },
        detalleTicket: {
          ajusteKg: 0,
        },
      },
      { emitEvent: false }
    );

    this.documentos = this.mapHeaderDocumentsToUi(header);
    this.pesadas = [];

    this.headerTicketId = ticketId;
    this.syncOperationIdSelected(header?.operation?.id ?? null);

    await this.triggerDependentEditPrefill(header);
    this.patchReadonlyTransportSnapshot(header);
  }

  private async triggerDependentEditPrefill(
    header: ScaleTicketHeaderData
  ): Promise<void> {
    const sedeOperacionId = this.asSelectValue(header?.buyingStation?.id);
    const operacionId = this.asSelectValue(header?.operation?.id);
    const carrierId = this.asSelectValue(header?.carrier?.idBusinessPartners);
    const driverId = this.asSelectValue(header?.driver?.idBusinessPartners);
    const truckId = this.asSelectValue(header?.truck?.id);
    const trailerId = this.asSelectValue(header?.trailer?.id);

    if (sedeOperacionId != null) {
      this.datosOperacion.get('sedeOperacion')?.setValue(sedeOperacionId, {
        emitEvent: true,
      });
      await this.delay(150);
    }

    if (operacionId != null) {
      this.datosOperacion.get('operacion')?.setValue(operacionId, {
        emitEvent: true,
      });
      await this.delay(150);
    }

    if (carrierId != null) {
      this.transporte.get('transportista.transportistaId')?.setValue(carrierId, {
        emitEvent: true,
      });
      await this.delay(150);
    }

    if (driverId != null) {
      this.transporte.get('conductor.conductorId')?.setValue(driverId, {
        emitEvent: true,
      });
    }

    if (truckId != null) {
      this.transporte.get('vehiculo.vehiculoId')?.setValue(truckId, {
        emitEvent: true,
      });
    }

    if (trailerId != null) {
      this.transporte.get('vehiculo.trailerId')?.setValue(trailerId, {
        emitEvent: true,
      });
    }

    await this.delay(100);
  }

  private patchReadonlyTransportSnapshot(
    header: ScaleTicketHeaderData
  ): void {
    this.ticketForm.patchValue(
      {
        transporte: {
          transportista: {
            nombre: header?.carrier?.companyName ?? '',
            tipoDocumento: header?.carrier?.identityDocumentTypeName ?? '',
            numeroDocumento: header?.carrier?.documentNumber ?? '',
          },
          conductor: {
            nombre: header?.driver?.companyName ?? '',
            tipoDocumento: header?.driver?.identityDocumentTypeName ?? '',
            numeroDocumento: header?.driver?.documentNumber ?? '',
            licenciaConducir:
              header?.driver?.idLicense != null
                ? String(header.driver.idLicense)
                : '',
          },
        },
      },
      { emitEvent: false }
    );
  }

  /* =========================================================
     PASO 5 EN EDICIÓN
     ========================================================= */

  private async loadStep5ForEdit(ticketId: number): Promise<void> {
    const detailsPage = await firstValueFrom(
      this.weighingService.listScaleTicketDetails(ticketId, {
        page: 1,
        pageSize: 500,
        sort: 'id',
        sortDirection: 'asc',
      })
    );

    const detailItems = detailsPage?.items ?? [];

    const pesadas = await Promise.all(
      detailItems.map((detail) => this.mapScaleDetailToPesada(detail))
    );

    this.pesadas = pesadas;

    let totalsFromApi: ScaleTicketDetailsTotals | null = null;

    try {
      totalsFromApi = await firstValueFrom(
        this.weighingService.getScaleTicketDetailsTotals(ticketId)
      );
    } catch (error) {
      console.warn('No se pudieron obtener los totales del ticket desde API', error);
    }

    this.applyStep5Totals(totalsFromApi, pesadas);
  }

  private async mapScaleDetailToPesada(
    detail: ScaleTicketDetail
  ): Promise<PesadaDetalle> {
    let taras: TaraItem[] = [];

    const detalleId = this.parsePositiveInt(detail?.id);

    if (detalleId && (detail?.hasPackaging || Number(detail?.tareWeight ?? 0) > 0)) {
      try {
        const tarePage = await firstValueFrom(
          this.weighingService.listTaresByScaleTicketDetail(detalleId, {
            page: 1,
            pageSize: 300,
            sortBy: 'id',
            sortDirection: 'asc',
          })
        );

        taras = (tarePage?.items ?? []).map((item) =>
          this.mapPackagingToTara(item)
        );
      } catch (error) {
        console.warn(
          `No se pudieron cargar taras para el detalle ${detalleId}`,
          error
        );
      }
    }

    const taraTotalKg = this.round2(detail?.tareWeight ?? 0);

    return {
      id: detalleId ?? undefined,
      idTicketDetail: detalleId ?? undefined,
      producto: this.safeText(detail?.productName, '—'),
      balanza: this.safeText(detail?.deviceName, '—'),
      tipoPesadaLabel: '',
      pesoBrutoKg: this.round2(detail?.grossWeight ?? 0),
      taraTotalKg,
      pesoNetoKg: this.round2(detail?.netWeight ?? 0),
      observaciones: this.safeText(detail?.observations, ''),
      requiereTara: !!detail?.hasPackaging || taraTotalKg > 0,
      tieneTara: taras.length > 0 || taraTotalKg > 0,
      estado: detail?.isActive ? 'ACTIVO' : 'INACTIVO',
      taras,
    };
  }

  private mapPackagingToTara(
    item: ScaleTicketDetailPackaging
  ): TaraItem {
    return {
      id: this.parsePositiveInt(item?.id) ?? undefined,
      empaque: this.safeText(item?.packagingType?.name, '—'),
      codigo: this.safeText(item?.packagingType?.code, '—'),
      descripcion: this.safeText(item?.packagingType?.description, ''),
      taraPorEmpaqueKg: this.round2(
        item?.registeredUnitTareWeight ??
          item?.packagingType?.unitTareWeight ??
          0
      ),
      cantidad: this.toNumber(item?.packageQuantity, 0),
      taraKg: this.round2(item?.subtotalTareWeight ?? 0),
    };
  }

  private applyStep5Totals(
    totalsFromApi: ScaleTicketDetailsTotals | null,
    pesadas: PesadaDetalle[]
  ): void {
    const apiCantidadItems =
      this.toNumberOrNull(totalsFromApi?.cantidadItems) ?? pesadas.length;

    const apiTotalPesoBruto =
      this.toNumberOrNull(totalsFromApi?.totalPesoBruto);

    const apiTotalTara =
      this.toNumberOrNull(totalsFromApi?.totalTara);

    const apiSubtotalPesoNeto =
      this.toNumberOrNull(totalsFromApi?.subtotalPesoNeto);

    const ajusteKg =
      this.toNumberOrNull(
        (totalsFromApi as any)?.ajusteKg ??
          (totalsFromApi as any)?.totalTareAdjustment ??
          (totalsFromApi as any)?.tareAdjustment ??
          0
      ) ?? 0;

    this.detalleTicket.patchValue(
      {
        ajusteKg,
      },
      { emitEvent: false }
    );

    const totalPesoBrutoCalc = this.round2(
      pesadas.reduce((acc, p) => acc + Number(p?.pesoBrutoKg ?? 0), 0)
    );

    const totalTaraCalc = this.round2(
      pesadas.reduce((acc, p) => acc + Number(p?.taraTotalKg ?? 0), 0)
    );

    const subtotalPesoNetoCalc = this.round2(
      pesadas.reduce((acc, p) => acc + Number(p?.pesoNetoKg ?? 0), 0)
    );

    const totalPesoBruto = this.round2(
      apiTotalPesoBruto ?? totalPesoBrutoCalc
    );

    const totalTara = this.round2(
      apiTotalTara ?? totalTaraCalc
    );

    const subtotalPesoNeto = this.round2(
      apiSubtotalPesoNeto ?? subtotalPesoNetoCalc
    );

    const totalPesoNeto = this.round2(subtotalPesoNeto + ajusteKg);
    const diferenciaAjuste = this.round2(totalPesoNeto - subtotalPesoNeto);

    this.totalesPesadas = {
      cantidadItems: apiCantidadItems,
      totalPesoBruto,
      totalTara,
      subtotalPesoNeto,
      ajusteKg: this.round2(ajusteKg),
      diferenciaAjuste,
      totalPesoNeto,
    };
  }

  /* =========================================================
     HELPERS DE CARGA
     ========================================================= */

  private parsePositiveInt(raw: any): number | null {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private toNumber(value: any, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private asSelectValue(value: any): string | null {
    const n = this.parsePositiveInt(value);
    return n ? String(n) : null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createStationLite(
    id: number | null,
    name: string,
    isPrincipal: boolean
  ): BuyingStation | null {
    const stationId = this.parsePositiveInt(id);
    if (!stationId) return null;

    return {
      id: stationId,
      name: String(name || '').trim(),
      address: '',
      isPrincipal,
      ubigeoCode: '',
      ubigeoRegion: '',
      ubigeoProvince: '',
      ubigeoDistrict: '',
    };
  }

  private mergeStations(
    incoming: BuyingStation[],
    existing: BuyingStation[]
  ): BuyingStation[] {
    const map = new Map<number, BuyingStation>();

    for (const item of existing || []) {
      if (item?.id) {
        map.set(item.id, item);
      }
    }

    for (const item of incoming || []) {
      if (item?.id) {
        map.set(item.id, item);
      }
    }

    return Array.from(map.values());
  }

  private resolveDocumentBusinessPartner(header: ScaleTicketHeaderData): {
    idBusinessPartners: number | null;
    companyName: string | null;
  } {
    const partner =
      header?.client ??
      header?.supplier ??
      header?.carrier ??
      null;

    return {
      idBusinessPartners: partner?.idBusinessPartners ?? null,
      companyName: partner?.companyName ?? null,
    };
  }

  private buildDocumentFullNumber(doc: ScaleTicketHeaderDocument): string {
    const serial = String(doc?.documentSerial ?? '').trim();
    const number = String(doc?.documentNumber ?? '').trim();

    if (serial && number) return `${serial}-${number}`;
    if (serial) return serial;
    if (number) return number;
    return '';
  }

  private mapHeaderDocumentsToUi(
    header: ScaleTicketHeaderData
  ): DocumentoRelacionado[] {
    const bp = this.resolveDocumentBusinessPartner(header);

    return (header?.documents ?? []).map((doc) => {
      const fullNumber = this.buildDocumentFullNumber(doc);

      return {
        id: doc?.id ?? undefined,
        socioNegocio: bp.companyName ?? null,
        tipoDocumento: doc?.documentTypeName ?? null,
        documento:
          String(doc?.documentTypeCode ?? '').trim() ||
          String(doc?.documentTypeName ?? '').trim() ||
          null,
        fechaDocumento: this.toDateInputValue(doc?.documentDate),
        numeroDocumento: fullNumber || null,
        pesoBrutoKg: this.round2(doc?.documentGrossWeight ?? 0),
        pesoNetoKg: this.round2(doc?.documentNetWeight ?? 0),

        idBusinessPartners: bp.idBusinessPartners,
        idDocumentTypes:
          doc?.idDocumentTypes != null ? Number(doc.idDocumentTypes) : null,
        serie: String(doc?.documentSerial ?? '').trim() || null,
        numeroCorrelativo:
          String(doc?.documentNumber ?? '').trim() || null,
      };
    });
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

  private toDateInputValue(value: any): string {
    const raw = String(value ?? '').trim();
    if (!raw) return this.todayStr;

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      return this.todayStr;
    }

    return this.formatLocalDate(d);
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
    if (this.isEditMode && this.routeTicketId) {
      const ok = await this.toast.confirm(
        'Se recargará la información original del ticket desde el servidor. ¿Deseas continuar?',
        { title: 'Recargar ticket', type: 'warning' }
      );

      if (!ok) return;

      await this.loadTicketForEdit(this.routeTicketId);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Ticket recargado correctamente.',
        showConfirmButton: false,
        timer: 1600,
      });
      return;
    }

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
    const principalList = payload?.principal ? [payload.principal] : [];
    const nonPrincipalList = payload?.nonPrincipal || [];

    this.destinationStations = this.mergeStations(
      principalList,
      this.destinationStations
    );

    this.originStations = this.mergeStations(
      nonPrincipalList,
      this.originStations
    );

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
    if (this.isHydrating || this.isEditMode) return;

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
      this.isHydrating = true;

      if (draft.form) {
        this.ticketForm.patchValue(draft.form, { emitEvent: false });
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
    } finally {
      this.isHydrating = false;
    }
  }

  private getDraftSnapshot(): any | null {
    if (this.isEditMode) {
      return {
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
    }

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

  private resetFormStateOnly(): void {
    this.headerSaved = false;
    this.headerTicketId = null;
    this.currentStep = 1;
    this.showValidation = false;

    this.operationIdSelected = null;
    this.originStations = [];
    this.destinationStations = [];
    this.documentos = [];
    this.pesadas = [];
    this.loadErrorMessage = '';

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

  private resetDraftHard(): void {
    this.clearDraftStorage();
    this.resetFormStateOnly();
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

      const v: any = this.ticketForm.getRawValue();

      const payload: any = {
        ticket: {
          idBuyingStations: Number(v.datosOperacion.sedeOperacion),
          idBuyingStationsOrigin: Number(v.origenDestino.sedeOrigen),
          idBuyingStationsDestination: Number(v.origenDestino.sedeDestino),
          idEmployees: null,
          idOperations: Number(v.datosOperacion.operacion),
          idBusinessPartnersCarriers: Number(
            v.transporte.transportista.transportistaId
          ),
          idBusinessPartnersDrivers: Number(
            v.transporte.conductor.conductorId
          ),
          idTrucks: Number(v.transporte.vehiculo.vehiculoId),
          idTrailers: v.transporte.vehiculo.trailerId
            ? Number(v.transporte.vehiculo.trailerId)
            : null,
          idScaleTicketStatus: 1,
          creationDate: v.datosOperacion.fechaEmision,
        },
        documents: (this.documentos || []).map((d) => ({
          idDocumentTypes:
            d.idDocumentTypes != null ? Number(d.idDocumentTypes) : null,
          idBusinessPartners:
            d.idBusinessPartners != null ? Number(d.idBusinessPartners) : null,
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

    if (typeof v === 'string') {
      const s = v.trim();

      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        return s;
      }

      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        return this.formatLocalDate(d);
      }

      return this.todayStr;
    }

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

      await this.cerrarTicketServidor(this.headerTicketId);
      ticketCerrado = true;

      const draft = this.getDraftSnapshot();
      if (!draft) {
        throw new Error('No se encontró borrador para generar el reporte.');
      }

      const qrDataUrl = await this.loadImageAsDataUrlCanvas('assets/qrcode.png');
      const report = this.buildReportFromDraft(draft, qrDataUrl);

      const filename = `TICKET_BALANZA_${this.headerTicketId}.pdf`;
      await this.generatePdfFromReport(report, filename);

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