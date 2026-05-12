import {
  Component,
  EventEmitter,
  Output,
  HostListener,
  ViewEncapsulation,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { Logout } from '../logout/logout';

interface NavbarUser {
  id?: number;
  email?: string;
  username?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class NavbarComponent implements OnInit {
  @Output() toggleSidebar = new EventEmitter<void>();

  userMenuOpen = false;

  user: NavbarUser | null = null;

  readonly defaultModalOptions: NgbModalOptions = {
    size: 'lg',
    centered: true,
    scrollable: true,
    backdrop: true,
    keyboard: true,
  };

  constructor(
    public router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const raw = localStorage.getItem('sgp_user');

    if (!raw) {
      this.user = null;
      return;
    }

    try {
      this.user = JSON.parse(raw);
    } catch (error) {
      console.error('Error leyendo sgp_user', error);
      this.user = null;
    }
  }

  get userName(): string {
    return this.user?.username?.trim() || 'Usuario';
  }

  get userEmail(): string {
    return this.user?.email?.trim() || 'Sin correo registrado';
  }

  get userInitials(): string {
    const username = this.user?.username?.trim();
    const email = this.user?.email?.trim();

    if (username) {
      const clean = username.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ]/g, '');

      if (clean.length >= 2) {
        return clean.substring(0, 2).toUpperCase();
      }

      return clean.substring(0, 1).toUpperCase() || 'US';
    }

    if (email) {
      return email.substring(0, 2).toUpperCase();
    }

    return 'US';
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleUserMenu(event?: MouseEvent): void {
    event?.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const insideUserBox = target.closest('.userbox');

    if (!insideUserBox) {
      this.closeUserMenu();
    }
  }

  logout(): void {
    this.closeUserMenu();
    this.modalService.open(Logout, this.defaultModalOptions);
  }
}