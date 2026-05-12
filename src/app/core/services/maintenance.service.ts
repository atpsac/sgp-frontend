import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth';

export type SortDirection = 'asc' | 'desc';
export type StatusFilter = 'activo' | 'inactivo' | string;

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* =======================
   QUERIES
======================= */

export interface MaintenanceListQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  sortDirection?: SortDirection;
  status?: StatusFilter;
}

export interface CarrierListQuery extends MaintenanceListQuery {
  code?: string;
  companyName?: string;
  ruc?: string;
}

export interface DriverListQuery extends MaintenanceListQuery {
  fullName?: string;
  documentNumber?: string;
  license?: string;
  carrierId?: number | null;
}

export interface TruckListQuery extends MaintenanceListQuery {
  licensePlate?: string;
  configuration?: string;
  carrierId?: number | null;
}

export interface TrailerListQuery extends MaintenanceListQuery {
  licensePlate?: string;
  axleCount?: number | null;
  carrierId?: number | null;
}

/* =======================
   CARRIERS
======================= */

export interface Carrier {
  idBusinessPartners?: number;
  id?: number;
  companyName: string;
  documentNumber?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  registrationNumber?: string;
  [key: string]: any;
}

export interface CreateCarrierPayload {
  idIdentityDocumentTypes: number;
  idUbigeos: number;
  documentNumber: string;
  companyName: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  registrationNumber?: string;
}

export interface UpdateCarrierPayload {
  companyName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  registrationNumber?: string;
}

/* =======================
   DRIVERS
======================= */

export interface Driver {
  idBusinessPartners?: number;
  id?: number;
  fullName?: string;
  documentNumber?: string;
  license?: string;
  phoneNumber?: string;
  address?: string;
  [key: string]: any;
}

export interface CreateDriverPayload {
  idIdentityDocumentTypes: number;
  idUbigeos: number;
  idLicenseTypes: number;
  idBusinessPartnersCarriers: number;
  documentNumber: string;
  name: string;
  fLastname: string;
  mLastname?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  license: string;
  effectiveDate: string;
}

export interface UpdateDriverPayload {
  idBusinessPartnersCarriers?: number;
  phoneNumber?: string;
  address?: string;
  license?: string;
  effectiveDate?: string;
}

/* =======================
   TRUCKS
======================= */

export interface Truck {
  id: number;
  idBusinessPartnersCarriers?: number;
  licensePlate: string;
  payloadCapacity?: number;
  configuration?: string;
  [key: string]: any;
}

export interface CreateTruckPayload {
  idBusinessPartnersCarriers: number;
  licensePlate: string;
  payloadCapacity: number;
  configuration: string;
}

export interface UpdateTruckPayload {
  idBusinessPartnersCarriers?: number;
  licensePlate?: string;
  payloadCapacity?: number;
  configuration?: string;
}

/* =======================
   TRAILERS
======================= */

export interface Trailer {
  id: number;
  idBusinessPartnersCarriers?: number;
  licensePlate: string;
  payloadCapacity?: number;
  axleCount?: number;
  [key: string]: any;
}

export interface CreateTrailerPayload {
  idBusinessPartnersCarriers: number;
  licensePlate: string;
  payloadCapacity: number;
  axleCount: number;
}

export interface UpdateTrailerPayload {
  idBusinessPartnersCarriers?: number;
  licensePlate?: string;
  payloadCapacity?: number;
  axleCount?: number;
}

/* =======================
   HELPERS
======================= */

function requireFirstRow<T>(res: ApiResponse<T>, errMsg: string): T {
  const row = res?.data?.[0];
  if (!row) throw new Error(errMsg);
  return row;
}

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

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

    if (!token) return {};

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  private buildParams(query: Record<string, any> = {}): HttpParams {
    let params = new HttpParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  private normalizePaginated<T>(
    row: any,
    query: MaintenanceListQuery = {}
  ): Paginated<T> {
    return {
      items: row?.items ?? row?.rows ?? row?.data ?? [],
      total: Number(row?.total ?? row?.totalItems ?? row?.count ?? 0),
      page: Number(row?.page ?? query.page ?? 1),
      pageSize: Number(row?.pageSize ?? row?.limit ?? query.pageSize ?? 10),
    };
  }

  /* =======================
     CARRIERS
     POST /carriers
     GET /carriers/list
     GET /carriers/:id
     PATCH /carriers/:id
     DELETE /carriers/:id
     PATCH /carriers/:id/reactivate
  ======================= */

  createCarrier(payload: CreateCarrierPayload): Observable<Carrier> {
    return this.http
      .post<ApiResponse<Carrier>>(
        `carriers`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al crear el transportista.')
        )
      );
  }

  listCarriers(query: CarrierListQuery = {}): Observable<Paginated<Carrier>> {
    const params = this.buildParams(query);

    return this.http
      .get<ApiResponse<Paginated<Carrier>>>(`carriers/list`, {
        params,
        ...(this.withAuthHeader() as any),
      })
      .pipe(
        map((res: any) =>
          requireFirstRow(res, 'No se recibió data al listar transportistas.')
        ),
        map((row: any) => this.normalizePaginated<Carrier>(row, query))
      );
  }

  getCarrierById(carrierId: number): Observable<Carrier> {
    return this.http
      .get<ApiResponse<Carrier>>(
        `carriers/${carrierId}`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data del transportista.')
        )
      );
  }

  updateCarrier(
    carrierId: number,
    payload: UpdateCarrierPayload
  ): Observable<Carrier> {
    return this.http
      .patch<ApiResponse<Carrier>>(
        `carriers/${carrierId}`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al actualizar transportista.')
        )
      );
  }

  deleteCarrier(carrierId: number): Observable<any> {
    return this.http.delete<any>(
      `carriers/${carrierId}`,
      this.withAuthHeader()
    );
  }

  reactivateCarrier(carrierId: number): Observable<Carrier> {
    return this.http
      .patch<ApiResponse<Carrier>>(
        `carriers/${carrierId}/reactivate`,
        {},
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al reactivar transportista.')
        )
      );
  }

  /* =======================
     DRIVERS
  ======================= */

  createDriver(payload: CreateDriverPayload): Observable<Driver> {
    return this.http
      .post<ApiResponse<Driver>>(`drivers`, payload, this.withAuthHeader())
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al crear el chofer.')
        )
      );
  }

  listDrivers(query: DriverListQuery = {}): Observable<Paginated<Driver>> {
    const params = this.buildParams(query);

    return this.http
      .get<ApiResponse<Paginated<Driver>>>(`drivers/list`, {
        params,
        ...(this.withAuthHeader() as any),
      })
      .pipe(
        map((res: any) =>
          requireFirstRow(res, 'No se recibió data al listar choferes.')
        ),
        map((row: any) => this.normalizePaginated<Driver>(row, query))
      );
  }

  getDriverById(driverId: number): Observable<Driver> {
    return this.http
      .get<ApiResponse<Driver>>(
        `drivers/${driverId}`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data del chofer.')
        )
      );
  }

  updateDriver(
    driverId: number,
    payload: UpdateDriverPayload
  ): Observable<Driver> {
    return this.http
      .patch<ApiResponse<Driver>>(
        `drivers/${driverId}`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al actualizar chofer.')
        )
      );
  }

  deleteDriver(driverId: number): Observable<any> {
    return this.http.delete<any>(
      `drivers/${driverId}`,
      this.withAuthHeader()
    );
  }

  reactivateDriver(driverId: number): Observable<Driver> {
    return this.http
      .patch<ApiResponse<Driver>>(
        `drivers/${driverId}/reactivate`,
        {},
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al reactivar chofer.')
        )
      );
  }

  /* =======================
     TRUCKS
  ======================= */

  createTruck(payload: CreateTruckPayload): Observable<Truck> {
    return this.http
      .post<ApiResponse<Truck>>(`trucks`, payload, this.withAuthHeader())
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al crear el camión.')
        )
      );
  }

  listTrucks(query: TruckListQuery = {}): Observable<Paginated<Truck>> {
    const params = this.buildParams(query);

    return this.http
      .get<ApiResponse<Paginated<Truck>>>(`trucks/list`, {
        params,
        ...(this.withAuthHeader() as any),
      })
      .pipe(
        map((res: any) =>
          requireFirstRow(res, 'No se recibió data al listar camiones.')
        ),
        map((row: any) => this.normalizePaginated<Truck>(row, query))
      );
  }

  getTruckById(truckId: number): Observable<Truck> {
    return this.http
      .get<ApiResponse<Truck>>(`trucks/${truckId}`, this.withAuthHeader())
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data del camión.')
        )
      );
  }

  updateTruck(
    truckId: number,
    payload: UpdateTruckPayload
  ): Observable<Truck> {
    return this.http
      .patch<ApiResponse<Truck>>(
        `trucks/${truckId}`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al actualizar camión.')
        )
      );
  }

  deleteTruck(truckId: number): Observable<any> {
    return this.http.delete<any>(
      `trucks/${truckId}`,
      this.withAuthHeader()
    );
  }

  reactivateTruck(truckId: number): Observable<Truck> {
    return this.http
      .patch<ApiResponse<Truck>>(
        `trucks/${truckId}/reactivate`,
        {},
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al reactivar camión.')
        )
      );
  }

  /* =======================
     TRAILERS
  ======================= */

  createTrailer(payload: CreateTrailerPayload): Observable<Trailer> {
    return this.http
      .post<ApiResponse<Trailer>>(
        `trailers`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al crear el trailer.')
        )
      );
  }

  listTrailers(query: TrailerListQuery = {}): Observable<Paginated<Trailer>> {
    const params = this.buildParams(query);

    return this.http
      .get<ApiResponse<Paginated<Trailer>>>(`trailers/list`, {
        params,
        ...(this.withAuthHeader() as any),
      })
      .pipe(
        map((res: any) =>
          requireFirstRow(res, 'No se recibió data al listar trailers.')
        ),
        map((row: any) => this.normalizePaginated<Trailer>(row, query))
      );
  }

  getTrailerById(trailerId: number): Observable<Trailer> {
    return this.http
      .get<ApiResponse<Trailer>>(
        `trailers/${trailerId}`,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data del trailer.')
        )
      );
  }

  updateTrailer(
    trailerId: number,
    payload: UpdateTrailerPayload
  ): Observable<Trailer> {
    return this.http
      .patch<ApiResponse<Trailer>>(
        `trailers/${trailerId}`,
        payload,
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al actualizar trailer.')
        )
      );
  }

  deleteTrailer(trailerId: number): Observable<any> {
    return this.http.delete<any>(
      `trailers/${trailerId}`,
      this.withAuthHeader()
    );
  }

  reactivateTrailer(trailerId: number): Observable<Trailer> {
    return this.http
      .patch<ApiResponse<Trailer>>(
        `trailers/${trailerId}/reactivate`,
        {},
        this.withAuthHeader()
      )
      .pipe(
        map((res) =>
          requireFirstRow(res, 'No se recibió data al reactivar trailer.')
        )
      );
  }
}