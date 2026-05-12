import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs';

import { MaintenanceService } from '../../../../core/services/maintenance.service';

@Component({
  selector: 'app-carrier-delete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrier-delete.html',
  styleUrl: './carrier-delete.scss',
})
export class CarrierDelete {
  @Input() carrierId: number | null = null;
  @Input() carrier: any | null = null;

  isDeleting = false;

  constructor(
    public activeModal: NgbActiveModal,
    private maintenanceService: MaintenanceService
  ) {}

  delete(): void {
    if (!this.carrierId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró el ID del transportista.',
      });
      return;
    }

    this.isDeleting = true;

    this.maintenanceService
      .deleteCarrier(this.carrierId)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Eliminado',
            text: 'Transportista eliminado correctamente.',
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
            text:
              err?.error?.message ||
              'No se pudo eliminar el transportista.',
          });
        },
      });
  }

  close(): void {
    if (this.isDeleting) return;
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