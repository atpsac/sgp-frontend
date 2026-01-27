import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './core/theme/theme.service';
import { ThemeLatam } from './core/theme/theme.latam';
import { ThemeSwitcher } from './core/theme/theme-switcher/theme-switcher';

import { SessionExpiryService } from './core/services/session-expiry.service';
import { SessionWarningComponent } from './core/components/session-warning/session-warning.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ThemeSwitcher, SessionWarningComponent],
  template: `
    <router-outlet/>
    <app-theme-switcher></app-theme-switcher>
    <app-session-warning></app-session-warning>
  `
})
export class App implements OnInit {
  constructor(
    private theme: ThemeService,
    private themeService: ThemeLatam,
    private sessionExpiry: SessionExpiryService
  ) {}

  ngOnInit() {
    this.theme.apply();
    this.themeService.init();

    // ✅ inicia la vigilancia del exp del token
    this.sessionExpiry.start();
  }
}
