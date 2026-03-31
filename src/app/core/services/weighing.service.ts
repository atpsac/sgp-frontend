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

export type SortDirection = 'asc' | 'desc';

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
   PAYLOADS / RESPUESTAS GENERALES
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
    idTrailers: number | null;
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
  idScaleTicket?: number;
  idScaleTickets?: number;
  [key: string]: any;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* =========================================================
   LISTADO DE TICKETS
   GET /scale-tickets
   ========================================================= */

export interface ScaleTicketListItem {
  id: number;

  creationDate?: string | null;

  idBuyingStations?: number | null;
  idBuyingStationsOrigin?: number | null;
  idBuyingStationsDestination?: number | null;
  idOperations?: number | null;
  idEmployees?: number | null;
  idBusinessPartnersCarriers?: number | null;
  idBusinessPartnersDrivers?: number | null;
  idTrucks?: number | null;
  idTrailers?: number | null;
  idScaleTicketStatus?: number | null;

  totalGrossWeight?: number | string | null;
  totalTareWeight?: number | string | null;
  totalTareAdjustment?: number | string | null;
  totalNetWeight?: number | string | null;

  buyingStation?: any;
  operation?: any;
  employee?: any;
  carrier?: any;
  driver?: any;
  truck?: any;
  trailer?: any;
  status?: any;

  [key: string]: any;
}

export interface ScaleTicketsQuery {
  buyingStationId?: number | null;
  ticketId?: number | null;
  operationId?: number | null;

  page?: number;
  pageSize?: number;

  sortBy?: string;
  sortDirection?: SortDirection;

  creationDateFrom?: string | null;
  creationDateTo?: string | null;
}

/* =========================================================
   SEDES / OPERACIONES
   ========================================================= */

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

interface UserStationsData {
  userId: number;
  username: string;
  employeeId: number;
  employeeFullName: string;
  stations: BuyingStation[];
}

/* =========================================================
   TRANSPORTISTAS / CONDUCTORES / VEHÍCULOS
   ========================================================= */

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

/* =========================================================
   OBTENER CABECERA DEL TICKET
   GET /scale-tickets/{ticketId}/header
   ========================================================= */

export interface ScaleTicketHeaderNamedEntity {
  id: number;
  name: string;
}

export interface ScaleTicketHeaderBusinessPartner {
  idBusinessPartners: number;
  companyName: string;
  documentNumber: string;
  idIdentityDocumentTypes: number;
  identityDocumentTypeName: string;
}

export interface ScaleTicketHeaderDriver {
  idBusinessPartners: number;
  idLicense: number | null;
  companyName: string;
  documentNumber: string;
  idIdentityDocumentTypes: number;
  identityDocumentTypeName: string;
}

export interface ScaleTicketHeaderVehicle {
  id: number;
  licensePlate: string;
}

export interface ScaleTicketHeaderStatus {
  id: number;
  name: string;
}

export interface ScaleTicketHeaderDocument {
  id: number;
  idScaleTickets: number;
  idDocumentTypes: number | null;
  documentSerial: string;
  documentNumber: string;
  documentDate: string;
  documentGrossWeight: number;
  documentNetWeight: number;
  documentTypeName: string;
  documentTypeCode: string;
}

export interface ScaleTicketHeaderCore {
  id: number;
  idBuyingStations: number;
  idBuyingStationsOrigin: number | null;
  idBuyingStationsDestination: number | null;
  idEmployees: number | null;
  idOperations: number;
  idBusinessPartnersCarriers: number | null;
  idBusinessPartnersDrivers: number | null;
  idBusinessPartnersClients: number | null;
  idBusinessPartnersSuppliers: number | null;
  idTrucks: number | null;
  idTrailers: number | null;
  idScaleTicketStatus: number | null;
  creationDate: string;
  isActive: boolean;
}

export interface ScaleTicketHeaderData {
  scaleTicket: ScaleTicketHeaderCore;
  buyingStation: ScaleTicketHeaderNamedEntity | null;
  buyingStationOrigin: ScaleTicketHeaderNamedEntity | null;
  buyingStationDestination: ScaleTicketHeaderNamedEntity | null;
  operation: ScaleTicketHeaderNamedEntity | null;
  carrier: ScaleTicketHeaderBusinessPartner | null;
  client: ScaleTicketHeaderBusinessPartner | null;
  supplier: ScaleTicketHeaderBusinessPartner | null;
  driver: ScaleTicketHeaderDriver | null;
  truck: ScaleTicketHeaderVehicle | null;
  trailer: ScaleTicketHeaderVehicle | null;
  scaleTicketStatus: ScaleTicketHeaderStatus | null;
  documents: ScaleTicketHeaderDocument[];
}

/* =========================================================
   PRODUCTOS
   ========================================================= */

export interface ProductByOperation {
  productId: number;
  productCode: string;
  productName: string;
  productTypeId: number;
  productTypeName: string;
}

/* =========================================================
   BALANZAS OPERATIVAS
   ========================================================= */

export interface OperationalScaleType {
  id: number;
  name: string;
  description: string;
}

export interface OperationalScaleStatus {
  name: string;
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
   PESADA (MEASUREMENT)
   ========================================================= */

export interface CreateMeasurementPayload {
  idProduct: number | null;
  idScale: number;
  idStableWeight: string;
  idWeighingType: number | string;
  grossWeight: number;
  measurementWeight: number | string;
  observations?: string | null;
}

export interface MeasurementCreated {
  idTicketDetail: number;
  totalGrossWeight: number;
  totalNetWeight: number;
}

/* =========================================================
   TIPOS DE EMPAQUE
   ========================================================= */

export interface PackagingType {
  id: number;
  code: string;
  name: string;
  unitTareWeight: number;
  description?: string;
  unitOrigin?: string;
}

/* =========================================================
   TARA POR DETALLE
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

export interface ScaleTicketDetailPackagingQuery {
  page?: number;
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
   DETALLES DEL TICKET
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
  page?: number;
  pageSize?: number;
  sort?: string;
  sortDirection?: SortDirection;
}

export interface ScaleTicketDetailsTotals {
  scaleTicketId?: number;
  cantidadItems: number;
  totalPesoBruto: number;
  totalTara: number;
  subtotalPesoNeto: number;
  totalTareAdjustment?: number;
  totalRecords?: number;
  [key: string]: any;
}

/* =========================================================
   CERRAR TICKET
   ========================================================= */

export interface ScaleTicketClosed {
  id?: number;
  scaleTicketId?: number;
  status?: string;
  message?: string;
  [key: string]: any;
}

/* =========================================================
   WEIGHING TYPES + INITIALIZE
   ========================================================= */

export interface WeighingType {
  weighingTypeId: number;
  name: string;
  code: string;
  description: string;
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
     AUTH HEADER
     ========================================================= */

  private readAccessToken(): string | null {
    const a: any = this.auth as any;

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

    if (!token) {
      return {};
    }

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private toNumber(value: any, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private toTrimmedString(value: any, fallback = ''): string {
    const s = String(value ?? '').trim();
    return s || fallback;
  }

  /* =========================================================
     SEDES / OPERACIONES
     ========================================================= */

  getUserBuyingStations(): Observable<BuyingStation[]> {
    const user = this.auth.getUser();
    if (!user?.id) {
      throw new Error('User not found in AuthService');
    }

    return this.http
      .get<ApiResponse<UserStationsData>>(
        `users/${user.id}/buying-stations`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data?.[0]?.stations ?? []));
  }

  getNonPrincipalBuyingStations(): Observable<BuyingStation[]> {
    return this.http
      .get<ApiResponse<BuyingStation>>(
        `buying-stations/non-principal`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  getPrincipalBuyingStation(): Observable<BuyingStation> {
    return this.http
      .get<ApiResponse<BuyingStation>>(
        `buying-stations/principal`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se encontró la sede principal en la respuesta del backend.'
          )
        )
      );
  }

  getOperationsByStation(stationId: number): Observable<OperationStation[]> {
    return this.http
      .get<ApiResponse<OperationStation>>(
        `operations/station/${stationId}`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     DOCUMENTOS
     ========================================================= */

  getBusinessPartnersByOperation(
    operationId: number
  ): Observable<BusinessPartner[]> {
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
          requireFirstRow(
            res,
            'No se encontraron documentos para la operación especificada.'
          )
        )
      );
  }

  getDocumentTypesByOperation(operationId: number): Observable<DocumentType[]> {
    return this.getOperationDocuments(operationId).pipe(
      map((od) => od.documents ?? [])
    );
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
      .get<ApiResponse<CarrierDriver>>(
        `carriers/${carrierId}/drivers`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  getCarrierTrailers(carrierId: number): Observable<CarrierTrailer[]> {
    return this.http
      .get<ApiResponse<CarrierTrailer>>(
        `carriers/${carrierId}/trailers`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  getCarrierTrucks(carrierId: number): Observable<CarrierTruck[]> {
    return this.http
      .get<ApiResponse<CarrierTruck>>(
        `carriers/${carrierId}/trucks`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     TICKET CABECERA
     ========================================================= */

  createScaleTicketHeader(
    payload: CreateScaleTicketPayload
  ): Observable<ScaleTicketCreated> {
    return this.http
      .post<ApiResponse<ScaleTicketCreated>>(
        `scale-tickets`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se recibió data al crear el ticket de balanza.'
          )
        )
      );
  }

  getScaleTicketHeader(ticketId: number): Observable<ScaleTicketHeaderData> {
    if (!ticketId) {
      throw new Error('ticketId inválido para obtener la cabecera del ticket.');
    }

    return this.http
      .get<ApiResponse<any>>(
        `scale-tickets/${ticketId}/header`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se recibió data al obtener la cabecera del ticket de balanza.'
          )
        ),
        map((row: any): ScaleTicketHeaderData => ({
          scaleTicket: {
            id: this.toNumber(row?.scaleTicket?.id),
            idBuyingStations: this.toNumber(row?.scaleTicket?.idBuyingStations),
            idBuyingStationsOrigin: this.toNumberOrNull(
              row?.scaleTicket?.idBuyingStationsOrigin
            ),
            idBuyingStationsDestination: this.toNumberOrNull(
              row?.scaleTicket?.idBuyingStationsDestination
            ),
            idEmployees: this.toNumberOrNull(row?.scaleTicket?.idEmployees),
            idOperations: this.toNumber(row?.scaleTicket?.idOperations),
            idBusinessPartnersCarriers: this.toNumberOrNull(
              row?.scaleTicket?.idBusinessPartnersCarriers
            ),
            idBusinessPartnersDrivers: this.toNumberOrNull(
              row?.scaleTicket?.idBusinessPartnersDrivers
            ),
            idBusinessPartnersClients: this.toNumberOrNull(
              row?.scaleTicket?.idBusinessPartnersClients
            ),
            idBusinessPartnersSuppliers: this.toNumberOrNull(
              row?.scaleTicket?.idBusinessPartnersSuppliers
            ),
            idTrucks: this.toNumberOrNull(row?.scaleTicket?.idTrucks),
            idTrailers: this.toNumberOrNull(row?.scaleTicket?.idTrailers),
            idScaleTicketStatus: this.toNumberOrNull(
              row?.scaleTicket?.idScaleTicketStatus
            ),
            creationDate: String(row?.scaleTicket?.creationDate ?? ''),
            isActive: Boolean(row?.scaleTicket?.isActive),
          },

          buyingStation: row?.buyingStation
            ? {
                id: this.toNumber(row.buyingStation.id),
                name: this.toTrimmedString(row.buyingStation.name),
              }
            : null,

          buyingStationOrigin: row?.buyingStationOrigin
            ? {
                id: this.toNumber(row.buyingStationOrigin.id),
                name: this.toTrimmedString(row.buyingStationOrigin.name),
              }
            : null,

          buyingStationDestination: row?.buyingStationDestination
            ? {
                id: this.toNumber(row.buyingStationDestination.id),
                name: this.toTrimmedString(row.buyingStationDestination.name),
              }
            : null,

          operation: row?.operation
            ? {
                id: this.toNumber(row.operation.id),
                name: this.toTrimmedString(row.operation.name),
              }
            : null,

          carrier: row?.carrier
            ? {
                idBusinessPartners: this.toNumber(
                  row.carrier.idBusinessPartners
                ),
                companyName: this.toTrimmedString(row.carrier.companyName),
                documentNumber: this.toTrimmedString(row.carrier.documentNumber),
                idIdentityDocumentTypes: this.toNumber(
                  row.carrier.idIdentityDocumentTypes
                ),
                identityDocumentTypeName: this.toTrimmedString(
                  row.carrier.identityDocumentTypeName
                ),
              }
            : null,

          client: row?.client
            ? {
                idBusinessPartners: this.toNumber(row.client.idBusinessPartners),
                companyName: this.toTrimmedString(row.client.companyName),
                documentNumber: this.toTrimmedString(row.client.documentNumber),
                idIdentityDocumentTypes: this.toNumber(
                  row.client.idIdentityDocumentTypes
                ),
                identityDocumentTypeName: this.toTrimmedString(
                  row.client.identityDocumentTypeName
                ),
              }
            : null,

          supplier: row?.supplier
            ? {
                idBusinessPartners: this.toNumber(
                  row.supplier.idBusinessPartners
                ),
                companyName: this.toTrimmedString(row.supplier.companyName),
                documentNumber: this.toTrimmedString(
                  row.supplier.documentNumber
                ),
                idIdentityDocumentTypes: this.toNumber(
                  row.supplier.idIdentityDocumentTypes
                ),
                identityDocumentTypeName: this.toTrimmedString(
                  row.supplier.identityDocumentTypeName
                ),
              }
            : null,

          driver: row?.driver
            ? {
                idBusinessPartners: this.toNumber(
                  row.driver.idBusinessPartners
                ),
                idLicense: this.toNumberOrNull(row.driver.idLicense),
                companyName: this.toTrimmedString(row.driver.companyName),
                documentNumber: this.toTrimmedString(row.driver.documentNumber),
                idIdentityDocumentTypes: this.toNumber(
                  row.driver.idIdentityDocumentTypes
                ),
                identityDocumentTypeName: this.toTrimmedString(
                  row.driver.identityDocumentTypeName
                ),
              }
            : null,

          truck: row?.truck
            ? {
                id: this.toNumber(row.truck.id),
                licensePlate: this.toTrimmedString(row.truck.licensePlate),
              }
            : null,

          trailer: row?.trailer
            ? {
                id: this.toNumber(row.trailer.id),
                licensePlate: this.toTrimmedString(row.trailer.licensePlate),
              }
            : null,

          scaleTicketStatus: row?.scaleTicketStatus
            ? {
                id: this.toNumber(row.scaleTicketStatus.id),
                name: this.toTrimmedString(row.scaleTicketStatus.name),
              }
            : null,

          documents: Array.isArray(row?.documents)
            ? row.documents.map(
                (doc: any): ScaleTicketHeaderDocument => ({
                  id: this.toNumber(doc?.id),
                  idScaleTickets: this.toNumber(doc?.idScaleTickets),
                  idDocumentTypes: this.toNumberOrNull(doc?.idDocumentTypes),
                  documentSerial: this.toTrimmedString(doc?.documentSerial),
                  documentNumber: this.toTrimmedString(doc?.documentNumber),
                  documentDate: String(doc?.documentDate ?? ''),
                  documentGrossWeight: this.toNumber(doc?.documentGrossWeight),
                  documentNetWeight: this.toNumber(doc?.documentNetWeight),
                  documentTypeName: this.toTrimmedString(doc?.documentTypeName),
                  documentTypeCode: this.toTrimmedString(doc?.documentTypeCode),
                })
              )
            : [],
        }))
      );
  }

  /* =========================================================
     PRODUCTOS
     ========================================================= */

  getProductsByOperation(operationId: number): Observable<ProductByOperation[]> {
    return this.http
      .get<ApiResponse<ProductByOperation>>(
        `weighing-types/${operationId}/products`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     BALANZAS OPERATIVAS POR TICKET
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
     AGREGAR PESADA
     POST /scale-tickets/{ticketId}/measurements
     ========================================================= */

  createMeasurement(
    ticketId: number,
    payload: CreateMeasurementPayload
  ): Observable<MeasurementCreated> {
    if (!ticketId) {
      throw new Error('ticketId inválido para crear la pesada.');
    }

    return this.http
      .post<ApiResponse<MeasurementCreated>>(
        `scale-tickets/${ticketId}/measurements`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se recibió data al crear el detalle de pesada.'
          )
        )
      );
  }

  /* =========================================================
     TIPOS DE EMPAQUE
     GET /scale-tickets-details/{scaleTicketDetailId}/packaging-types
     ========================================================= */

  getPackagingTypes(scaleTicketDetailId: number): Observable<PackagingType[]> {
    return this.http
      .get<ApiResponse<any>>(
        `scale-tickets-details/${scaleTicketDetailId}/packaging-types`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          (res?.data ?? []).map(
            (x: any) =>
              ({
                id: this.toNumber(x?.id),
                code: this.toTrimmedString(x?.code),
                name: this.toTrimmedString(x?.name),
                unitTareWeight: this.toNumber(x?.unitTareWeight),
                description: x?.description ?? null,
                unitOrigin: x?.unitOrigin ?? null,
              }) as PackagingType
          )
        )
      );
  }

  /* =========================================================
     CREAR TARA
     POST /scale-ticket-details/packaging-types
     ========================================================= */

  createTare(payload: CreateTarePayload): Observable<any> {
    return this.http
      .post<ApiResponse<any>>(
        `scale-ticket-details/packaging-types`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al registrar la tara.')
        )
      );
  }

  /* =========================================================
     LISTAR TARAS POR DETALLE
     ========================================================= */

  listTaresByScaleTicketDetail(
    scaleTicketDetailsId: number,
    query: ScaleTicketDetailPackagingQuery = {}
  ): Observable<Paginated<ScaleTicketDetailPackaging>> {
    if (!scaleTicketDetailsId) {
      throw new Error('scaleTicketDetailsId inválido.');
    }

    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }

    if (query.pageSize != null) {
      params = params.set('pageSize', String(query.pageSize));
    }

    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
    }

    if (query.sortDirection) {
      params = params.set('sortDirection', query.sortDirection);
    }

    return this.http
      .get<ApiResponse<Paginated<ScaleTicketDetailPackaging>>>(
        `scale-ticket-details-packaging-types/scale-ticket-details/${scaleTicketDetailsId}`,
        {
          params,
          ...(this.withAuthHeader() as any),
        }
      )
      .pipe(
        map((res: any) =>
          requireFirstRow(
            res,
            'No se recibió data al listar taras del detalle.'
          )
        ),
        map((row: any) => ({
          items: row.items ?? [],
          total: Number(row.total ?? 0),
          page: Number(row.page ?? query.page ?? 1),
          pageSize: Number(row.pageSize ?? query.pageSize ?? 10),
        }))
      );
  }

  /* =========================================================
     TOTALES DE TARA POR DETALLE
     ========================================================= */

  getTareTotals(scaleTicketDetailsId: number): Observable<TareTotals> {
    if (!scaleTicketDetailsId) {
      throw new Error('scaleTicketDetailsId inválido.');
    }

    return this.http
      .get<ApiResponse<TareTotals>>(
        `scale-ticket-details-packaging-types/scale-ticket-details/${scaleTicketDetailsId}/totals`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se recibió data al obtener totales de tara.'
          )
        )
      );
  }

  /* =========================================================
     LISTAR DETALLES DEL TICKET
     ========================================================= */

  listScaleTicketDetails(
    ticketId: number,
    query: ScaleTicketDetailsQuery = {}
  ): Observable<Paginated<ScaleTicketDetail>> {
    if (!ticketId) {
      throw new Error('ticketId inválido para listar detalles.');
    }

    let params = new HttpParams();

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }

    if (query.pageSize != null) {
      params = params.set('pageSize', String(query.pageSize));
    }

    if (query.sort) {
      params = params.set('sort', query.sort);
    }

    if (query.sortDirection) {
      params = params.set('sortDirection', query.sortDirection);
    }

    return this.http
      .get<ApiResponse<Paginated<ScaleTicketDetail>>>(
        `scale-tickets-details/${ticketId}`,
        {
          params,
          ...(this.withAuthHeader() as any),
        }
      )
      .pipe(
        map((res: any) =>
          requireFirstRow(
            res,
            'No se recibió data al listar los detalles del ticket.'
          )
        ),
        map((row: any) => ({
          items: row.items ?? [],
          total: Number(row.total ?? 0),
          page: Number(row.page ?? query.page ?? 1),
          pageSize: Number(row.pageSize ?? query.pageSize ?? 10),
        }))
      );
  }

  /* =========================================================
     TOTALES DE DETALLES DEL TICKET
     GET /scale-tickets/{ticketId}/details/totals
     ========================================================= */

  getScaleTicketDetailsTotals(
    ticketId: number
  ): Observable<ScaleTicketDetailsTotals> {
    if (!ticketId) {
      throw new Error(
        'ticketId inválido para obtener totales del detalle.'
      );
    }

    return this.http
      .get<ApiResponse<any>>(
        `scale-tickets/${ticketId}/details/totals`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se recibió data al obtener los totales del detalle del ticket.'
          )
        ),
        map((row: any) => ({
          ...row,
          scaleTicketId: this.toNumber(row?.scaleTicketId ?? ticketId),
          cantidadItems: this.toNumber(
            row?.cantidadItems ??
              row?.quantity ??
              row?.totalItems ??
              row?.itemCount ??
              row?.totalRecords ??
              row?.totalActiveRecords ??
              0
          ),
          totalPesoBruto: this.toNumber(
            row?.totalPesoBruto ??
              row?.grossWeightTotal ??
              row?.totalGrossWeight ??
              row?.grossTotal ??
              0
          ),
          totalTara: this.toNumber(
            row?.totalTara ??
              row?.tareWeightTotal ??
              row?.totalTareWeight ??
              row?.tareTotal ??
              0
          ),
          subtotalPesoNeto: this.toNumber(
            row?.subtotalPesoNeto ??
              row?.totalPesoNeto ??
              row?.netWeightTotal ??
              row?.totalNetWeight ??
              row?.netTotal ??
              0
          ),
        }))
      );
  }

  /* =========================================================
     CERRAR TICKET DE BALANZA
     PATCH /scale-tickets/{ticketId}/close
     ========================================================= */

  closeScaleTicket(ticketId: number): Observable<ScaleTicketClosed> {
    if (!ticketId) {
      throw new Error('ticketId inválido para cerrar el ticket.');
    }

    return this.http
      .patch<ApiResponse<ScaleTicketClosed>>(
        `scale-tickets/${ticketId}/close`,
        {},
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se recibió data al cerrar el ticket de balanza.'
          )
        )
      );
  }

  /* =========================================================
     LISTAR TIPOS DE PESADA
     GET /scales/{scalesId}/weighing-types
     ========================================================= */

  getWeighingTypes(scalesId: number): Observable<WeighingType[]> {
    if (!scalesId) {
      throw new Error('scalesId inválido para listar tipos de pesada.');
    }

    return this.http
      .get<ApiResponse<WeighingType>>(
        `scales/${scalesId}/weighing-types`,
        this.withAuthHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     INICIALIZAR BALANZA
     POST /scales/{scalesId}/weighings/{weighingTypeId}/initialize
     ========================================================= */

  initializeScale(
    scalesId: number,
    weighingTypeId: number
  ): Observable<InitializedDevice> {
    if (!scalesId) {
      throw new Error('scalesId inválido para inicializar.');
    }

    if (!weighingTypeId) {
      throw new Error('weighingTypeId inválido para inicializar.');
    }

    return this.http
      .post<ApiResponse<InitializeScaleRow>>(
        `scales/${scalesId}/weighings/${weighingTypeId}/initialize`,
        {},
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(
            res,
            'No se recibió data al inicializar la balanza.'
          )
        ),
        map((row) => row.device)
      );
  }

  /* =========================================================
     RESOLVER TARA DE EMPAQUE
     ========================================================= */

  resolvePackagingTare(scaleTicketDetailId: number, payload: any) {
    if (!scaleTicketDetailId) {
      throw new Error(
        'scaleTicketDetailId inválido para resolver tara de empaque.'
      );
    }

    return this.http
      .post<any>(
        `scale-tickets-details/${scaleTicketDetailId}/resolve-packaging-tare`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res: any) => {
          const d = res?.data;
          if (Array.isArray(d)) return d[0] ?? null;
          return d ?? null;
        })
      );
  }

  /* =========================================================
     LISTAR TICKETS DE BALANZA
     GET /scale-tickets
     ========================================================= */

  listScaleTickets(
    query: ScaleTicketsQuery = {}
  ): Observable<Paginated<ScaleTicketListItem>> {
    let params = new HttpParams();

    if (query.buyingStationId != null) {
      params = params.set('buyingStationId', String(query.buyingStationId));
    }

    if (query.ticketId != null && query.ticketId !== 0) {
      params = params.set('ticketId', String(query.ticketId));
    }

    if (query.operationId != null) {
      params = params.set('operationId', String(query.operationId));
    }

    if (query.page != null) {
      params = params.set('page', String(query.page));
    }

    if (query.pageSize != null) {
      params = params.set('pageSize', String(query.pageSize));
    }

    if (query.sortBy) {
      params = params.set('sortBy', String(query.sortBy));
    }

    if (query.sortDirection) {
      params = params.set('sortDirection', String(query.sortDirection));
    }

    if (query.creationDateFrom) {
      params = params.set('creationDateFrom', String(query.creationDateFrom));
    }

    if (query.creationDateTo) {
      params = params.set('creationDateTo', String(query.creationDateTo));
    }

    return this.http
      .get<ApiResponse<Paginated<ScaleTicketListItem>>>(
        `scale-tickets`,
        {
          params,
          ...(this.withAuthHeader() as any),
        }
      )
      .pipe(
        map((res: any) =>
          requireFirstRow(
            res,
            'No se recibió data al listar los tickets de balanza.'
          )
        ),
        map((row: any) => ({
          items: row?.items ?? row?.rows ?? row?.data ?? [],
          total: Number(
            row?.total ??
              row?.totalItems ??
              row?.count ??
              row?.recordsTotal ??
              0
          ),
          page: Number(row?.page ?? query.page ?? 1),
          pageSize: Number(row?.pageSize ?? row?.limit ?? query.pageSize ?? 10),
        }))
      );
  }
}