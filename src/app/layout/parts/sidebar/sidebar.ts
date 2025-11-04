import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgFor, NgIf, NgClass } from '@angular/common';

interface SidebarItem {
  section?: string;
  label: string;
  icon: string;
  route?: string;
  children?: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgFor, NgIf, NgClass],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() closeMobile = new EventEmitter<void>();

  menu: SidebarItem[] = [
    { section: 'NAVEGACIÓN', label: 'Inicio', icon: 'bi-house', route: '/' },
    { section: 'PROCESOS', label: 'Tickets de Balanza', icon: 'bi-receipt', route: '/tickets-balanza' },
    { section: 'REPORTES', label: 'Tickets Emitidos', icon: 'bi-file-earmark-bar-graph', route: '/reportes' },
    { section: 'CONFIGURACIÓN', label: 'Acerca de', icon: 'bi-info-circle', route: '/acerca' },
    {
      section: 'OTROS',
      label: 'Niveles de Menú',
      icon: 'bi-ui-checks-grid',
      children: [
        { label: 'Nivel 1', icon: 'bi-dot', route: '/menu/level1' },
        { label: 'Nivel 2', icon: 'bi-dot', route: '/menu/level2' }
      ]
    }
  ];

  onItemClick() {
    if (this.mobileOpen) {
      this.closeMobile.emit();
    }
  }
}
