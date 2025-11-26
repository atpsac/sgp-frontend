import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { Role } from '../services/roles';

@Component({
  selector: 'app-role-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './role-form.html',
  styleUrl: './role-form.scss',
})
export class RoleForm implements OnInit {
  @Input() data: Partial<Role> | null = null; // si viene, es edición

  form!: FormGroup;
  loading = false;      // guardado (simulado)
  loadingData = false;  // lo dejamos por si el HTML lo usa para spinner

  private fb = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);

  get isEdit(): boolean {
    return !!(this.data && Number((this.data as any).RolId));
  }

  get title(): string {
    return this.isEdit ? 'Editar rol' : 'Crear rol';
  }

  get subtitle(): string {
    return this.isEdit
      ? 'Actualiza los datos del rol.'
      : 'Completa los campos para registrar un nuevo rol.';
  }

  ngOnInit(): void {
    // Inicializamos el form usando lo que venga en this.data (si es edición)
    this.form = this.fb.group({
      Codigo: [
        this.data?.Codigo || '',
        [Validators.required, Validators.maxLength(30)],
      ],
      Nombre: [
        this.data?.Nombre || '',
        [Validators.required, Validators.maxLength(60)],
      ],
      // editable por si quieres activar/desactivar desde el formulario
      FlagActivo: [this.data?.FlagActivo ?? 1],
    });
  }

  close(): void {
    if (!this.loading) {
      this.activeModal.dismiss('cancel');
    }
  }

  save(): void {
    if (this.loading || this.loadingData) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: Role = {
      Codigo: this.form.value.Codigo,
      Nombre: this.form.value.Nombre,
      FlagActivo: Number(this.form.value.FlagActivo) as 0 | 1,
      // Si tu interfaz Role tiene más campos (RolId, FechaCreacion, etc.)
      // los puedes agregar aquí como opcionales.
    };

    this.loading = true;

    // 🔹 Simulamos un guardado exitoso SIN API (modo demo)
    setTimeout(() => {
      this.loading = false;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        html: `<span style="font-size:14px">${
          this.isEdit ? 'Rol actualizado' : 'Rol creado'
        } correctamente.</span>`,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        background: '#e6ffed',
        color: '#2d662d',
      });

      // devolvemos el payload por si el padre quiere actualizar el array en memoria
      // (en tu RoleList ahora mismo solo haces .then(() => this.fetchRoles()))
      this.activeModal.close(payload);
    }, 600);
  }
}
