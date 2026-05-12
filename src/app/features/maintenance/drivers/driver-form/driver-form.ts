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
  Carrier,
  CreateDriverPayload,
  MaintenanceService,
  UpdateDriverPayload,
} from '../../../../core/services/maintenance.service';

type DriverFormMode = 'create' | 'edit';

@Component({
  selector: 'app-driver-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './driver-form.html',
  styleUrl: './driver-form.scss',
})
export class DriverForm implements OnInit {
  @Input() mode: DriverFormMode = 'create';
  @Input() driverId: number | null = null;
  @Input() driver: any | null = null;

  form!: FormGroup;

  carriers: Carrier[] = [];

  isLoading = false;
  isSaving = false;
  loadingCarriers = false;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private maintenanceService: MaintenanceService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadCarriers();

    if (this.mode === 'edit' && this.driver) {
      this.patchForm(this.driver);
    }

    if (this.mode === 'edit' && this.driverId && !this.driver) {
      this.loadDriver();
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      idIdentityDocumentTypes: [1, [Validators.required]],
      idUbigeos: [1, [Validators.required]],
      idLicenseTypes: [1, [Validators.required]],
      idBusinessPartnersCarriers: [null, [Validators.required]],

      documentNumber: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(20)],
      ],

      name: ['', [Validators.required, Validators.maxLength(80)]],
      fLastname: ['', [Validators.required, Validators.maxLength(80)]],
      mLastname: ['', [Validators.maxLength(80)]],

      email: ['', [Validators.email, Validators.maxLength(120)]],
      phoneNumber: ['', [Validators.maxLength(20)]],
      address: ['', [Validators.maxLength(250)]],

      license: ['', [Validators.required, Validators.maxLength(50)]],
      effectiveDate: ['', [Validators.required]],
    });

    if (this.mode === 'edit') {
      this.form.get('idIdentityDocumentTypes')?.disable();
      this.form.get('idUbigeos')?.disable();
      this.form.get('idLicenseTypes')?.disable();
      this.form.get('documentNumber')?.disable();
      this.form.get('name')?.disable();
      this.form.get('fLastname')?.disable();
      this.form.get('mLastname')?.disable();
      this.form.get('email')?.disable();
    }
  }

  private loadCarriers(): void {
    this.loadingCarriers = true;

    this.maintenanceService
      .listCarriers({
        page: 1,
        pageSize: 100,
        sort: 'companyName',
        sortDirection: 'asc',
        status: 'activo',
      })
      .pipe(finalize(() => (this.loadingCarriers = false)))
      .subscribe({
        next: (resp: any) => {
          this.carriers = Array.isArray(resp?.items) ? resp.items : [];
        },
        error: (err) => {
          console.error(err);
          this.carriers = [];

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los transportistas.',
          });
        },
      });
  }

  private loadDriver(): void {
    if (!this.driverId) return;

    this.isLoading = true;

    this.maintenanceService
      .getDriverById(this.driverId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.driver = resp;
          this.patchForm(resp);
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la información del chofer.',
          });

          this.activeModal.dismiss();
        },
      });
  }

  private patchForm(data: any): void {
    const fullName = String(data?.fullName ?? '').trim();
    const parts = fullName ? fullName.split(/\s+/) : [];

    this.form.patchValue({
      idIdentityDocumentTypes: data?.idIdentityDocumentTypes ?? 1,
      idUbigeos: data?.idUbigeos ?? 1,
      idLicenseTypes: data?.idLicenseTypes ?? 1,

      idBusinessPartnersCarriers:
        data?.idBusinessPartnersCarriers ??
        data?.carrierId ??
        data?.carrier?.id ??
        data?.businessPartnerCarrier?.id ??
        null,

      documentNumber: data?.documentNumber ?? '',
      name: data?.name ?? parts[0] ?? '',
      fLastname: data?.fLastname ?? parts[1] ?? '',
      mLastname: data?.mLastname ?? parts.slice(2).join(' ') ?? '',

      email: data?.email ?? '',
      phoneNumber: data?.phoneNumber ?? '',
      address: data?.address ?? '',
      license: data?.license ?? '',
      effectiveDate: this.toDateInput(data?.effectiveDate),
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

    const payload: CreateDriverPayload = {
      idIdentityDocumentTypes: Number(raw.idIdentityDocumentTypes),
      idUbigeos: Number(raw.idUbigeos),
      idLicenseTypes: Number(raw.idLicenseTypes),
      idBusinessPartnersCarriers: Number(raw.idBusinessPartnersCarriers),
      documentNumber: String(raw.documentNumber || '').trim(),
      name: String(raw.name || '').trim(),
      fLastname: String(raw.fLastname || '').trim(),
      mLastname: String(raw.mLastname || '').trim(),
      email: String(raw.email || '').trim(),
      phoneNumber: String(raw.phoneNumber || '').trim(),
      address: String(raw.address || '').trim(),
      license: String(raw.license || '').trim(),
      effectiveDate: String(raw.effectiveDate || '').trim(),
    };

    this.isSaving = true;

    this.maintenanceService
      .createDriver(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Registrado',
            text: 'Chofer creado correctamente.',
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
            text: err?.error?.message || 'No se pudo registrar el chofer.',
          });
        },
      });
  }

  private update(): void {
    if (!this.driverId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del chofer.',
      });
      return;
    }

    const raw = this.form.getRawValue();

    const payload: UpdateDriverPayload = {
      idBusinessPartnersCarriers: Number(raw.idBusinessPartnersCarriers),
      phoneNumber: String(raw.phoneNumber || '').trim(),
      address: String(raw.address || '').trim(),
      license: String(raw.license || '').trim(),
      effectiveDate: String(raw.effectiveDate || '').trim(),
    };

    this.isSaving = true;

    this.maintenanceService
      .updateDriver(this.driverId, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Chofer actualizado correctamente.',
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
            text: err?.error?.message || 'No se pudo actualizar el chofer.',
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
    return this.mode === 'create' ? 'Nuevo chofer' : 'Editar chofer';
  }

  get subtitle(): string {
    return this.mode === 'create'
      ? 'Registra los datos principales del conductor.'
      : 'Actualiza los datos operativos del conductor seleccionado.';
  }

  private toDateInput(value: any): string {
    if (!value) return '';

    const text = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const date = new Date(text);

    if (isNaN(date.getTime())) return '';

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
  }
}