// src/app/core/services/auth.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  // Helper para armar URL absoluta usando environment
  private api(path: string): string {
    const base = environment.apiUrl.replace(/\/+$/, ''); // quita / al final
    const clean = path.replace(/^\/+/, ''); // quita / al inicio
    return `${base}/${clean}`;
  }

  // ========= LOGIN =========
  login(email: string, password: string): Observable<LoginData> {
    const url = this.api('auth/login'); // http://.../auth/login

    return this.http
      .post<ApiResponse<LoginData>>(url, { email, password })
      .pipe(
        // Tomamos el primer elemento del array data
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
    // access → sessionStorage
    sessionStorage.setItem(this.ACCESS_KEY, res.access_token);

    // refresh → localStorage
    localStorage.setItem(this.REFRESH_KEY, res.refresh_token);

    // usuario sin tokens → localStorage
    const { access_token, refresh_token, ...user } = res;
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // ========= LOGOUT =========
  logout(): Observable<void> {
    const access = this.getToken();
    const url = this.api('auth/logout');

    // si no hay access, solo limpiamos local y redirigimos
    if (!access) {
      this.clearSession();
      this.router.navigateByUrl('/login');
      return of(void 0);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${access}`,
    });

    return this.http.post(url, {}, { headers }).pipe(
      // aunque falle el backend, limpiamos igual
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
      Authorization: `Bearer ${refresh}`, // aquí va el refresh_token
    });

    return this.http.post<ApiResponse<LoginData>>(url, null, { headers }).pipe(
      // extraemos el primer elemento de data
      map((res) => res?.data?.[0] ?? null),
      tap((user) => {
        if (!user) {
          throw new Error('Respuesta de refresh inválida (sin data)');
        }

        const { access_token, refresh_token, ...userWithoutTokens } = user;

        if (access_token) {
          sessionStorage.setItem(this.ACCESS_KEY, access_token);
        }
        if (refresh_token) {
          localStorage.setItem(this.REFRESH_KEY, refresh_token);
        }

        // opcional: actualizamos también los datos del usuario
        localStorage.setItem(this.USER_KEY, JSON.stringify(userWithoutTokens));
      }),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  // ========= MÉTODOS USADOS POR GUARDS / INTERCEPTORES =========
  // Tu authGuard ya usa esto
  isLoggedIn(): boolean {
    // Consideramos “logueado” si hay refresh token
    return !!this.getRefreshToken();
  }

  // Tu api-interceptor usa esto para el header Authorization
  getToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  getUser(): any | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  clearSession(): void {
    sessionStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}
