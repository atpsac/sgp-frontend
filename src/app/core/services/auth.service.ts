import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { of, delay, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthResponse } from '../models/user';
import { SessionStore } from '../state/session.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private session = inject(SessionStore);
  private router = inject(Router);

  // MOCK: simula login. Cambia por this.api.post<AuthResponse>('/auth/login', {user, pass})
  login(user: string, pass: string) {
    const mock: AuthResponse = {
      token: 'demo-token',
      user: { id: '1', fullName: 'Operador Demo', email: 'demo@empresa.com', roles: ['admin'] }
    };
    return of(mock).pipe(
      delay(300),
      tap(r => this.session.setSession(r.token, r.user))
    );
  }

  logout() {
    this.session.clear();
    this.router.navigate(['/auth/login']);
  }
}
