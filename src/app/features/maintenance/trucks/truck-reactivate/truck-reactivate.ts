import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-truck-reactivate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './truck-reactivate.html',
  styleUrl: './truck-reactivate.scss',
})
export class TruckReactivate {
  @Input() truckId: number | null = null;
  @Input() truck: any | null = null;

  isReactivating = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  reactivate(): void {
    if (!this.truckId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del camión.',
      });
      return;
    }

    this.isReactivating = true;

    this.maintenanceService
      .reactivateTruck(this.truckId)
      .pipe(finalize(() => (this.isReactivating = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Reactivado',
            text: 'Camión reactivado correctamente.',
            timer: 1400,
            showConfirmButton: false,
          });

          this.activeModal.close('reactivated');
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'No se pudo reactivar el camión.',
          });
        },
      });
  }

  close(): void {
    if (this.isReactivating) return;
    this.activeModal.dismiss();
  }

  get licensePlate(): string {
    return String(this.truck?.licensePlate ?? '—').toUpperCase();
  }

  get configuration(): string {
    return String(this.truck?.configuration ?? '—');
  }

  get payloadCapacity(): string {
    const value = this.truck?.payloadCapacity;

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  get carrierName(): string {
    return String(
      this.truck?.carrierCompanyName ??
        this.truck?.carrierName ??
        this.truck?.carrier?.companyName ??
        this.truck?.businessPartnerCarrier?.companyName ??
        '—'
    );
  }
}