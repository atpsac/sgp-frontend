import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import {
  MaintenanceService,
  CreateCarrierPayload,
  UpdateCarrierPayload,
} from '../../../../core/services/maintenance.service';

type CarrierFormMode = 'create' | 'edit';

@Component({
  selector: 'app-carrier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './carrier-form.html',
  styleUrl: './carrier-form.scss',
})
export class CarrierForm implements OnInit {
  @Input() mode: CarrierFormMode = 'create';
  @Input() carrierId: number | null = null;
  @Input() carrier: any | null = null;

  form!: FormGroup;

  isLoading = false;
  isSaving = false;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private maintenanceService: MaintenanceService
  ) {}

  ngOnInit(): void {
    this.buildForm();

    if (this.mode === 'edit' && this.carrier) {
      this.patchForm(this.carrier);
    }

    if (this.mode === 'edit' && this.carrierId && !this.carrier) {
      this.loadCarrier();
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      idIdentityDocumentTypes: [1, [Validators.required]],
      idUbigeos: [1, [Validators.required]],

      documentNumber: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(20),
        ],
      ],

      companyName: ['', [Validators.required, Validators.maxLength(180)]],
      email: ['', [Validators.email, Validators.maxLength(120)]],
      phoneNumber: ['', [Validators.maxLength(20)]],
      address: ['', [Validators.maxLength(250)]],
      registrationNumber: ['', [Validators.maxLength(50)]],
    });

    if (this.mode === 'edit') {
      this.form.get('idIdentityDocumentTypes')?.disable();
      this.form.get('idUbigeos')?.disable();
      this.form.get('documentNumber')?.disable();
    }
  }

  private loadCarrier(): void {
    if (!this.carrierId) return;

    this.isLoading = true;

    this.maintenanceService
      .getCarrierById(this.carrierId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.carrier = resp;
          this.patchForm(resp);
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la información del transportista.',
          });

          this.activeModal.dismiss();
        },
      });
  }

  private patchForm(data: any): void {
    this.form.patchValue({
      idIdentityDocumentTypes: data?.idIdentityDocumentTypes ?? 1,
      idUbigeos: data?.idUbigeos ?? 1,
      documentNumber: data?.documentNumber ?? data?.ruc ?? '',
      companyName: data?.companyName ?? '',
      email: data?.email ?? '',
      phoneNumber: data?.phoneNumber ?? '',
      address: data?.address ?? '',
      registrationNumber: data?.registrationNumber ?? data?.code ?? '',
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Completa los campos obligatorios antes de guardar.',
      });

      return;
    }

    if (this.mode === 'create') {
      this.create();
      return;
    }

    this.update();
  }

  private create(): void {
    const raw = this.form.getRawValue();

    const payload: CreateCarrierPayload = {
      idIdentityDocumentTypes: Number(raw.idIdentityDocumentTypes),
      idUbigeos: Number(raw.idUbigeos),
      documentNumber: String(raw.documentNumber || '').trim(),
      companyName: String(raw.companyName || '').trim(),
      email: String(raw.email || '').trim(),
      phoneNumber: String(raw.phoneNumber || '').trim(),
      address: String(raw.address || '').trim(),
      registrationNumber: String(raw.registrationNumber || '').trim(),
    };

    this.isSaving = true;

    this.maintenanceService
      .createCarrier(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Registrado',
            text: 'Transportista creado correctamente.',
            timer: 1400,
            showConfirmButton: false,
          });

          this.activeModal.close('saved');
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text:
              err?.error?.message ||
              'No se pudo registrar el transportista.',
          });
        },
      });
  }

  private update(): void {
    if (!this.carrierId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del transportista.',
      });
      return;
    }

    const raw = this.form.getRawValue();

    const payload: UpdateCarrierPayload = {
      companyName: String(raw.companyName || '').trim(),
      email: String(raw.email || '').trim(),
      phoneNumber: String(raw.phoneNumber || '').trim(),
      address: String(raw.address || '').trim(),
      registrationNumber: String(raw.registrationNumber || '').trim(),
    };

    this.isSaving = true;

    this.maintenanceService
      .updateCarrier(this.carrierId, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Transportista actualizado correctamente.',
            timer: 1400,
            showConfirmButton: false,
          });

          this.activeModal.close('saved');
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text:
              err?.error?.message ||
              'No se pudo actualizar el transportista.',
          });
        },
      });
  }

  close(): void {
    if (this.isSaving) return;
    this.activeModal.dismiss();
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  get title(): string {
    return this.mode === 'create'
      ? 'Nuevo transportista'
      : 'Editar transportista';
  }

  get subtitle(): string {
    return this.mode === 'create'
      ? 'Registra los datos principales del transportista.'
      : 'Actualiza la información del transportista seleccionado.';
  }
}