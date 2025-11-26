import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-status.html',
  styleUrl: './user-status.scss',
})
export class UserStatus {
  /** El padre setea esto: modalRef.componentInstance.data = { UsuarioId, Nombres, Apellidos, Correo, FlagActivo } */
  @Input() data: any;

  private activeModal = inject(NgbActiveModal);

  loading = false;

  // --- Getters de conveniencia ---
  get id(): number | null {
    return this.data?.UsuarioId ?? null;
  }

  get nombre(): string {
    const n = this.data?.Nombres ?? '';
    const a = this.data?.Apellidos ?? '';
    return `${n} ${a}`.trim();
  }

  get correo(): string {
    return this.data?.Correo ?? '';
  }

  get isActive(): boolean {
    return (this.data?.FlagActivo ?? 0) == 1;
  }

  get nextState(): 1 | 0 {
    return this.isActive ? 0 : 1;
  }

  get verb(): 'Activar' | 'Inactivar' {
    return this.isActive ? 'Inactivar' : 'Activar';
  }

  get verbLower(): 'activar' | 'inactivar' {
    return this.isActive ? 'inactivar' : 'activar';
  }

  get title(): string {
    return 'Cambiar estado';
  }

  get confirmLabel(): string {
    return this.verb;
  }

  cancel(): void {
    if (!this.loading) this.activeModal.dismiss('cancel');
  }

  confirm(): void {
    if (this.id === null || this.id === undefined) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Usuario no válido.',
      });
      return;
    }

    this.loading = true;

    setTimeout(() => {
      this.loading = false;

      const nuevoEstado = this.nextState; // 1 o 0

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        html: `<span style="font-size:14px">Estado actualizado: ${
          nuevoEstado === 1 ? 'ACTIVO' : 'INACTIVO'
        }.</span>`,
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true,
        background: '#e6ffed',
        color: '#2d662d',
      });

      // Devolvemos info al padre para que actualice el array en memoria
      this.activeModal.close({
        changed: true,
        UsuarioId: this.id,
        FlagActivo: nuevoEstado,
      });
    }, 500);
  }
}
