import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../../core/services/auth'; // ajusta la ruta si fuera necesario

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logout.html',
  styleUrl: './logout.scss',
})
export class Logout {
  loading = false;

  constructor(
    public activeModal: NgbActiveModal,
    private auth: AuthService
  ) {}

  // Cerrar con la X o botón "Cancelar"
  cancel(): void {
    if (this.loading) return;
    this.activeModal.dismiss('cancel');
  }

  // Botón "Cerrar sesión"
  confirmLogout(): void {
    if (this.loading) return;
    this.loading = true;

    this.auth.logout().subscribe({
      next: () => {
        // AuthService ya limpió sesión y navegó a /login
        this.activeModal.close('logout');
        this.loading = false;
      },
      error: () => {
        // Por si acaso, aunque en tu logout ya haces catchError
        this.activeModal.close('logout');
        this.loading = false;
      },
    });
  }
}
