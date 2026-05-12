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
  CreateTruckPayload,
  MaintenanceService,
  UpdateTruckPayload,
} from '../../../../core/services/maintenance.service';

type TruckFormMode = 'create' | 'edit';

@Component({
  selector: 'app-truck-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './truck-form.html',
  styleUrl: './truck-form.scss',
})
export class TruckForm implements OnInit {
  @Input() mode: TruckFormMode = 'create';
  @Input() truckId: number | null = null;
  @Input() truck: any | null = null;

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

    if (this.mode === 'edit' && this.truck) {
      this.patchForm(this.truck);
    }

    if (this.mode === 'edit' && this.truckId && !this.truck) {
      this.loadTruck();
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      idBusinessPartnersCarriers: [null, [Validators.required]],
      licensePlate: ['', [Validators.required, Validators.maxLength(20)]],
      payloadCapacity: [
        null,
        [Validators.required, Validators.min(0.01)],
      ],
      configuration: ['', [Validators.required, Validators.maxLength(50)]],
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

  private loadTruck(): void {
    if (!this.truckId) return;

    this.isLoading = true;

    this.maintenanceService
      .getTruckById(this.truckId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.truck = resp;
          this.patchForm(resp);
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar la información del camión.',
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
      configuration: data?.configuration ?? '',
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

    const payload: CreateTruckPayload = {
      idBusinessPartnersCarriers: Number(raw.idBusinessPartnersCarriers),
      licensePlate: String(raw.licensePlate || '').trim().toUpperCase(),
      payloadCapacity: Number(raw.payloadCapacity),
      configuration: String(raw.configuration || '').trim(),
    };

    this.isSaving = true;

    this.maintenanceService
      .createTruck(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Registrado',
            text: 'Camión creado correctamente.',
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
            text: err?.error?.message || 'No se pudo registrar el camión.',
          });
        },
      });
  }

  private update(): void {
    if (!this.truckId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del camión.',
      });
      return;
    }

    const raw = this.form.getRawValue();

    const payload: UpdateTruckPayload = {
      idBusinessPartnersCarriers: Number(raw.idBusinessPartnersCarriers),
      licensePlate: String(raw.licensePlate || '').trim().toUpperCase(),
      payloadCapacity: Number(raw.payloadCapacity),
      configuration: String(raw.configuration || '').trim(),
    };

    this.isSaving = true;

    this.maintenanceService
      .updateTruck(this.truckId, payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Actualizado',
            text: 'Camión actualizado correctamente.',
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
            text: err?.error?.message || 'No se pudo actualizar el camión.',
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
    return this.mode === 'create' ? 'Nuevo camión' : 'Editar camión';
  }

  get subtitle(): string {
    return this.mode === 'create'
      ? 'Registra los datos principales del camión.'
      : 'Actualiza los datos operativos del camión seleccionado.';
  }
}