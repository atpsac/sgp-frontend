// src/app/core/services/auth.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginResponse {
  id: number;
  email: string;
  username: string;
  access_token: string;
  refresh_token: string;
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
    const base = environment.apiUrl.replace(/\/+$/, '');     // quita / al final
    const clean = path.replace(/^\/+/, '');                  // quita / al inicio
    return `${base}/${clean}`;
  }

  // ========= LOGIN =========
  login(email: string, password: string): Observable<LoginResponse> {
    const url = this.api('auth/login'); // http://161.132.194.105:3000/auth/login
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((res) => this.storeTokensAndUser(res))
    );
  }

  private storeTokensAndUser(res: LoginResponse): void {
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
      Authorization: `Bearer ${refresh}`,
    });

    return this.http.post<any>(url, null, { headers }).pipe(
      tap((res) => {
        const accessToken = res?.accessToken;
        const refreshToken = res?.refreshToken;

        if (accessToken) {
          sessionStorage.setItem(this.ACCESS_KEY, accessToken);
        }
        if (refreshToken) {
          localStorage.setItem(this.REFRESH_KEY, refreshToken);
        }
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
