import { Injectable, computed, signal } from '@angular/core';
import { User } from '../models/user';

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readToken() { return localStorage.getItem('token'); }
  private readUser(): User | null {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  }

  readonly token = signal<string | null>(this.readToken());
  readonly user  = signal<User  | null>(this.readUser());
  readonly isAuth = computed(() => !!this.token());

  setSession(token: string, user: User) {
    this.token.set(token);
    this.user.set(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clear() {
    this.token.set(null);
    this.user.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
