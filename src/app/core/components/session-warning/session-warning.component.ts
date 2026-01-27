import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SessionExpiryService } from '../../services/session-expiry.service';

type SessionWarningVM = {
  visible: boolean;
  secondsLeft: number;
  refreshing: boolean;
};

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container *ngIf="vm?.visible">
      <div class="sgp-toast" [style.--progress]="progress + '%'">
        <div class="sgp-ico" aria-hidden="true">!</div>

        <div class="sgp-body">
          <div class="sgp-title">Tu sesión está por vencer</div>
          <div class="sgp-sub">
            Expira en <span class="sgp-seconds">{{ vm?.secondsLeft }}</span> s.
          </div>

          <div class="sgp-actions">
            <button
              type="button"
              class="sgp-btn sgp-btn--primary"
              (click)="continue()"
              [disabled]="vm?.refreshing"
            >
              {{ vm?.refreshing ? 'Renovando…' : 'Continuar' }}
            </button>

            <button
              type="button"
              class="sgp-btn sgp-btn--ghost"
              (click)="cancel()"
              [disabled]="vm?.refreshing"
            >
              Cancelar
            </button>
          </div>
        </div>

        <button
          type="button"
          class="sgp-close"
          aria-label="Cerrar"
          (click)="cancel()"
          [disabled]="vm?.refreshing"
          title="Cerrar"
        >
          ×
        </button>

        <!-- barra progreso -->
        <div class="sgp-bar" aria-hidden="true">
          <i></i>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .sgp-toast{
      position: fixed;
      right: 14px;
      bottom: 14px;

      width: 380px;                 /* ✅ más pequeño */
      max-width: calc(100vw - 28px);
      padding: 12px 12px 10px 12px; /* ✅ más compacto */

      border-radius: 12px;
      border: 1px solid rgba(245, 158, 11, .28);
      box-shadow: 0 14px 34px rgba(0,0,0,.16);
      z-index: 9999;

      display: grid;
      grid-template-columns: 38px 1fr 34px; /* ✅ más pequeño */
      gap: 10px;
      align-items: start;

      /* ✅ amarillo suave SIN efecto inclinado */
      background: rgba(255, 251, 235, .98);
    }

    .sgp-ico{
      width: 38px;
      height: 38px;
      border-radius: 11px;

      display: grid;
      place-items: center;

      background: rgba(245, 158, 11, .18);
      border: 1px solid rgba(245, 158, 11, .25);
      color: #92400e;
      font-weight: 900;
      font-size: 18px;
      line-height: 1;
      margin-top: 1px;
    }

    .sgp-body{ padding-right: 4px; }

    .sgp-title{
      font-weight: 800;
      font-size: 13.5px;
      color: #111827;
      margin-top: 1px;
    }

    .sgp-sub{
      margin-top: 3px;
      font-size: 12.5px;
      color: rgba(17,24,39,.78);
    }

    .sgp-seconds{
      font-weight: 900;
      color: #dc2626; /* rojo */
      font-size: 13px;
    }

    .sgp-actions{
      margin-top: 8px;
      display: flex;
      gap: 8px;
    }

    .sgp-btn{
      flex: 1;
      height: 34px;            /* ✅ más pequeño */
      border-radius: 10px;
      border: 0;
      cursor: pointer;
      font-weight: 800;
      font-size: 12.5px;
      transition: transform .05s ease, opacity .15s ease;
    }
    .sgp-btn:active{ transform: translateY(1px); }
    .sgp-btn:disabled{ opacity: .7; cursor: not-allowed; }

    .sgp-btn--primary{
      background: #1d4ed8;
      color: #fff;
      box-shadow: 0 10px 18px rgba(29,78,216,.16);
    }

    .sgp-btn--ghost{
      background: rgba(255,255,255,.78);
      border: 1.5px solid rgba(220,38,38,.50);
      color: #dc2626;
    }

    .sgp-close{
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 0;
      cursor: pointer;

      background: rgba(0,0,0,.06);
      color: rgba(17,24,39,.70);
      font-size: 20px;
      line-height: 32px;
      padding: 0;
    }
    .sgp-close:disabled{ opacity: .65; cursor: not-allowed; }

    .sgp-bar{
      grid-column: 1 / -1;
      margin-top: 8px;
      height: 5px;             /* ✅ más delgada */
      border-radius: 999px;
      overflow: hidden;
      background: rgba(17,24,39,.08);
    }
    .sgp-bar i{
      display: block;
      height: 100%;
      width: var(--progress);
      border-radius: 999px;
      background: rgba(220,38,38,.85); /* barra roja */
      transition: width .25s linear;
    }
  `]
})
export class SessionWarningComponent implements OnInit, OnDestroy {
  vm: SessionWarningVM | null = null;

  // progreso 100 -> 0
  progress = 100;

  private totalSeconds = 0;
  private sub?: Subscription;

  constructor(public session: SessionExpiryService) {}

  ngOnInit(): void {
    this.sub = this.session.vm$.subscribe((vm) => {
      const wasVisible = this.vm?.visible ?? false;
      const isVisible = vm?.visible ?? false;

      // al abrir el toast, fijamos el total para el % (ej: 30s)
      if (!wasVisible && isVisible) {
        this.totalSeconds = vm.secondsLeft || 0;
      }

      this.vm = vm;

      if (!isVisible || !this.totalSeconds) {
        this.progress = 100;
        return;
      }

      const p = (vm.secondsLeft / this.totalSeconds) * 100;
      this.progress = Math.max(0, Math.min(100, Math.round(p)));
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  continue(): void {
    this.session.onContinue();
  }

  cancel(): void {
    this.session.onCancel();
  }
}
