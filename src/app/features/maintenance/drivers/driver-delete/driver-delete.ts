import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-driver-delete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './driver-delete.html',
  styleUrl: './driver-delete.scss',
})
export class DriverDelete {
  @Input() driverId: number | null = null;
  @Input() driver: any | null = null;

  isDeleting = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  delete(): void {
    if (!this.driverId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del chofer.',
      });
      return;
    }

    this.isDeleting = true;

    this.maintenanceService
      .deleteDriver(this.driverId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'Chofer eliminado correctamente.',
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
            text: err?.error?.message || 'No se pudo eliminar el chofer.',
          });
        },
      });
  }

  close(): void {
    if (this.isDeleting) return;
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