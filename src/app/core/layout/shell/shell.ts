import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { NavigationComponent } from '../navigation/navigation';
import { NavbarComponent } from '../navbar/navbar';
import { Footer } from "../footer/footer";


@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent, NavbarComponent, Footer],
  templateUrl: './shell.html',
  styleUrls: ['./shell.scss'],
})
export class Shell {
  /** ancho actual */
  width = window.innerWidth;

  /** sidebar colapsado (solo íconos) en desktop */
  collapsed = false;

  /** sidebar abierto tipo offcanvas en móvil */
  openMobile = false;

  @HostListener('window:resize', ['$event'])
  onResize(ev: UIEvent) {
    this.width = (ev.target as Window).innerWidth;
    // si paso a desktop, cierro el offcanvas móvil
    if (this.width >= 992) this.openMobile = false;
  }

  /** el navbar pide alternar el sidebar */
  onToggleSidebar() {
    if (this.width >= 992) {
      // desktop: colapsar/expandir
      this.collapsed = !this.collapsed;
    } else {
      // móvil: abrir/cerrar offcanvas
      this.openMobile = !this.openMobile;
    }
  }

  /** cerrar por overlay en móvil */
  onCloseMobile() {
    this.openMobile = false;
  }
}
