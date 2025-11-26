import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

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
    public activeModal: NgbActiveModal, // ng-bootstrap inyecta esto
    private router: Router
  ) {}

  // Cerrar con la X o botón "Cancelar"
  cancel(): void {
    if (this.loading) return;
    this.activeModal.dismiss('cancel'); // cierra el modal
  }

  // Botón "Cerrar sesión"
  async confirmLogout(): Promise<void> {
    if (this.loading) return;
    this.loading = true;

    try {
      // Limpia datos de sesión
      localStorage.clear();
      sessionStorage.clear();

      // Cierra el modal
      this.activeModal.close('logout');

      // Redirige al login
      await this.router.navigate(['/login']);
    } finally {
      this.loading = false;
    }
  }
}
