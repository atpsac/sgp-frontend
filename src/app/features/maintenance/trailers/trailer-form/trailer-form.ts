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
  CreateTrailerPayload,
  MaintenanceService,
  UpdateTrailerPayload,
} from '../../../../core/services/maintenance.service';

type TrailerFormMode = 'create' | 'edit';

@Component({
  selector: 'app-trailer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trailer-form.html',
  styleUrl: './trailer-form.scss',
})
export class TrailerForm implements OnInit {
  @Input() mode: TrailerFormMode = 'create';
  @Input() trailerId: number | null = null;
  @Input() trailer: any | null = null;

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

    if (this.mode === 'edit' && this.trailer) {
      this.patchForm(this.trailer);
    }

    if (this.mode === 'edit' && this.trailerId && !this.trailer) {
      this.loadTrailer();
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      idBusinessPartnersCarriers: [null, [Validators.required]],
      licensePlate: ['', [Validators.required, Validators.maxLength(20)]],
      payloadCapacity: [null, [Validators.required, Validators.min(0.01)]],
      axleCount: [null, [Validators.required, Validators.min(1)]],
    });
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

  private loadTrailer(): void {
    if (!this.trailerId) return;

    this.isLoading = true;

    this.maintenanceService
      .getTrailerById(this.trailerId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.trailer = resp;
          this.patchForm(resp);
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la información del trailer.',
          });

          this.activeModal.dismiss();
        },
      });
  }

  private patchForm(data: any): void {
    this.form.patchValue({
      idBusinessPartnersCarriers:
        data?.idBusinessPartnersCarriers ??
        data?.carrierId ??
        data?.carrier?.id ??
        data?.businessPartnerCarrier?.id ??
        null,

      licensePlate: data?.licensePlate ?? '',
      payloadCapacity: data?.payloadCapacity ?? null,
      axleCount: data?.axleCount ?? null,
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

    const payload: CreateTrailerPayload = {
      idBusinessPartnersCarriers: Number(raw.idBusinessPartnersCarriers),
      licensePlate: String(raw.licensePlate || '').trim().toUpperCase(),
      payloadCapacity: Number(raw.payloadCapacity),
      axleCount: Number(raw.axleCount),
    };

    this.isSaving = true;

    this.maintenanceService
      .createTrailer(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Registrado',
            text: 'Trailer creado correctamente.',
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
            text: err?.error?.message || 'No se pudo registrar el trailer.',
          });
        },
      });
  }

  private update(): void {
    if (!this.trailerId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del trailer.',
      });
      return;
    }

    const raw = this.form.getRawValue();

    const payload: UpdateTrailerPayload = {
      idBusinessPartnersCarriers: Number(raw.idBusinessPartnersCarriers),
      licensePlate: String(raw.licensePlate || '').trim().toUpperCase(),
      payloadCapacity: Number(raw.payloadCapacity),
      axleCount: Number(raw.axleCount),
    };

    this.isSaving = true;

    this.maintenanceService
      .updateTrailer(this.trailerId, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Trailer actualizado correctamente.',
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
            text: err?.error?.message || 'No se pudo actualizar el trailer.',
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
    return this.mode === 'create' ? 'Nuevo trailer' : 'Editar trailer';
  }

  get subtitle(): string {
    return this.mode === 'create'
      ? 'Registra los datos principales del trailer.'
      : 'Actualiza los datos operativos del trailer seleccionado.';
  }
}