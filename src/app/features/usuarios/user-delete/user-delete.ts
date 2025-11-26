import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-delete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-delete.html',
  styleUrl: './user-delete.scss',
})
export class UserDelete {

  @Input() data: any;

  private activeModal = inject(NgbActiveModal);

  loading = false;

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

  cancel(): void {
    if (!this.loading) this.activeModal.dismiss('cancel');
  }

  confirmDelete(): void {
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

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        html: `<span style="font-size:14px">Usuario eliminado correctamente .</span>`,
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true,
        background: '#e6ffed',
        color: '#2d662d',
      });

      // devolvemos info al padre por si quiere quitarlo del array en memoria
      this.activeModal.close({
        deleted: true,
        id: this.id,
      });
    }, 600);
  }
}
