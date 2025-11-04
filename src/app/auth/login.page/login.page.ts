import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  showPass = false;
  error: string | null = null;

  form = {
    user: 'cangulo',
    pass: 'atp2025@$.',
    remember: true
  };

  submit(formRef?: NgForm) {
    if (formRef && formRef.invalid) return;

    this.loading = true;
    this.error = null;

    this.auth.login(this.form.user, this.form.pass).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err) => {
        this.error = err?.error?.message || 'Credenciales no válidas';
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }
}
