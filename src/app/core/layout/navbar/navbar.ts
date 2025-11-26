import {
  Component,
  EventEmitter,
  Output,
  HostListener,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { Logout } from '../logout/logout';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  encapsulation: ViewEncapsulation.None, // estilos globales para el modal
})
export class NavbarComponent {
  /** Emite para colapsar/expandir el sidebar (desktop y mobile) */
  @Output() toggleSidebar = new EventEmitter<void>();

  /** Menú de usuario (3 puntitos) */
  userMenuOpen = false;

  /** Opciones por defecto para cualquier modal (logout, ver foto, etc.) */
  readonly defaultModalOptions: NgbModalOptions = {
    size: 'lg',
    centered: true,
    scrollable: true,
    backdrop: true,   // ← permite cerrar haciendo click fuera
    keyboard: true,   // ← permite cerrar con ESC
  };

  constructor(
    public router: Router,
    private modalService: NgbModal
  ) {}

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu() {
    this.userMenuOpen = false;
  }

  /** Cierra el menú de usuario al hacer click fuera de él */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const insideUserBox = target.closest('.userbox');
    if (!insideUserBox) {
      this.closeUserMenu();
    }
  }

  logout() {
    this.closeUserMenu();

    // Modal de logout: se cierra al hacer click afuera y está por encima de todo
    this.modalService.open(Logout, this.defaultModalOptions);
  }

  /**
   * Ejemplo si abres un modal de FOTO desde aquí u otro componente:
   * this.modalService.open(FotoComponent, this.defaultModalOptions);
   */
}
