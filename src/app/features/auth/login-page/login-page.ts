// src/app/features/auth/login-page/login-page.ts
import { Component } from '@angular/core';
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
export class LoginPage {
  loading = false;
  show = false;

  form: FormGroup;

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

  submit(): void {
    if (this.loading || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { login, password, remember } = this.form.getRawValue() as {
      login: string;
      password: string;
      remember: boolean;
    };

    // ==========================
    //   LOGIN REAL CON BACKEND
    // ==========================
    this.auth.login(login, password, { remember }).subscribe({
      next: () => {
        // El AuthService ya guardó token + user en storage
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
