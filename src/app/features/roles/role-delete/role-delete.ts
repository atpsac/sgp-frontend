import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { Role } from '../services/roles';

@Component({
  selector: 'app-role-delete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-delete.html',
  styleUrl: './role-delete.scss',
})
export class RoleDelete {
  /** El padre setea esto: modalRef.componentInstance.data = row; */
  @Input() data: Partial<Role> | null = null;

  private activeModal = inject(NgbActiveModal);

  loading = false;

  get id(): number | null {
    return (this.data as any)?.RolId ?? null;
  }

  get displayName(): string {
    const codigo = this.data?.Codigo ?? '';
    const nombre = this.data?.Nombre ?? '';
    return codigo && nombre ? `${codigo} — ${nombre}` : (codigo || nombre || '');
  }

  cancel(): void {
    if (!this.loading) {
      this.activeModal.dismiss('cancel');
    }
  }

  confirmDelete(): void {
    if (!this.id && this.id !== 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Rol no válido.',
      });
      return;
    }

    this.loading = true;

    // 🔹 Simulamos eliminación SIN API (modo demo)
    setTimeout(() => {
      this.loading = false;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        html: `<span style="font-size:14px">Rol eliminado correctamente.</span>`,
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true,
        background: '#e6ffed',
        color: '#2d662d',
      });

      // Devolvemos info al padre por si quiere quitarlo del array en memoria
      this.activeModal.close({
        deleted: true,
        id: this.id,
      });
    }, 600);
  }
}
