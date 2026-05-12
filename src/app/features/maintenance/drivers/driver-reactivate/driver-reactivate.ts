import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-driver-reactivate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-reactivate.html',
  styleUrl: './driver-reactivate.scss',
})
export class DriverReactivate {
  @Input() driverId: number | null = null;
  @Input() driver: any | null = null;

  isReactivating = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  reactivate(): void {
    if (!this.driverId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del chofer.',
      });
      return;
    }

    this.isReactivating = true;

    this.maintenanceService
      .reactivateDriver(this.driverId)
      .pipe(finalize(() => (this.isReactivating = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Reactivado',
            text: 'Chofer reactivado correctamente.',
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
            text: err?.error?.message || 'No se pudo reactivar el chofer.',
          });
        },
      });
  }

  close(): void {
    if (this.isReactivating) return;
    this.activeModal.dismiss();
  }

  get fullName(): string {
    return String(
      this.driver?.fullName ??
        `${this.driver?.name ?? ''} ${this.driver?.fLastname ?? ''} ${this.driver?.mLastname ?? ''}`.trim() ??
        '—'
    );
  }

  get documentNumber(): string {
    return String(this.driver?.documentNumber ?? '—');
  }

  get license(): string {
    return String(this.driver?.license ?? '—');
  }

  get carrierName(): string {
    return String(
      this.driver?.carrierName ??
        this.driver?.carrier?.companyName ??
        this.driver?.businessPartnerCarrier?.companyName ??
        '—'
    );
  }
}