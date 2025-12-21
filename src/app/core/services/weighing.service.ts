// src/app/core/services/weighing.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth';

/* =========================================================
   INTERFACES
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

    // opcionales (si tu backend los soporta)
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
  id?: number;                 // backend puede devolver "id"
  scaleTicketId?: number;      // o "scaleTicketId"
  ScaleTicketId?: number;      // o PascalCase
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

/* ------- Transportistas / Conductores / Vehículos ------- */

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


/* ------- Respuesta estándar ------- */

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T[];
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
   SERVICE
   ========================================================= */

@Injectable({ providedIn: 'root' })
export class WeighingService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /**
   * Sedes para el usuario logueado
   * GET /users/{id}/buying-stations
   */
  getUserBuyingStations(): Observable<BuyingStation[]> {
    const user = this.auth.getUser();
    if (!user?.id) {
      throw new Error('User not found in AuthService');
    }

    return this.http
      .get<ApiResponse<UserStationsData>>(`users/${user.id}/buying-stations`)
      .pipe(
        map((res) => {
          const row = res?.data?.[0];
          return row?.stations ?? [];
        })
      );
  }

  /**
   * Sedes NO principales
   * GET /buying-stations/non-principal
   */
  getNonPrincipalBuyingStations(): Observable<BuyingStation[]> {
    return this.http
      .get<ApiResponse<BuyingStation>>(`buying-stations/non-principal`)
      .pipe(map((res) => res?.data ?? []));
  }

  /**
   * Sede principal
   * GET /buying-stations/principal
   */
  getPrincipalBuyingStation(): Observable<BuyingStation> {
    return this.http
      .get<ApiResponse<BuyingStation>>(`buying-stations/principal`)
      .pipe(
        map((res) => {
          const station = res?.data?.[0];
          if (!station) {
            throw new Error(
              'No se encontró la sede principal en la respuesta del backend.'
            );
          }
          return station;
        })
      );
  }

  /**
   * Operaciones por sede
   * GET /operations/station/{buyingStationId}
   */
  getOperationsByStation(stationId: number): Observable<OperationStation[]> {
    return this.http
      .get<ApiResponse<OperationStation>>(
        `operations/station/${stationId}`
      )
      .pipe(map((res) => res?.data ?? []));
  }

  /* =========================================================
     DOCUMENTOS
     ========================================================= */

  /**
   * Socios de negocio por operación
   * GET /business-partners/operation/{operationId}
   */
  getBusinessPartnersByOperation(
    operationId: number
  ): Observable<BusinessPartner[]> {
    return this.http
      .get<ApiResponse<BusinessPartner>>(
        `business-partners/operation/${operationId}`
      )
      .pipe(map((res) => res?.data ?? []));
  }

  /**
   * Documentos por operación
   * GET /operations/{operationId}/documents
   */
  getOperationDocuments(
    operationId: number
  ): Observable<OperationDocuments> {
    return this.http
      .get<ApiResponse<OperationDocuments>>(
        `operations/${operationId}/documents`
      )
      .pipe(
        map((res) => {
          const row = res?.data?.[0];
          if (!row) {
            throw new Error(
              'No se encontraron documentos para la operación especificada.'
            );
          }
          return row;
        })
      );
  }

  /**
   * Solo tipos de documento (array documents)
   */
  getDocumentTypesByOperation(
    operationId: number
  ): Observable<DocumentType[]> {
    return this.getOperationDocuments(operationId).pipe(
      map((od) => od.documents ?? [])
    );
  }

  /* =========================================================
     TRANSPORTISTAS / CONDUCTORES / VEHÍCULOS
     ========================================================= */

  /**
   * Lista de transportistas
   * GET /carriers
   */
  getCarriers(): Observable<Carrier[]> {
    return this.http
      .get<ApiResponse<Carrier>>(`carriers`)
      .pipe(map((res) => res?.data ?? []));
  }

  /**
   * Conductores por transportista
   * GET /carriers/{carrierId}/drivers
   */
  getCarrierDrivers(carrierId: number): Observable<CarrierDriver[]> {
    return this.http
      .get<ApiResponse<CarrierDriver>>(`carriers/${carrierId}/drivers`)
      .pipe(map((res) => res?.data ?? []));
  }

  /**
   * Trailers por transportista
   * GET /carriers/{carrierId}/trailers
   */
  getCarrierTrailers(carrierId: number): Observable<CarrierTrailer[]> {
    return this.http
      .get<ApiResponse<CarrierTrailer>>(`carriers/${carrierId}/trailers`)
      .pipe(map((res) => res?.data ?? []));
  }

  /**
   * Camiones por transportista
   * GET /carriers/{carrierId}/trucks
   */
  getCarrierTrucks(carrierId: number): Observable<CarrierTruck[]> {
    return this.http
      .get<ApiResponse<CarrierTruck>>(`carriers/${carrierId}/trucks`)
      .pipe(map((res) => res?.data ?? []));
  }





  
/**
 * Registra cabecera del ticket + documentos
 * POST /scale-tickets
 */
createScaleTicketHeader(
  payload: CreateScaleTicketPayload
): Observable<ScaleTicketCreated> {
  return this.http
    .post<ApiResponse<ScaleTicketCreated>>(`scale-tickets`, payload)
    .pipe(
      map((res) => {
        const row = res?.data?.[0];
        if (!row) {
          throw new Error('No se recibió data al crear el ticket de balanza.');
        }
        return row;
      })
    );
}



/**
   * Productos por operación
   * GET /products/operation/{operationId}
   */
  getProductsByOperation(operationId: number): Observable<ProductByOperation[]> {
    return this.http
      .get<ApiResponse<ProductByOperation>>(`products/operation/${operationId}`)
      .pipe(map((res) => res?.data ?? []));
  }






}
