import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme/theme.service';
import { ThemeLatam } from './core/theme/theme.latam';
import { ThemeSwitcher } from './core/theme/theme-switcher/theme-switcher';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ThemeSwitcher],
            
  template: '<router-outlet/>  <app-theme-switcher></app-theme-switcher>'
})
export class App implements OnInit {
  constructor(private theme: ThemeService,
    private themeService: ThemeLatam
  ) {}
  ngOnInit() {
    this.theme.apply(); 
    this.themeService.init();
  }
}
