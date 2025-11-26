import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

type Item = {
  type: 'item';
  title: string;
  icon: string;           // solo el nombre del ícono (p.ej. 'home')
  url: string;
  exact?: boolean;
};
type Group = { type: 'group'; title: string; children: Item[] };

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIf, NgFor],
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.scss']
})
export class NavigationComponent {
  /** Colapsado en desktop (solo íconos) */
  @Input() collapsed = false;
  /** Abierto en móvil (offcanvas) */
  @Input() openMobile = false;
  /** Cierre por overlay */
  @Output() close = new EventEmitter<void>();

  // Menú
  items: Group[] = [
    {
      type: 'group', title: 'INICIO',
      children: [
        { type: 'item', title: 'Panel de control', icon: 'home', url: '/dashboard', exact: true }
      ]
    },
    {
      type: 'group', title: 'PESADAS',
      children: [
        { type: 'item', title: 'Registrar ticket',  icon: 'add',  url: '/pesadas/nuevo' },
        { type: 'item', title: 'Ticket de balanza',  icon: 'inventory_2',  url: '/pesadas/listar' },
        // { type: 'item', title: 'Ticket emitidos',  icon: 'folder',  url: '/reportes' },
      ]
    },
    {
      type: 'group', title: 'USUARIOS & ACCESO',
      children: [
        { type: 'item', title: 'Usuarios', icon: 'group', url: '/usuarios' },
        { type: 'item', title: 'Roles',    icon: 'badge', url: '/roles' },
        { type: 'item', title: 'Permisos',    icon: 'lock', url: '/permisos' },
      ]
    },
    {
      type: 'group', title: 'AJUSTES',
      children: [
        { type: 'item', title: 'Empresa',   icon: 'home',       url: '/empresa' },
        { type: 'item', title: 'Sedes',   icon: 'map',       url: '/sedes' },
        { type: 'item', title: 'Transportistas',   icon: 'article',       url: '/transportista' }
      ]
    },
    {
      type: 'group', title: 'PERFIL',
      children: [
        { type: 'item', title: 'Mi perfil',   icon: 'person',       url: '/perfil' },
      ]
    }
  ];
}