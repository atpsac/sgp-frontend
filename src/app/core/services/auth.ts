// src/app/core/services/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

type LoginPayload = { email: string; password: string };
type LoginResponse = { token: string; user: any };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokenKey = 'admintoken';
  private userKey = 'adminuser';

  login(email: string, password: string, opts?: { remember?: boolean }): Observable<LoginResponse> {
    const body: LoginPayload = { email, password };
    return this.http.post<LoginResponse>(`${environment.api}auth/login`, body).pipe(
      tap((res: any) => {
        const storage = opts?.remember ? localStorage : sessionStorage;
        storage.setItem(this.tokenKey, res.access_token);
        storage.setItem(this.userKey, JSON.stringify(res.id));
      })
    );
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }

  isLoggedIn(): boolean {
    return !!(localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey));
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey) ?? sessionStorage.getItem(this.tokenKey);
  }

  getUser(): any | null {
    const raw = localStorage.getItem(this.userKey) ?? sessionStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : null;
  }
}
