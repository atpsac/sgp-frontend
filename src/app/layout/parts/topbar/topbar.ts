import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { SessionStore } from '../../../core/state/session.store';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgIf],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar {
  // 👇 viene del layout
  @Input() collapsed = false;

  @Output() toggleMenu = new EventEmitter<void>();

  session = inject(SessionStore);
  private auth = inject(AuthService);

  userMenuOpen = false;

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu() {
    this.userMenuOpen = false;
  }

  logout() {
    this.auth.logout();
  }
}
