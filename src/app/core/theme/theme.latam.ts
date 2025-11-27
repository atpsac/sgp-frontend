// src/app/core/theme/theme.service.ts
import { Injectable } from '@angular/core';

export type AppTheme = 'blue' | 'green' | 'orange';

const STORAGE_KEY = 'aws-theme';

@Injectable({ providedIn: 'root' })
export class ThemeLatam {
  private currentTheme: AppTheme = 'green';
  // private currentTheme: AppTheme = 'blue';
  private readonly themes: AppTheme[] = ['blue', 'green', 'orange'];
  private readonly classPrefix = 'theme-';

  constructor() {}

  /** Leer de localStorage y aplicar al iniciar la app */
  init(): void {
    const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    if (stored && this.themes.includes(stored)) {
      this.currentTheme = stored;
    } else {
      this.currentTheme = 'green'; // por defecto VERDE
    }
    this.applyTheme(this.currentTheme);
  }

  setTheme(theme: AppTheme): void {
    if (!this.themes.includes(theme)) return;

    this.currentTheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    this.applyTheme(theme);
  }

  getTheme(): AppTheme {
    return this.currentTheme;
  }

  private applyTheme(theme: AppTheme): void {
    const body = document.body;

    // quitar clases anteriores
    this.themes.forEach(t => body.classList.remove(this.classPrefix + t));

    // agregar la nueva
    body.classList.add(this.classPrefix + theme);
  }
}
