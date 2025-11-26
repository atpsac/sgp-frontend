import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppTheme, ThemeLatam } from '../theme.latam';
// import { ThemeService, AppTheme } from './theme.latam';

@Component({
  selector: 'app-theme-switcher',
  imports: [CommonModule],
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.scss',
})
export class ThemeSwitcher implements OnInit {
  themes: { id: AppTheme; label: string; main: string; fill: string }[] = [
    { id: 'blue',   label: 'Azul',    main: '#0a3df3', fill: '#E8F0FF' },
    { id: 'green',  label: 'Verde',   main: '#23b345', fill: '#e8fff9' },
    { id: 'orange', label: 'Naranja', main: '#ff5722', fill: '#fff1e8' },
  ];

  currentTheme: AppTheme = 'blue';

  constructor(private themeService: ThemeLatam) {}

  ngOnInit(): void {
    // sincronizar con lo que haya en localStorage
    this.currentTheme = this.themeService.getTheme();
  }

  changeTheme(theme: AppTheme): void {
    this.themeService.setTheme(theme);
    this.currentTheme = theme;
  }
}