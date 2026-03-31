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

  get loadingRelations(): boolean {
    return this.loadingDrivers || this.loadingTrucks || this.loadingTrailers;
  }

  get ready(): boolean {
    return !!this.formGroup
      && !!this.formGroup.get('transportista')
      && !!this.formGroup.get('conductor')
      && !!this.formGroup.get('vehiculo');
  }

  // ====== compare para select ======
  compareSelectValues = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return String(a) === String(b);
  };

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

    this.disableReadOnlyFields();
    this.makeTrailerOptional();
    this.bindValueChanges();
    this.loadCarriers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // BINDS
  // =========================================================

  private bindValueChanges(): void {
    this.cTransportistaId?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.locked) return;
        this.onTransportistaChange();
      });

    this.cConductorId?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.locked) return;
        this.onConductorChange();
      });
  }

  // =========================================================
  // HANDLERS
  // =========================================================

  onTransportistaChange(): void {
    if (!this.ready || this.locked) return;

    const carrierId = this.toNumberOrNull(this.cTransportistaId?.value);

    this.clearCarrierDependentSelections();

    if (!carrierId) {
      this.transportistaGroup.patchValue(
        { nombre: '', tipoDocumento: '', numeroDocumento: '' },
        { emitEvent: false }
      );
      return;
    }

    this.fillCarrierInfoFromList(carrierId, false);
    this.loadCarrierRelations(carrierId, false);
  }

  onConductorChange(): void {
    if (!this.ready || this.locked) return;
    const driverId = this.toNumberOrNull(this.cConductorId?.value);
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

          this.normalizeSelectedCarrierValue();

          const carrierId = this.toNumberOrNull(this.cTransportistaId?.value);
          if (carrierId) {
            this.fillCarrierInfoFromList(carrierId, true);
            this.loadCarrierRelations(carrierId, true);
          }
        },
        error: () => {
          this.carriers = [];
        },
        complete: () => {
          this.loadingCarriers = false;
        },
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

          const current = this.toNumberOrNull(this.cConductorId?.value);

          if (!keepSelected) {
            this.conductorGroup.patchValue(
              {
                conductorId: null,
                nombre: '',
                tipoDocumento: '',
                numeroDocumento: '',
                licenciaConducir: '',
              },
              { emitEvent: false }
            );
          } else if (current && !this.carrierDrivers.some((d) => Number(d?.id) === current)) {
            this.conductorGroup.patchValue(
              {
                conductorId: null,
                nombre: '',
                tipoDocumento: '',
                numeroDocumento: '',
                licenciaConducir: '',
              },
              { emitEvent: false }
            );
          } else {
            this.normalizeSelectedDriverValue();
            this.fillDriverInfo(current);
          }

          if (!this.carrierDrivers.length) {
            this.driversMsg = 'Este transportista no tiene conductores activos.';
          }
        },
        error: () => {
          this.carrierDrivers = [];
          this.driversMsg = 'No se pudo cargar conductores.';
        },
        complete: () => {
          this.loadingDrivers = false;
        },
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

          const current = this.toNumberOrNull(this.cVehiculoId?.value);

          if (!keepSelected) {
            this.vehiculoGroup.patchValue(
              { vehiculoId: null },
              { emitEvent: false }
            );
          } else if (current && !this.carrierTrucks.some((t) => Number(t?.id) === current)) {
            this.vehiculoGroup.patchValue(
              { vehiculoId: null },
              { emitEvent: false }
            );
          } else {
            this.normalizeSelectedTruckValue();
          }

          if (!this.carrierTrucks.length) {
            this.trucksMsg = 'Este transportista no tiene camiones activos.';
          }
        },
        error: () => {
          this.carrierTrucks = [];
          this.trucksMsg = 'No se pudo cargar vehículos.';
        },
        complete: () => {
          this.loadingTrucks = false;
        },
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

          const current = this.toNumberOrNull(this.cTrailerId?.value);

          if (!keepSelected) {
            this.vehiculoGroup.patchValue(
              { trailerId: null },
              { emitEvent: false }
            );
          } else if (current && !this.carrierTrailers.some((t) => Number(t?.id) === current)) {
            this.vehiculoGroup.patchValue(
              { trailerId: null },
              { emitEvent: false }
            );
          } else {
            this.normalizeSelectedTrailerValue();
          }

          if (!this.carrierTrailers.length) {
            this.trailersMsg = 'Este transportista no tiene trailers activos.';
          }

          this.makeTrailerOptional();
        },
        error: () => {
          this.carrierTrailers = [];
          this.trailersMsg = 'No se pudo cargar trailers.';
          this.makeTrailerOptional();
        },
        complete: () => {
          this.loadingTrailers = false;
        },
      });
  }

  // =========================================================
  // NORMALIZAR SELECCIONES
  // =========================================================

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private setControlValueIfChanged(ctrl: FormControl | null, value: any): void {
    if (!ctrl) return;

    if (this.compareSelectValues(ctrl.value, value)) {
      return;
    }

    ctrl.setValue(value, { emitEvent: false });
  }

  private normalizeSelectedCarrierValue(): void {
    const current = this.toNumberOrNull(this.cTransportistaId?.value);
    if (!current) return;

    const found = this.carriers.find((c) => Number(c?.id) === current);
    if (!found) return;

    this.setControlValueIfChanged(this.cTransportistaId, found.id);
  }

  private normalizeSelectedDriverValue(): void {
    const current = this.toNumberOrNull(this.cConductorId?.value);
    if (!current) return;

    const found = this.carrierDrivers.find((d) => Number(d?.id) === current);
    if (!found) return;

    this.setControlValueIfChanged(this.cConductorId, found.id);
  }

  private normalizeSelectedTruckValue(): void {
    const current = this.toNumberOrNull(this.cVehiculoId?.value);
    if (!current) return;

    const found = this.carrierTrucks.find((t) => Number(t?.id) === current);
    if (!found) return;

    this.setControlValueIfChanged(this.cVehiculoId, found.id);
  }

  private normalizeSelectedTrailerValue(): void {
    const current = this.toNumberOrNull(this.cTrailerId?.value);
    if (!current) return;

    const found = this.carrierTrailers.find((t) => Number(t?.id) === current);
    if (!found) return;

    this.setControlValueIfChanged(this.cTrailerId, found.id);
  }

  // =========================================================
  // AUTOLLENADO
  // =========================================================

  private fillCarrierInfoFromList(carrierId: number | null, preserveExisting: boolean): void {
    if (!carrierId) {
      this.transportistaGroup.patchValue(
        { nombre: '', tipoDocumento: '', numeroDocumento: '' },
        { emitEvent: false }
      );
      return;
    }

    const carrier = this.carriers.find((c) => Number(c?.id) === carrierId);
    if (!carrier) return;

    const currentName = String(this.transportistaGroup.get('nombre')?.value ?? '').trim();
    const currentType = String(this.transportistaGroup.get('tipoDocumento')?.value ?? '').trim();
    const currentDoc = String(this.transportistaGroup.get('numeroDocumento')?.value ?? '').trim();

    this.transportistaGroup.patchValue(
      {
        nombre:
          preserveExisting && currentName
            ? currentName
            : carrier?.companyName ?? '',
        tipoDocumento:
          preserveExisting && currentType
            ? currentType
            : carrier?.documentTypeCode ??
              carrier?.documentTypeName ??
              'RUC',
        numeroDocumento:
          preserveExisting && currentDoc
            ? currentDoc
            : carrier?.documentNumber ?? '',
      },
      { emitEvent: false }
    );
  }

  private fillDriverInfo(driverId: number | null): void {
    if (!driverId) {
      this.conductorGroup.patchValue(
        {
          nombre: '',
          tipoDocumento: '',
          numeroDocumento: '',
          licenciaConducir: '',
        },
        { emitEvent: false }
      );
      return;
    }

    const driver = this.carrierDrivers.find((d) => Number(d?.id) === driverId);
    if (!driver) return;

    this.conductorGroup.patchValue(
      {
        nombre: driver?.fullName ?? driver?.companyName ?? '',
        tipoDocumento:
          driver?.documentTypeCode ??
          driver?.documentTypeName ??
          'DNI',
        numeroDocumento: driver?.documentNumber ?? '',
        licenciaConducir: driver?.license ?? '',
      },
      { emitEvent: false }
    );
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private disableReadOnlyFields(): void {
    this.transportistaGroup.get('nombre')?.disable({ emitEvent: false });
    this.transportistaGroup.get('tipoDocumento')?.disable({ emitEvent: false });
    this.transportistaGroup.get('numeroDocumento')?.disable({ emitEvent: false });

    this.conductorGroup.get('nombre')?.disable({ emitEvent: false });
    this.conductorGroup.get('tipoDocumento')?.disable({ emitEvent: false });
    this.conductorGroup.get('numeroDocumento')?.disable({ emitEvent: false });
    this.conductorGroup.get('licenciaConducir')?.disable({ emitEvent: false });
  }

  private makeTrailerOptional(): void {
    this.cTrailerId?.clearValidators();
    this.cTrailerId?.updateValueAndValidity({ emitEvent: false });
  }

  private clearCarrierDependentSelections(): void {
    this.conductorGroup.patchValue(
      {
        conductorId: null,
        nombre: '',
        tipoDocumento: '',
        numeroDocumento: '',
        licenciaConducir: '',
      },
      { emitEvent: false }
    );

    this.vehiculoGroup.patchValue(
      {
        vehiculoId: null,
        trailerId: null,
      },
      { emitEvent: false }
    );

    this.carrierDrivers = [];
    this.carrierTrucks = [];
    this.carrierTrailers = [];

    this.driversMsg = '';
    this.trucksMsg = '';
    this.trailersMsg = '';
  }

  private unwrapArray(res: any): any[] {
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
  }

  getTruckPlate(truck: any): string {
    return (
      truck?.plateNumber ||
      truck?.plate ||
      truck?.licensePlate ||
      truck?.placa ||
      truck?.description ||
      ''
    );
  }

  getTrailerPlate(trailer: any): string {
    return (
      trailer?.plateNumber ||
      trailer?.plate ||
      trailer?.licensePlate ||
      trailer?.placa ||
      trailer?.description ||
      ''
    );
  }
}