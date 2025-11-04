import { Component, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// ajusta estas rutas según tu estructura real
import { Topbar } from '../parts/topbar/topbar';
import { Sidebar } from '../parts/sidebar/sidebar';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Topbar, Sidebar],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayoutComponent {
  // desktop
  isCollapsed = false;

  // mobile
  isMobileSidebarOpen = false;

  constructor() {
    this.onResize();
  }

  @HostListener('window:resize')
  onResize() {
    const isMobile = window.innerWidth < 992;
    if (isMobile) {
      this.isCollapsed = false;
      this.isMobileSidebarOpen = false;
    }
  }

  toggleSidebar() {
    const isMobile = window.innerWidth < 992;
    if (isMobile) {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    } else {
      this.isCollapsed = !this.isCollapsed;
    }
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen = false;
  }
}
