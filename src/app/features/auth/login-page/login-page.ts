// src/app/features/auth/login-page/login-page.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { ThemeService } from '../../../core/theme/theme.service';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage implements OnInit, OnDestroy {
  loading = false;
  show = false;

  showInstallBanner = false;
  deferredPrompt: any = null;
  isInstalled = false;

  form: FormGroup;

  private beforeInstallHandler = (event: any): void => {
    event.preventDefault();

    this.deferredPrompt = event;
    this.showInstallBanner = true;
  };

  private appInstalledHandler = (): void => {
    this.isInstalled = true;
    this.showInstallBanner = false;
    this.deferredPrompt = null;
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private theme: ThemeService,
    private auth: AuthService
  ) {
    this.form = this.fb.nonNullable.group({
      login: ['desarrollo@amazonastrading.com', Validators.required],
      password: ['D3v@tP*-', Validators.required],
      remember: [true],
    });

    this.theme.apply();
  }

  ngOnInit(): void {
    this.checkIfInstalled();

    window.addEventListener('beforeinstallprompt', this.beforeInstallHandler);
    window.addEventListener('appinstalled', this.appInstalledHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.beforeInstallHandler);
    window.removeEventListener('appinstalled', this.appInstalledHandler);
  }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) {
      this.showToast(
        'info',
        'La instalación estará disponible cuando la app esté publicada en HTTPS y cumpla los requisitos PWA.'
      );
      return;
    }

    this.deferredPrompt.prompt();

    const choiceResult = await this.deferredPrompt.userChoice;

    if (choiceResult?.outcome === 'accepted') {
      this.showInstallBanner = false;
    }

    this.deferredPrompt = null;
  }

  closeInstallBanner(): void {
    this.showInstallBanner = false;
  }

  submit(): void {
    if (this.loading || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { login, password } = this.form.getRawValue() as {
      login: string;
      password: string;
      remember: boolean;
    };

    this.auth.login(login, password).subscribe({
      next: () => {
        this.loading = false;

        this.showToast('success', 'Inicio de sesión correcto');
        this.router.navigateByUrl('/');
      },
      error: (err: any) => {
        this.loading = false;

        const msg =
          err?.error?.message ||
          err?.error?.error ||
          'Usuario o contraseña incorrectos.';

        this.showToast('error', msg);
      },
    });
  }

  private checkIfInstalled(): void {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    this.isInstalled = isStandalone;
  }

  private showToast(
    icon: 'success' | 'error' | 'warning' | 'info' | 'question',
    title: string
  ): void {
    Swal.fire({
      toast: true,
      icon,
      title,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      background: icon === 'error' ? '#fee2e2' : '#e0f2fe',
      color: icon === 'error' ? '#991b1b' : '#0f172a',
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      },
    });
  }
}