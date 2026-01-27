import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { WeighingService } from '../../../../../core/services/weighing.service';

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
  @Input() locked = false;

  // ✅ Tipado simple para evitar errores por campos que no existan en interfaces
  carriers: any[] = [];
  carrierDrivers: any[] = [];
  carrierTrucks: any[] = [];
  carrierTrailers: any[] = [];

  loadingCarriers = false;
  loadingDrivers = false;
  loadingTrucks = false;
  loadingTrailers = false;

  driversMsg = '';
  trucksMsg = '';
  trailersMsg = '';

  // ✅ FIX: ahora existe lo que tu HTML usa
  get loadingRelations(): boolean {
    return this.loadingDrivers || this.loadingTrucks || this.loadingTrailers;
  }

  // ✅ seguridad para template
  get ready(): boolean {
    return !!this.formGroup
      && !!this.formGroup.get('transportista')
      && !!this.formGroup.get('conductor')
      && !!this.formGroup.get('vehiculo');
  }

  // ====== grupos ======
  get transportistaGroup(): FormGroup {
    return this.formGroup.get('transportista') as FormGroup;
  }
  get conductorGroup(): FormGroup {
    return this.formGroup.get('conductor') as FormGroup;
  }
  get vehiculoGroup(): FormGroup {
    return this.formGroup.get('vehiculo') as FormGroup;
  }

  // ====== controles ======
  private get cTransportistaId(): FormControl | null {
    return this.transportistaGroup.get('transportistaId') as FormControl;
  }
  private get cConductorId(): FormControl | null {
    return this.conductorGroup.get('conductorId') as FormControl;
  }
  private get cVehiculoId(): FormControl | null {
    return this.vehiculoGroup.get('vehiculoId') as FormControl;
  }
  private get cTrailerId(): FormControl | null {
    return this.vehiculoGroup.get('trailerId') as FormControl;
  }

  ngOnInit(): void {
    if (!this.ready) return;

    // dejar campos autollenados en solo lectura (opcional, pero recomendado)
    this.disableReadOnlyFields();

    // trailer opcional
    this.makeTrailerOptional();

    // cargar transportistas
    this.loadCarriers();

    // si ya venía un transportista cargado (editar)
    const carrierId = Number(this.cTransportistaId?.value || 0);
    if (carrierId) {
      this.loadCarrierRelations(carrierId, true);
      this.fillCarrierInfoFromList(carrierId, true);
    }

    // autollenado conductor cuando ya existe (editar)
    const driverId = Number(this.cConductorId?.value || 0);
    if (driverId) {
      this.fillDriverInfo(driverId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // ✅ HANDLERS QUE TU HTML LLAMA (YA NO HAY ERROR)
  // =========================================================
  onTransportistaChange(): void {
    if (!this.ready || this.locked) return;

    const carrierId = Number(this.cTransportistaId?.value || 0);

    // limpiar selecciones dependientes
    this.conductorGroup.patchValue(
      { conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
      { emitEvent: false }
    );
    this.vehiculoGroup.patchValue({ vehiculoId: null, trailerId: null }, { emitEvent: false });

    // limpiar listas
    this.carrierDrivers = [];
    this.carrierTrucks = [];
    this.carrierTrailers = [];
    this.driversMsg = '';
    this.trucksMsg = '';
    this.trailersMsg = '';

    if (!carrierId) {
      this.transportistaGroup.patchValue(
        { nombre: '', tipoDocumento: '', numeroDocumento: '' },
        { emitEvent: false }
      );
      return;
    }

    // autollenar transportista
    this.fillCarrierInfoFromList(carrierId, false);

    // cargar relaciones
    this.loadCarrierRelations(carrierId, false);
  }

  onConductorChange(): void {
    if (!this.ready || this.locked) return;
    const driverId = Number(this.cConductorId?.value || 0);
    this.fillDriverInfo(driverId);
  }

  // =========================================================
  // CARGAS
  // =========================================================
  private loadCarriers(): void {
    this.loadingCarriers = true;

    this.api
      .getCarriers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.carriers = this.unwrapArray(res);
        },
        error: () => {
          this.carriers = [];
        },
        complete: () => (this.loadingCarriers = false),
      });
  }

  private loadCarrierRelations(carrierId: number, keepSelected: boolean): void {
    this.loadDrivers(carrierId, keepSelected);
    this.loadTrucks(carrierId, keepSelected);
    this.loadTrailers(carrierId, keepSelected);
  }

  private loadDrivers(carrierId: number, keepSelected: boolean): void {
    this.loadingDrivers = true;
    this.driversMsg = '';

    this.api
      .getCarrierDrivers(carrierId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.carrierDrivers = this.unwrapArray(res);

          const current = Number(this.cConductorId?.value || 0);
          if (!keepSelected) {
            this.conductorGroup.patchValue(
              { conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
              { emitEvent: false }
            );
          } else if (current && !this.carrierDrivers.some((d) => Number(d?.id) === current)) {
            this.conductorGroup.patchValue(
              { conductorId: null, nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
              { emitEvent: false }
            );
          }

          if (!this.carrierDrivers.length) this.driversMsg = 'Este transportista no tiene conductores activos.';
        },
        error: () => {
          this.carrierDrivers = [];
          this.driversMsg = 'No se pudo cargar conductores.';
        },
        complete: () => (this.loadingDrivers = false),
      });
  }

  private loadTrucks(carrierId: number, keepSelected: boolean): void {
    this.loadingTrucks = true;
    this.trucksMsg = '';

    this.api
      .getCarrierTrucks(carrierId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.carrierTrucks = this.unwrapArray(res);

          const current = Number(this.cVehiculoId?.value || 0);
          if (!keepSelected) {
            this.vehiculoGroup.patchValue({ vehiculoId: null }, { emitEvent: false });
          } else if (current && !this.carrierTrucks.some((t) => Number(t?.id) === current)) {
            this.vehiculoGroup.patchValue({ vehiculoId: null }, { emitEvent: false });
          }

          if (!this.carrierTrucks.length) this.trucksMsg = 'Este transportista no tiene camiones activos.';
        },
        error: () => {
          this.carrierTrucks = [];
          this.trucksMsg = 'No se pudo cargar vehículos.';
        },
        complete: () => (this.loadingTrucks = false),
      });
  }

  private loadTrailers(carrierId: number, keepSelected: boolean): void {
    this.loadingTrailers = true;
    this.trailersMsg = '';

    this.api
      .getCarrierTrailers(carrierId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.carrierTrailers = this.unwrapArray(res);

          const current = Number(this.cTrailerId?.value || 0);
          if (!keepSelected) {
            this.vehiculoGroup.patchValue({ trailerId: null }, { emitEvent: false });
          } else if (current && !this.carrierTrailers.some((t) => Number(t?.id) === current)) {
            this.vehiculoGroup.patchValue({ trailerId: null }, { emitEvent: false });
          }

          if (!this.carrierTrailers.length) this.trailersMsg = 'Este transportista no tiene trailers activos.';
          this.makeTrailerOptional();
        },
        error: () => {
          this.carrierTrailers = [];
          this.trailersMsg = 'No se pudo cargar trailers.';
          this.makeTrailerOptional();
        },
        complete: () => (this.loadingTrailers = false),
      });
  }

  // =========================================================
  // AUTOLLENADO
  // =========================================================
  private fillCarrierInfoFromList(carrierId: number, keepIfAlreadyHas: boolean): void {
    const carrier = this.carriers.find((c) => Number(c?.id) === carrierId);
    if (!carrier) return;

    if (keepIfAlreadyHas) return; // cuando editas, no pisar

    this.transportistaGroup.patchValue(
      {
        nombre: carrier?.companyName ?? '',
        tipoDocumento: carrier?.documentTypeCode ?? 'RUC',
        numeroDocumento: carrier?.documentNumber ?? '',
      },
      { emitEvent: false }
    );
  }

  private fillDriverInfo(driverId: number): void {
    if (!driverId) {
      this.conductorGroup.patchValue(
        { nombre: '', tipoDocumento: '', numeroDocumento: '', licenciaConducir: '' },
        { emitEvent: false }
      );
      return;
    }

    const driver = this.carrierDrivers.find((d) => Number(d?.id) === driverId);
    if (!driver) return;

    this.conductorGroup.patchValue(
      {
        nombre: driver?.fullName ?? '',
        tipoDocumento: driver?.documentTypeCode ?? 'DNI',
        numeroDocumento: driver?.documentNumber ?? '',
        licenciaConducir: driver?.license ?? '',
      },
      { emitEvent: false }
    );
  }

  // =========================================================
  // Helpers
  // =========================================================
  private disableReadOnlyFields(): void {
    // transportista
    this.transportistaGroup.get('nombre')?.disable({ emitEvent: false });
    this.transportistaGroup.get('tipoDocumento')?.disable({ emitEvent: false });
    this.transportistaGroup.get('numeroDocumento')?.disable({ emitEvent: false });

    // conductor
    this.conductorGroup.get('nombre')?.disable({ emitEvent: false });
    this.conductorGroup.get('tipoDocumento')?.disable({ emitEvent: false });
    this.conductorGroup.get('numeroDocumento')?.disable({ emitEvent: false });
    this.conductorGroup.get('licenciaConducir')?.disable({ emitEvent: false });
  }

  private makeTrailerOptional(): void {
    this.cTrailerId?.clearValidators();
    this.cTrailerId?.updateValueAndValidity({ emitEvent: false });
  }

  private unwrapArray(res: any): any[] {
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
  }

  getTruckPlate(truck: any): string {
    return truck?.plateNumber || truck?.plate || truck?.licensePlate || truck?.placa || truck?.description || '';
  }

  getTrailerPlate(trailer: any): string {
    return trailer?.plateNumber || trailer?.plate || trailer?.licensePlate || trailer?.placa || trailer?.description || '';
  }
}
