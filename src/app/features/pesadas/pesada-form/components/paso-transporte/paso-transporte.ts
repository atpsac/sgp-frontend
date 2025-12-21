import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import {
  Carrier,
  CarrierDriver,
  CarrierTruck,
  CarrierTrailer,
  WeighingService,
} from '../../../../../core/services/weighing.service';

@Component({
  selector: 'app-paso-transporte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-transporte.html',
  styleUrl: './paso-transporte.scss',
})
export class PasoTransporte implements OnInit, OnDestroy {
  private api = inject(WeighingService);
  private destroy$ = new Subject<void>();

  @Input() formGroup!: FormGroup;

  /** Bloquea edición cuando headerSaved = true */
  @Input() locked = false;

  carriers: Carrier[] = [];
  carrierDrivers: CarrierDriver[] = [];
  carrierTrucks: CarrierTruck[] = [];
  carrierTrailers: CarrierTrailer[] = [];

  loadingCarriers = false;
  loadingRelations = false;

  // Helpers de acceso a subgrupos
  get transportistaGroup(): FormGroup {
    return this.formGroup.get('transportista') as FormGroup;
  }
  get conductorGroup(): FormGroup {
    return this.formGroup.get('conductor') as FormGroup;
  }
  get vehiculoGroup(): FormGroup {
    return this.formGroup.get('vehiculo') as FormGroup;
  }

  ngOnInit(): void {
    if (!this.formGroup) return;

    this.loadCarriers();

    // cambios de transportistaId
    this.transportistaGroup
      .get('transportistaId')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe((val) => {
        if (this.locked) return;
        const carrierId = Number(val || 0);
        this.onCarrierSelected(carrierId, false);
      });

    // cambios de conductorId
    this.conductorGroup
      .get('conductorId')
      ?.valueChanges.pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged()
      )
      .subscribe((val) => {
        if (this.locked) return;
        const driverId = Number(val || 0);
        this.onDriverSelected(driverId);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** ========= CARGA PRINCIPAL ========= */
  private loadCarriers(): void {
    this.loadingCarriers = true;

    this.api.getCarriers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.carriers = rows || [];

        // Si venía del draft (ya seleccionado), cargar relaciones sin borrar valores
        const carrierId = Number(this.transportistaGroup.get('transportistaId')?.value || 0);
        if (carrierId) {
          this.onCarrierSelected(carrierId, true);
        }
      },
      error: (err) => console.error('Error loading carriers', err),
      complete: () => (this.loadingCarriers = false),
    });
  }

  /** ========= EVENTOS ========= */
  onTransportistaChange(): void {
    if (this.locked) return;
    const carrierId = Number(this.transportistaGroup.get('transportistaId')?.value || 0);
    this.onCarrierSelected(carrierId, false);
  }

  onConductorChange(): void {
    if (this.locked) return;
    const driverId = Number(this.conductorGroup.get('conductorId')?.value || 0);
    this.onDriverSelected(driverId);
  }

  /** ========= LÓGICA DE SELECCIÓN ========= */
  private onCarrierSelected(carrierId: number, keepValues: boolean): void {
    if (!carrierId) {
      // reset transportista + relaciones
      if (!keepValues) {
        this.transportistaGroup.patchValue(
          { nombre: '', tipoDocumento: '', numeroDocumento: '' },
          { emitEvent: false }
        );
      }

      this.carrierDrivers = [];
      this.carrierTrucks = [];
      this.carrierTrailers = [];

      if (!keepValues) {
        this.conductorGroup.patchValue(
          { conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
          { emitEvent: false }
        );
        this.vehiculoGroup.patchValue({ vehiculoId: null, trailerId: null }, { emitEvent: false });
      }
      return;
    }

    // Autollenado transportista
    const carrier = this.carriers.find((c) => c.id === carrierId);
    if (carrier && !keepValues) {
      this.transportistaGroup.patchValue(
        {
          nombre: carrier.companyName,
          tipoDocumento: (carrier as any).documentTypeCode || 'RUC',
          numeroDocumento: (carrier as any).documentNumber || '',
        },
        { emitEvent: false }
      );
    } else if (carrier && keepValues) {
      // si viene de draft, al menos asegura coherencia si campos estaban vacíos
      const nombre = this.transportistaGroup.get('nombre')?.value;
      if (!nombre) {
        this.transportistaGroup.patchValue(
          {
            nombre: carrier.companyName,
            tipoDocumento: (carrier as any).documentTypeCode || 'RUC',
            numeroDocumento: (carrier as any).documentNumber || '',
          },
          { emitEvent: false }
        );
      }
    }

    this.loadCarrierRelations(carrierId, keepValues);
  }

  private loadCarrierRelations(carrierId: number, keepValues: boolean): void {
    this.loadingRelations = true;

    // Drivers
    this.api.getCarrierDrivers(carrierId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (drivers) => {
        this.carrierDrivers = drivers || [];

        const currentId = Number(this.conductorGroup.get('conductorId')?.value || 0);
        if (!keepValues) {
          this.conductorGroup.patchValue(
            { conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
            { emitEvent: false }
          );
        } else if (currentId && !this.carrierDrivers.some((d) => d.id === currentId)) {
          this.conductorGroup.patchValue(
            { conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
            { emitEvent: false }
          );
        }

        // si viene de draft y conductor ya estaba seleccionado, autollenar
        if (keepValues && currentId) this.onDriverSelected(currentId);
      },
      error: (err) => console.error('Error loading carrier drivers', err),
    });

    // Trucks
    this.api.getCarrierTrucks(carrierId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (trucks) => {
        this.carrierTrucks = trucks || [];

        const currentId = Number(this.vehiculoGroup.get('vehiculoId')?.value || 0);
        if (!keepValues) {
          this.vehiculoGroup.patchValue({ vehiculoId: null }, { emitEvent: false });
        } else if (currentId && !this.carrierTrucks.some((t) => t.id === currentId)) {
          this.vehiculoGroup.patchValue({ vehiculoId: null }, { emitEvent: false });
        }
      },
      error: (err) => console.error('Error loading carrier trucks', err),
    });

    // Trailers
    this.api.getCarrierTrailers(carrierId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (trailers) => {
        this.carrierTrailers = trailers || [];

        const currentId = Number(this.vehiculoGroup.get('trailerId')?.value || 0);
        if (!keepValues) {
          this.vehiculoGroup.patchValue({ trailerId: null }, { emitEvent: false });
        } else if (currentId && !this.carrierTrailers.some((t) => t.id === currentId)) {
          this.vehiculoGroup.patchValue({ trailerId: null }, { emitEvent: false });
        }
      },
      error: (err) => console.error('Error loading carrier trailers', err),
      complete: () => (this.loadingRelations = false),
    });
  }

  private onDriverSelected(driverId: number): void {
    if (!driverId) {
      this.conductorGroup.patchValue(
        { nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
        { emitEvent: false }
      );
      return;
    }

    const driver = this.carrierDrivers.find((d) => d.id === driverId);
    if (!driver) return;

    this.conductorGroup.patchValue(
      {
        nombre: (driver as any).fullName,
        tipoDocumento: (driver as any).documentTypeCode || 'DNI',
        numeroDocumento: (driver as any).documentNumber || '',
        licenciaConducir: (driver as any).license || '',
      },
      { emitEvent: false }
    );
  }

  /** ========= HELPERS ========= */
  getTruckPlate(truck: CarrierTruck): string {
    const t: any = truck as any;
    return t.plateNumber || t.plate || t.licensePlate || t.placa || t.description || '';
  }

  getTrailerPlate(trailer: CarrierTrailer): string {
    const t: any = trailer as any;
    return t.plateNumber || t.plate || t.licensePlate || t.placa || t.description || '';
  }
}
