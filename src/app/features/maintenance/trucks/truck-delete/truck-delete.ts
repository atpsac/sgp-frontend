import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-truck-delete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './truck-delete.html',
  styleUrl: './truck-delete.scss',
})
export class TruckDelete {
  @Input() truckId: number | null = null;
  @Input() truck: any | null = null;

  isDeleting = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  delete(): void {
    if (!this.truckId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del camión.',
      });
      return;
    }

    this.isDeleting = true;

    this.maintenanceService
      .deleteTruck(this.truckId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'Camión eliminado correctamente.',
            timer: 1400,
            showConfirmButton: false,
          });

          this.activeModal.close('deleted');
        },
        error: (err) => {
          console.error(err);

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.message || 'No se pudo eliminar el camión.',
          });
        },
      });
  }

  close(): void {
    if (this.isDeleting) return;
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