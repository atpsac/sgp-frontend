import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AuthService } from './auth';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

type SessionWarningVM = {
  visible: boolean;
  secondsLeft: number;
  refreshing: boolean;
};

@Injectable({ providedIn: 'root' })
export class SessionExpiryService {
  private auth = inject(AuthService);
  private modal = inject(NgbModal);

  // cuando falte 1 minuto
  private readonly warnBeforeMs = 30_000;

  private warnTimeoutId: any = null;
  private expireTimeoutId: any = null;
  private countdownId: any = null;

  private started = false;
  private sub?: Subscription;

  private vmSubject = new BehaviorSubject<SessionWarningVM>({
    visible: false,
    secondsLeft: 0,
    refreshing: false,
  });
  vm$ = this.vmSubject.asObservable();

  start(): void {
    if (this.started) return;
    this.started = true;

    this.rescheduleFromToken();

    // recalcula cuando cambien tokens (login/refresh/logout/clear)
    this.sub = this.auth.sessionChanges$.subscribe(() => {
      this.rescheduleFromToken();
    });

    // si vuelves a la pestaña
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.rescheduleFromToken();
    });

    // si otra pestaña cambia localStorage
    window.addEventListener('storage', (e) => {
      if (e.key === 'sgp_access_token' || e.key === 'sgp_refresh_token') {
        this.rescheduleFromToken();
      }
    });
  }

  stop(): void {
    this.clearTimers();
    this.hideWarning();
    this.sub?.unsubscribe();
    this.started = false;
  }

  // --- acciones UI ---
  onContinue(): void {
    const current = this.vmSubject.value;
    if (current.refreshing) return;

    if (!this.auth.getRefreshToken()) {
      this.forceLogout();
      return;
    }

    this.vmSubject.next({ ...current, refreshing: true });

    this.auth.refreshTokens().subscribe({
      next: (ok) => {
        if (!ok) {
          this.forceLogout();
          return;
        }
        this.hideWarning();
        this.rescheduleFromToken();
      },
      error: () => this.forceLogout(),
      complete: () => {
        const vm = this.vmSubject.value;
        this.vmSubject.next({ ...vm, refreshing: false });
      },
    });
  }

  onCancel(): void {
    this.forceLogout();
  }

  // --- scheduling ---
  private rescheduleFromToken(): void {
    this.clearTimers();
    this.hideWarning();

    const access = this.auth.getToken();
    if (!access) return;

    const expMs = this.getJwtExpMs(access);
    if (!expMs) return;

    const msLeft = expMs - Date.now();

    if (msLeft <= 0) {
      this.forceLogout();
      return;
    }

    // aviso
    if (msLeft <= this.warnBeforeMs) {
      this.showCountdown(Math.max(1, Math.ceil(msLeft / 1000)));
    } else {
      this.warnTimeoutId = setTimeout(() => {
        const access2 = this.auth.getToken();
        const expMs2 = access2 ? this.getJwtExpMs(access2) : null;
        const msLeft2 = expMs2 ? expMs2 - Date.now() : 0;
        const secs = Math.max(1, Math.ceil(msLeft2 / 1000));
        this.showCountdown(Math.min(60, secs));
      }, msLeft - this.warnBeforeMs);
    }

    // expiración real
    this.expireTimeoutId = setTimeout(() => {
      this.forceLogout();
    }, msLeft);
  }

  private showCountdown(seconds: number): void {
    const cur = this.vmSubject.value;
    this.vmSubject.next({
      ...cur,
      visible: true,
      secondsLeft: seconds,
      refreshing: false,
    });

    clearInterval(this.countdownId);
    this.countdownId = setInterval(() => {
      const vm = this.vmSubject.value;
      const next = vm.secondsLeft - 1;

      if (next <= 0) {
        this.forceLogout();
      } else {
        this.vmSubject.next({ ...vm, secondsLeft: next });
      }
    }, 1000);
  }

  private hideWarning(): void {
    const vm = this.vmSubject.value;
    if (!vm.visible && vm.secondsLeft === 0 && !vm.refreshing) return;
    this.vmSubject.next({ visible: false, secondsLeft: 0, refreshing: false });
  }

  private clearTimers(): void {
    if (this.warnTimeoutId) clearTimeout(this.warnTimeoutId);
    if (this.expireTimeoutId) clearTimeout(this.expireTimeoutId);
    if (this.countdownId) clearInterval(this.countdownId);

    this.warnTimeoutId = null;
    this.expireTimeoutId = null;
    this.countdownId = null;
  }

  private forceLogout(): void {
    this.clearTimers();
    this.hideWarning();

    // ✅ cerrar todos los modales abiertos (ng-bootstrap)
    try {
      this.modal.dismissAll();
    } catch {}

    // ✅ opcional: limpia overlays que a veces quedan en DOM
    this.removeModalBackdrops();

    // logout normal (tu AuthService ya limpia y redirige)
    this.auth.logout().subscribe();
  }

  private removeModalBackdrops(): void {
    // Por si quedó algún backdrop/scroll-lock pegado (casos raros)
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach((b) => b.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
  }

  // --- JWT exp decode (sin libs) ---
  private getJwtExpMs(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      const payload = this.base64UrlToJson(parts[1]) as any;
      const exp = payload?.exp;

      if (!exp || typeof exp !== 'number') return null;
      return exp * 1000;
    } catch {
      return null;
    }
  }

  private base64UrlToJson(base64Url: string): unknown {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    const json = atob(padded);
    return JSON.parse(json);
  }
}
