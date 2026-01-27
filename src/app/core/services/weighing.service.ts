// src/app/core/services/weighing.service.ts
import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth';

/* =========================================================
   TIPOS GENERALES
   ========================================================= */

type SortDirection = 'asc' | 'desc';

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T[];
}

function requireFirstRow<T>(res: ApiResponse<T>, errMsg: string): T {
  const row = res?.data?.[0];
  if (!row) throw new Error(errMsg);
  return row;
}

/* =========================================================
   INTERFACES EXISTENTES
   ========================================================= */

export interface CreateScaleTicketPayload {
  ticket: {
    idBuyingStations: number;
    idBuyingStationsOrigin: number;
    idBuyingStationsDestination: number;
    idEmployees?: number | null;
    idOperations: number;
    idBusinessPartnersCarriers: number;
    idBusinessPartnersDrivers: number;
    idTrucks: number;
    idTrailers: number;
    idScaleTicketStatus?: number;
    creationDate: string;

    totalGrossWeight?: number;
    totalTareWeight?: number;
    totalTareAdjustment?: number;
  };
  documents: Array<{
    idDocumentTypes: number | null;
    idBusinessPartners: number | null;
    documentSerial: string;
    documentNumber: string;
    documentDate: string;
    documentGrossWeight: number;
    documentNetWeight: number;
  }>;
}

export interface ScaleTicketCreated {
  id?: number;
  scaleTicketId?: number;
  ScaleTicketId?: number;
  [key: string]: any;
}

export interface BuyingStation {
  id: number;
  name: string;
  address: string;
  isPrincipal: boolean;

  ubigeoCode?: string;
  ubigeoRegion?: string;
  ubigeoProvince?: string;
  ubigeoDistrict?: string;
}

export interface OperationStation {
  id: number;
  name: string;
  code: string;
  description: string;
}

export interface BusinessPartner {
  id: number;
  companyName: string;
}

export interface DocumentType {
  id: number;
  code: string;
  name: string;
}

export interface OperationDocuments {
  operationId: number;
  operationName: string;
  documents: DocumentType[];
}

export interface Carrier {
  id: number;
  companyName: string;
  documentNumber: string;
  documentTypeName: string;
  documentTypeCode: string;
  registrationNumber: string;
}

export interface CarrierDriver {
  id: number;
  fullName: string;
  documentNumber: string;
  documentTypeName: string;
  documentTypeCode: string;
  license: string;
}

export interface CarrierTrailer {
  id: number;
  licensePlate: string;
  payloadCapacity: number;
  axleCount: number;
}

export interface CarrierTruck {
  id: number;
  licensePlate: string;
  payloadCapacity: number;
  configuration: string;
}

export interface ProductByOperation {
  productId: number;
  productCode: string;
  productName: string;
  productTypeId: number;
  productTypeName: string;
}

// /users/{id}/buying-stations
interface UserStationsData {
  userId: number;
  username: string;
  employeeId: number;
  employeeFullName: string;
  stations: BuyingStation[];
}

/* =========================================================
   NUEVO: BALANZAS OPERATIVAS
   ========================================================= */

export interface OperationalScaleType {
  id: number;
  name: string;
  description: string;
}

export interface OperationalScaleStatus {
  name: string; // "OPERATIVO", etc.
}

export interface OperationalScale {
  id: number;
  idComputer: number;
  deviceName: string;
  deviceNumber: string | number;
  brand: string;
  model: string;
  serialNumber: string;
  maxCapacity: string | number;

  scaleType: OperationalScaleType;
  status: OperationalScaleStatus;
}

/* =========================================================
   NUEVO: PESADA (MEASUREMENT)
   ========================================================= */

export interface CreateMeasurementPayload {
  idProduct: number;
  idScale: number;
  idStableWeight: string; // UUID
  idWeighingType: any;
  grossWeight: number;
  measurementWeight: any;
  observations?: string | null;
}

export interface MeasurementCreated {
  idTicketDetail: number;
  totalGrossWeight: number;
  totalNetWeight: number;
}

/* =========================================================
   NUEVO: TIPOS DE EMPAQUE
   ========================================================= */

export interface PackagingType {
  id: number;
  code: string;
  name: string;
  unitTareWeight: number;     // viene como string, lo convertimos a number
  description?: string;
  unitOrigin?: string;        // ej: "UNIT"
}

/* =========================================================
   NUEVO: TARA POR DETALLE (PACKAGING TYPES EN DETALLE)
   ========================================================= */

export interface CreateTarePayload {
  idScaleTicketDetails: number;
  packagingTypesId: number;
  packageQuantity: number;
}

export interface ScaleTicketDetailPackaging {
  id: number;
  packageQuantity: number;
  registeredUnitTareWeight: string | number;
  subtotalTareWeight: string | number;
  createdAt?: string;

  packagingType: PackagingType;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ScaleTicketDetailPackagingQuery {
  page?: number; // 1-based
  pageSize?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface TareTotals {
  idScaleTicketDetails: number;
  totalActiveRecords: number;
  totalPackageQuantity: number;
  totalSubtotalTareWeight: number;
}

/* =========================================================
   NUEVO: DETALLES DEL TICKET
   ========================================================= */

export interface ScaleTicketDetail {
  id: number;
  idScaleTickets: number;

  grossWeight: string | number;
  tareWeight: string | number;
  netWeight: string | number;

  observations?: string | null;
  createdAt?: string;

  isActive: boolean;

  productName?: string;
  deviceName?: string;
  hasPackaging?: boolean;
}

export interface ScaleTicketDetailsQuery {
  page?: number; // 1-based
  pageSize?: number;
  sort?: string; // ej: 'grossWeight'
  sortDirection?: SortDirection; // 'asc' | 'desc'
}

/* =========================================================
   NUEVO: WEIGHING TYPES + INITIALIZE
   GET  /scales/{scalesId}/weighing-types
   POST /scales/{scalesId}/weighings/{weighingTypeId}/initialize
   ========================================================= */

export interface WeighingType {
  weighingTypeId: number;
  name: string;        // "PALLET+PRODUCT"
  code: string;        // "PPR"
  description: string; // "USADO PARA..."
  isTest: boolean;
}

export interface InitializedDevice {
  idComputer: number;
  deviceName: string;
  deviceNumber: string | number;
}

interface InitializeScaleRow {
  device: InitializedDevice;
}

/* =========================================================
   SERVICE
   ========================================================= */

@Injectable({ providedIn: 'root' })
export class WeighingService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /* =========================================================
     AUTH HEADER (si no hay token aquí, se asume interceptor)
     ========================================================= */

  private readAccessToken(): string | null {
    const a: any = this.auth as any;

    // Intenta nombres comunes (sin romper compilación)
    const token =
      a?.getAccessToken?.() ??
      a?.getToken?.() ??
      a?.getRawToken?.() ??
      a?.accessToken ??
      a?.token ??
      null;

    return typeof token === 'string' && token.trim() ? token.trim() : null;
  }

  private withAuthHeader() {
    const token = this.readAccessToken();
    if (!token) return {}; // si tienes interceptor, esto es suficiente
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  /* =========================================================
     SEDES / OPERACIONES
     ========================================================= */

  getUserBuyingStations(): Observable<BuyingStation[]> {
    const user = this.auth.getUser();
    if (!user?.id) throw new Error('User not found in AuthService');

    return this.http
      .get<ApiResponse<UserStationsData>>(`users/${user.id}/buying-stations`, this.withAuthHeader())
      .pipe(map((res) => res?.data?.[0]?.stations ?? []));
  }

  getNonPrincipalBuyingStations(): Observable<BuyingStation[]> {
    return this.http
      .get<ApiResponse<BuyingStation>>(`buying-stations/non-principal`, this.withAuthHeader())
      .pipe(map((res) => res?.data ?? []));
  }

  getPrincipalBuyingStation(): Observable<BuyingStation> {
    return this.http
      .get<ApiResponse<BuyingStation>>(`buying-stations/principal`, this.withAuthHeader())
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se encontró la sede principal en la respuesta del backend.')
        )
      );
  }

  getOperationsByStation(stationId: number): Observable<OperationStation[]> {
    return this.http
      .get<ApiResponse<OperationStation>>(`operations/station/${stationId}`, this.withAuthHeader())
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     DOCUMENTOS
     ========================================================= */

  getBusinessPartnersByOperation(operationId: number): Observable<BusinessPartner[]> {
    return this.http
      .get<ApiResponse<BusinessPartner>>(
        `business-partners/operation/${operationId}`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  getOperationDocuments(operationId: number): Observable<OperationDocuments> {
    return this.http
      .get<ApiResponse<OperationDocuments>>(
        `operations/${operationId}/documents`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se encontraron documentos para la operación especificada.')
        )
      );
  }

  getDocumentTypesByOperation(operationId: number): Observable<DocumentType[]> {
    return this.getOperationDocuments(operationId).pipe(map((od) => od.documents ?? []));
  }

  /* =========================================================
     TRANSPORTISTAS / CONDUCTORES / VEHÍCULOS
     ========================================================= */

  getCarriers(): Observable<Carrier[]> {
    return this.http
      .get<ApiResponse<Carrier>>(`carriers`, this.withAuthHeader())
      .pipe(map((res) => res?.data ?? []));
  }

  getCarrierDrivers(carrierId: number): Observable<CarrierDriver[]> {
    return this.http
      .get<ApiResponse<CarrierDriver>>(`carriers/${carrierId}/drivers`, this.withAuthHeader())
      .pipe(map((res) => res?.data ?? []));
  }

  getCarrierTrailers(carrierId: number): Observable<CarrierTrailer[]> {
    return this.http
      .get<ApiResponse<CarrierTrailer>>(`carriers/${carrierId}/trailers`, this.withAuthHeader())
      .pipe(map((res) => res?.data ?? []));
  }

  getCarrierTrucks(carrierId: number): Observable<CarrierTruck[]> {
    return this.http
      .get<ApiResponse<CarrierTruck>>(`carriers/${carrierId}/trucks`, this.withAuthHeader())
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     TICKET CABECERA
     ========================================================= */

  createScaleTicketHeader(payload: CreateScaleTicketPayload): Observable<ScaleTicketCreated> {
    return this.http
      .post<ApiResponse<ScaleTicketCreated>>(`scale-tickets`, payload, this.withAuthHeader())
      .pipe(map((res) => requireFirstRow(res, 'No se recibió data al crear el ticket de balanza.')));
  }

  /* =========================================================
     PRODUCTOS
     ========================================================= */

  getProductsByOperation(operationId: number): Observable<ProductByOperation[]> {
    return this.http
      .get<ApiResponse<ProductByOperation>>(`products/operation/${operationId}`, this.withAuthHeader())
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     NUEVO: BALANZAS OPERATIVAS POR TICKET
     GET /operational-scales?ticketId=9
     ========================================================= */

  getOperationalScales(ticketId: number): Observable<OperationalScale[]> {
    const params = new HttpParams().set('ticketId', String(ticketId));

    return this.http
      .get<ApiResponse<OperationalScale>>(`operational-scales`, {
        params,
        ...(this.withAuthHeader() as any),
      })
      .pipe(map((res: any) => res?.data ?? []));
  }

  /* =========================================================
     NUEVO: AGREGAR PESADA (MEASUREMENT)
     POST /scale-tickets/{ticketId}/measurements
     ========================================================= */

  createMeasurement(ticketId: number, payload: CreateMeasurementPayload): Observable<MeasurementCreated> {
    if (!ticketId) throw new Error('ticketId inválido para crear la pesada.');

    return this.http
      .post<ApiResponse<MeasurementCreated>>(
        `scale-tickets/${ticketId}/measurements`,
        payload,
        this.withAuthHeader()
      )
      .pipe(map((res) => requireFirstRow(res, 'No se recibió data al crear el detalle de pesada.')));
  }

  /* =========================================================
     NUEVO: TIPOS DE EMPAQUE
     GET /packaging-types
     ========================================================= */

getPackagingTypes(scaleTicketDetailId: number): Observable<PackagingType[]> {
  return this.http
    .get<ApiResponse<any>>(
      `scale-tickets-details/${scaleTicketDetailId}/packaging-types`,
      this.withAuthHeader()
    )
    .pipe(
      map((res) => (res?.data ?? []).map((x: any) => ({
        id: Number(x?.id ?? 0),
        code: String(x?.code ?? ''),
        name: String(x?.name ?? ''),
        unitTareWeight: Number(x?.unitTareWeight ?? 0),
        description: x?.description ?? null,
        unitOrigin: x?.unitOrigin ?? null,
      } as PackagingType)))
    );
}
  /* =========================================================
     NUEVO: CREAR TARA (ASOCIAR EMPAQUE A DETALLE)
     POST /scale-ticket-details/packaging-types
     ========================================================= */

  createTare(payload: CreateTarePayload): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(`scale-ticket-details/packaging-types`, payload, this.withAuthHeader())
      .pipe(map((res) => requireFirstRow(res, 'No se recibió data al registrar la tara.')));
  }

  /* =========================================================
     NUEVO: LISTAR TARAS POR DETALLE (PAGINADO)
     ========================================================= */

  listTaresByScaleTicketDetail(
    scaleTicketDetailsId: number,
    query: ScaleTicketDetailPackagingQuery = {}
  ): Observable<Paginated<ScaleTicketDetailPackaging>> {
    if (!scaleTicketDetailsId) throw new Error('scaleTicketDetailsId inválido.');

    let params = new HttpParams();
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.pageSize != null) params = params.set('pageSize', String(query.pageSize));
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortDirection) params = params.set('sortDirection', query.sortDirection);

    return this.http
      .get<ApiResponse<Paginated<ScaleTicketDetailPackaging>>>(
        `scale-ticket-details-packaging-types/scale-ticket-details/${scaleTicketDetailsId}`,
        { params, ...(this.withAuthHeader() as any) }
      )
      .pipe(
        map((res: any) => requireFirstRow(res, 'No se recibió data al listar taras del detalle.')),
        map((row: any) => ({
          items: row.items ?? [],
          total: Number(row.total ?? 0),
          page: Number(row.page ?? query.page ?? 1),
          pageSize: Number(row.pageSize ?? query.pageSize ?? 10),
        }))
      );
  }

  /* =========================================================
     NUEVO: TOTALES DE TARA PARA CABECERA
     ========================================================= */

  getTareTotals(scaleTicketDetailsId: number): Observable<TareTotals> {
    if (!scaleTicketDetailsId) throw new Error('scaleTicketDetailsId inválido.');

    return this.http
      .get<ApiResponse<TareTotals>>(
        `scale-ticket-details-packaging-types/scale-ticket-details/${scaleTicketDetailsId}/totals`,
        this.withAuthHeader()
      )
      .pipe(map((res) => requireFirstRow(res, 'No se recibió data al obtener totales de tara.')));
  }

  /* =========================================================
     NUEVO: LISTAR DETALLES DEL TICKET
     ========================================================= */

  listScaleTicketDetails(
    ticketId: number,
    query: ScaleTicketDetailsQuery = {}
  ): Observable<Paginated<ScaleTicketDetail>> {
    if (!ticketId) throw new Error('ticketId inválido para listar detalles.');

    let params = new HttpParams();
    if (query.page != null) params = params.set('page', String(query.page));
    if (query.pageSize != null) params = params.set('pageSize', String(query.pageSize));
    if (query.sort) params = params.set('sort', query.sort);
    if (query.sortDirection) params = params.set('sortDirection', query.sortDirection);

    return this.http
      .get<ApiResponse<Paginated<ScaleTicketDetail>>>(`scale-tickets/${ticketId}/details`, {
        params,
        ...(this.withAuthHeader() as any),
      })
      .pipe(
        map((res: any) => requireFirstRow(res, 'No se recibió data al listar los detalles del ticket.')),
        map((row: any) => ({
          items: row.items ?? [],
          total: Number(row.total ?? 0),
          page: Number(row.page ?? query.page ?? 1),
          pageSize: Number(row.pageSize ?? query.pageSize ?? 10),
        }))
      );
  }

  /* =========================================================
     ✅ NUEVO: LISTAR TIPOS DE PESADA
     GET /scales/{scalesId}/weighing-types
     ========================================================= */

  getWeighingTypes(scalesId: number): Observable<WeighingType[]> {
    if (!scalesId) throw new Error('scalesId inválido para listar tipos de pesada.');

    return this.http
      .get<ApiResponse<WeighingType>>(
        `scales/${scalesId}/weighing-types`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     ✅ NUEVO: INICIALIZAR BALANZA POR TIPO DE PESADA
     POST /scales/{scalesId}/weighings/{weighingTypeId}/initialize
     ========================================================= */

  initializeScale(scalesId: number, weighingTypeId: number): Observable<InitializedDevice> {
    if (!scalesId) throw new Error('scalesId inválido para inicializar.');
    if (!weighingTypeId) throw new Error('weighingTypeId inválido para inicializar.');

    // No requiere body según tu ejemplo (POST vacío)
    return this.http
      .post<ApiResponse<InitializeScaleRow>>(
        `scales/${scalesId}/weighings/${weighingTypeId}/initialize`,
        {},
        this.withAuthHeader()
      )
      .pipe(
        map((res) => requireFirstRow(res, 'No se recibió data al inicializar la balanza.')),
        map((row) => row.device)
      );
  }
}
