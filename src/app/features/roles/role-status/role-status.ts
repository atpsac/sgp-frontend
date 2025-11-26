import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-role-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-status.html',
  styleUrl: './role-status.scss',
})
export class RoleStatus {
  /** El padre setea esto: { RolId, Codigo, Nombre, FlagActivo } */
  @Input() data: any;

  private activeModal = inject(NgbActiveModal);

  loading = false;

  // Helpers
  get id(): number | null {
    return this.data?.RolId ?? null;
  }
  get nombre(): string {
    // Muestra "CODIGO — Nombre" si hay ambos
    const codigo = this.data?.Codigo ?? '';
    const nombre = this.data?.Nombre ?? '';
    return codigo && nombre ? `${codigo} — ${nombre}` : (codigo || nombre || '');
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
      Swal.fire({ icon: 'error', title: 'Error', text: 'Rol no válido.' });
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

      // devolvemos info al padre para que actualice el array en memoria
      this.activeModal.close({
        changed: true,
        RolId: this.id,
        FlagActivo: nuevoEstado,
      });
    }, 500);
  }
}
