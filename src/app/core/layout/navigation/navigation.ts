import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

type Item = {
  type: 'item';
  title: string;
  icon: string;
  url: string;
  exact?: boolean;
};

type Group = {
  type: 'group';
  title: string;
  children: Item[];
};

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIf, NgFor],
  templateUrl: './navigation.html',
  styleUrls: ['./navigation.scss']
})
export class NavigationComponent {
  @Input() collapsed = false;
  @Input() openMobile = false;
  @Output() close = new EventEmitter<void>();

  items: Group[] = [
    {
      type: 'group',
      title: 'INICIO',
      children: [
        {
          type: 'item',
          title: 'Panel de control',
          icon: 'home',
          url: '/dashboard',
          exact: true
        }
      ]
    },
    {
      type: 'group',
      title: 'PESADAS',
      children: [
        {
          type: 'item',
          title: 'Listado de ticket',
          icon: 'list',
          url: '/pesadas/listar'
        },
        {
          type: 'item',
          title: 'Registrar ticket',
          icon: 'add',
          url: '/pesadas/nuevo'
        }
      ]
    },
    {
      type: 'group',
      title: 'MANTENIMIENTO',
      children: [
        {
          type: 'item',
          title: 'Transportistas',
          icon: 'local_shipping',
          url: '/maintenance/carriers/listar'
        },
        {
          type: 'item',
          title: 'Choferes',
          icon: 'badge',
          url: '/maintenance/drivers/listar'
        },
        {
          type: 'item',
          title: 'Camiones',
          icon: 'fire_truck',
          url: '/maintenance/trucks/listar'
        },
        {
          type: 'item',
          title: 'Trailers',
          icon: 'rv_hookup',
          url: '/maintenance/trailers/listar'
        }
      ]
    }
  ];
}