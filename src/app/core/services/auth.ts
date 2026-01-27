// src/app/core/services/auth.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, map, catchError, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  id?: number;
  scaleTicketId?: number;
  ScaleTicketId?: number;
  [key: string]: any;
}

// ---- NUEVAS INTERFACES SEGÚN RESPUESTA DEL BACKEND ----
export interface LoginData {
  id: number;
  email: string;
  username: string;
  access_token: string;
  refresh_token: string;
}

// Respuesta estándar del backend: status, message, data[]
export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Claves para storage
  private readonly ACCESS_KEY = 'sgp_access_token';
  private readonly REFRESH_KEY = 'sgp_refresh_token';
  private readonly USER_KEY = 'sgp_user';

  // ✅ Notificador de cambios de sesión (login/refresh/logout/clear)
  private readonly _sessionChanges$ = new BehaviorSubject<void>(void 0);
  readonly sessionChanges$ = this._sessionChanges$.asObservable();

  private emitSessionChange(): void {
    this._sessionChanges$.next(void 0);
  }

  // Helper para armar URL absoluta usando environment
  private api(path: string): string {
    const base = environment.apiUrl.replace(/\/+$/, '');
    const clean = path.replace(/^\/+/, '');
    return `${base}/${clean}`;
  }

  // ========= LOGIN =========
  login(email: string, password: string): Observable<LoginData> {
    const url = this.api('auth/login');

    return this.http
      .post<ApiResponse<LoginData>>(url, { email, password })
      .pipe(
        map((res) => {
          const user = res?.data?.[0];
          if (!user) {
            throw new Error('Respuesta de login inválida (sin data)');
          }
          return user;
        }),
        tap((user) => this.storeTokensAndUser(user))
      );
  }

  private storeTokensAndUser(res: LoginData): void {
    localStorage.setItem(this.ACCESS_KEY, res.access_token);
    localStorage.setItem(this.REFRESH_KEY, res.refresh_token);

    const { access_token, refresh_token, ...user } = res;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    // ✅ avisar que cambió la sesión
    this.emitSessionChange();
  }

  // ========= LOGOUT =========
  logout(): Observable<void> {
    const access = this.getToken();
    const url = this.api('auth/logout');

    if (!access) {
      this.clearSession();
      this.router.navigateByUrl('/login');
      return of(void 0);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${access}`,
    });

    return this.http.post(url, {}, { headers }).pipe(
      catchError(() => of(null)),
      tap(() => {
        this.clearSession();
        this.router.navigateByUrl('/login');
      }),
      map(() => void 0)
    );
  }

  // ========= REFRESH TOKENS =========
  refreshTokens(): Observable<boolean> {
    const refresh = this.getRefreshToken();
    if (!refresh) return of(false);

    const url = this.api('auth/refresh');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${refresh}`,
    });

    return this.http.post<ApiResponse<LoginData>>(url, null, { headers }).pipe(
      map((res) => res?.data?.[0] ?? null),
      tap((user) => {
        if (!user) {
          throw new Error('Respuesta de refresh inválida (sin data)');
        }

        const { access_token, refresh_token, ...userWithoutTokens } = user;

        if (access_token) {
          localStorage.setItem(this.ACCESS_KEY, access_token);
        }
        if (refresh_token) {
          localStorage.setItem(this.REFRESH_KEY, refresh_token);
        }

        localStorage.setItem(this.USER_KEY, JSON.stringify(userWithoutTokens));

        // ✅ avisar que cambió la sesión (exp del token cambió)
        this.emitSessionChange();
      }),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  // ========= MÉTODOS USADOS POR GUARDS / INTERCEPTORES =========
  isLoggedIn(): boolean {
    return !!this.getRefreshToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  getUser(): any | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  clearSession(): void {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);

    // ✅ avisar que cambió la sesión (se limpió)
    this.emitSessionChange();
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
}
