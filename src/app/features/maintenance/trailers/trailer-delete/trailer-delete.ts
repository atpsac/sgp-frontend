import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-trailer-delete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trailer-delete.html',
  styleUrl: './trailer-delete.scss',
})
export class TrailerDelete {
  @Input() trailerId: number | null = null;
  @Input() trailer: any | null = null;

  isDeleting = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  delete(): void {
    if (!this.trailerId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del trailer.',
      });
      return;
    }

    this.isDeleting = true;

    this.maintenanceService
      .deleteTrailer(this.trailerId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'Trailer eliminado correctamente.',
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
            text: err?.error?.message || 'No se pudo eliminar el trailer.',
          });
        },
      });
  }

  close(): void {
    if (this.isDeleting) return;
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