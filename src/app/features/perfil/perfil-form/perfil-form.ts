import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

interface UsuarioPerfil {
  nombre: string;
  email: string;
  estado: 'Activo' | 'Inactivo';
  rol: string;
  contacto: string;
  pais: string;
  planta: string;
  fotoUrl?: string;
}

@Component({
  selector: 'app-perfil-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil-form.html',
  styleUrl: './perfil-form.scss',
})
export class PerfilForm {
  // Ejemplo, luego lo reemplazas con tu API
  usuario: UsuarioPerfil = {
    nombre: 'Manuel Mariñas',
    email: 'mrainas@amazonastrading.pe',
    estado: 'Activo',
    rol: 'Operador de pesadas',
    contacto: '(+51) 999 999 999',
    pais: 'Perú',
    planta: 'Planta Bagua – Pesadas de cacao',
    fotoUrl: 'assets/profile.jpg',
  };

  passwordForm: FormGroup;
  twoFactorForm: FormGroup;

  loadingPassword = false;
  loadingTwoFactor = false;

  showNueva = false;
  showConfirmar = false;

  passwordChanged = false;
  twoFactorEnabled = false;
  twoFactorSaved = false;

  constructor(private fb: FormBuilder) {
    this.passwordForm = this.fb.group({
      nueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmar: ['', [Validators.required]],
    });

    this.twoFactorForm = this.fb.group({
      telefono: ['', [Validators.required, Validators.minLength(9)]],
    });
  }

  // Getters para validación
  get nuevaCtrl() {
    return this.passwordForm.get('nueva');
  }

  get confirmarCtrl() {
    return this.passwordForm.get('confirmar');
  }

  get telefonoCtrl() {
    return this.twoFactorForm.get('telefono');
  }

  // Mostrar / ocultar campos de password
  toggleShowNueva(): void {
    this.showNueva = !this.showNueva;
  }

  toggleShowConfirmar(): void {
    this.showConfirmar = !this.showConfirmar;
  }

  // Guardar nueva contraseña
  onSubmitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const nueva = this.nuevaCtrl?.value;
    const confirmar = this.confirmarCtrl?.value;

    if (nueva !== confirmar) {
      this.confirmarCtrl?.setErrors({ mismatch: true });
      this.confirmarCtrl?.markAsTouched();
      return;
    }

    this.loadingPassword = true;
    this.passwordChanged = false;

    // TODO: reemplazar por llamada real a tu API
    setTimeout(() => {
      console.log('Nueva contraseña guardada:', nueva);

      this.loadingPassword = false;
      this.passwordForm.reset();
      this.passwordForm.markAsPristine();
      this.passwordForm.markAsUntouched();
      this.passwordChanged = true;

      setTimeout(() => (this.passwordChanged = false), 4000);
    }, 1000);
  }

  // Guardar teléfono para 2FA
  onSubmitTwoFactor(): void {
    if (this.twoFactorForm.invalid) {
      this.twoFactorForm.markAllAsTouched();
      return;
    }

    this.loadingTwoFactor = true;
    this.twoFactorSaved = false;

    const telefono = this.telefonoCtrl?.value;

    // TODO: reemplazar por llamada real a tu API
    setTimeout(() => {
      console.log('Teléfono 2FA guardado:', telefono);

      this.loadingTwoFactor = false;
      this.twoFactorEnabled = true;
      this.twoFactorSaved = true;

      setTimeout(() => (this.twoFactorSaved = false), 4000);
    }, 1000);
  }

  onEditPerfil(): void {
    console.log('Abrir modal o vista para editar perfil');
  }
}
