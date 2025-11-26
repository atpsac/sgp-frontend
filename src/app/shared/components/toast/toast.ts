// shared/components/toast/toast.ts
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export type ToastType = 'question' | 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  @Input() type: ToastType = 'info';

  @Input() title = '';          // Título grande
  @Input() subtitle = '';       // Texto pequeño bajo el título
  @Input() message = '';        // Pregunta o mensaje principal centrado

  // Chip opcional (por ejemplo nombre de usuario / ticket)
  @Input() chipLabel?: string;
  @Input() chipIcon = 'badge';

  // Caja de info opcional (como tu "El usuario quedará inactivo")
  @Input() boxTitle?: string;
  @Input() boxText?: string;

  // Botones
  @Input() confirmLabel = 'Aceptar';
  @Input() cancelLabel = 'Cancelar';
  @Input() showCancel = true;

  // Estado de carga
  @Input() loading = false;

  constructor(public activeModal: NgbActiveModal) {}

  // Icono principal según tipo
  get iconName(): string {
    switch (this.type) {
      case 'success':
        return 'check';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'question':
        return 'help';
      default:
        return 'info';
    }
  }

  // Clase extra para el modal según tipo
  get modalClass(): string {
    return `uxs-modal--${this.type}`;
  }

  confirm(): void {
    if (!this.loading) {
      this.activeModal.close(true);
    }
  }

  cancel(): void {
    if (!this.loading) {
      this.activeModal.dismiss(false);
    }
  }
}
