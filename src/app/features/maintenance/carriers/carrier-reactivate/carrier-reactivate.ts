import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-carrier-reactivate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrier-reactivate.html',
  styleUrl: './carrier-reactivate.scss',
})
export class CarrierReactivate {
  @Input() carrierId: number | null = null;
  @Input() carrier: any | null = null;

  isReactivating = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  reactivate(): void {
    if (!this.carrierId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del transportista.',
      });
      return;
    }

    this.isReactivating = true;

    this.maintenanceService
      .reactivateCarrier(this.carrierId)
      .pipe(finalize(() => (this.isReactivating = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Reactivado',
            text: 'Transportista reactivado correctamente.',
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
            text:
              err?.error?.message ||
              'No se pudo reactivar el transportista.',
          });
        },
      });
  }

  close(): void {
    if (this.isReactivating) return;
    this.activeModal.dismiss();
  }

  get companyName(): string {
    return String(this.carrier?.companyName ?? '—');
  }

  get ruc(): string {
    return String(this.carrier?.ruc ?? this.carrier?.documentNumber ?? '—');
  }

  get code(): string {
    return String(this.carrier?.code ?? this.carrier?.registrationNumber ?? '—');
  }
}