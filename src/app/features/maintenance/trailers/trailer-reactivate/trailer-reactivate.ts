import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-trailer-reactivate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trailer-reactivate.html',
  styleUrl: './trailer-reactivate.scss',
})
export class TrailerReactivate {
  @Input() trailerId: number | null = null;
  @Input() trailer: any | null = null;

  isReactivating = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  reactivate(): void {
    if (!this.trailerId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del trailer.',
      });
      return;
    }

    this.isReactivating = true;

    this.maintenanceService
      .reactivateTrailer(this.trailerId)
      .pipe(finalize(() => (this.isReactivating = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Reactivado',
            text: 'Trailer reactivado correctamente.',
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
            text: err?.error?.message || 'No se pudo reactivar el trailer.',
          });
        },
      });
  }

  close(): void {
    if (this.isReactivating) return;
    this.activeModal.dismiss();
  }

  get licensePlate(): string {
    return String(this.trailer?.licensePlate ?? '—').toUpperCase();
  }

  get payloadCapacity(): string {
    const value = this.trailer?.payloadCapacity;

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  get axleCount(): string {
    const value = this.trailer?.axleCount;

    if (value === null || value === undefined || value === '') {
      return '—';
    }

    return String(value);
  }

  get carrierName(): string {
    return String(
      this.trailer?.carrierCompanyName ??
        this.trailer?.carrierName ??
        this.trailer?.carrier?.companyName ??
        this.trailer?.businessPartnerCarrier?.companyName ??
        '—'
    );
  }
}