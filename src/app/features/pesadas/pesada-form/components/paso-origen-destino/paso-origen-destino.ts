import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import {
  BuyingStation,
  WeighingService,
} from '../../../../../core/services/weighing.service';

@Component({
  selector: 'app-paso-origen-destino',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-origen-destino.html',
  styleUrl: './paso-origen-destino.scss',
})
export class PasoOrigenDestino implements OnInit {
  @Input() formGroup!: FormGroup;
  @Input() locked = false;

  @Input() originStations: BuyingStation[] | null = null;
  @Input() destinationStations: BuyingStation[] | null = null;

  private api = inject(WeighingService);
  private destroyRef = inject(DestroyRef);

  loadingOriginStations = false;
  loadingDestinationStations = false;

  originOptions: BuyingStation[] = [];
  destinationOptions: BuyingStation[] = [];

  ngOnInit(): void {
    if (this.originStations?.length) {
      this.originOptions = [...this.originStations];
      this.normalizeSelectedOrigenValue();
      this.validateSavedSelections();
    } else {
      this.loadOriginStations();
    }

    if (this.destinationStations?.length) {
      this.destinationOptions = [...this.destinationStations];
      this.normalizeSelectedDestinoValue();
      this.autoselectDestinoIfSingle();
      this.validateSavedSelections();
      this.ensureNoDuplicateSelection();
    } else {
      this.loadDestinationStations();
    }
  }

  // =========================
  // Compare para select
  // =========================
  compareSelectValues = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return String(a) === String(b);
  };

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private setControlValueIfChanged(path: string, value: any, emitEvent = false): void {
    const ctrl = this.formGroup?.get(path);
    if (!ctrl) return;

    if (this.compareSelectValues(ctrl.value, value)) {
      return;
    }

    ctrl.setValue(value, { emitEvent });
  }

  private normalizeSelectedOrigenValue(): void {
    const ctrl = this.formGroup?.get('sedeOrigen');
    if (!ctrl) return;

    const current = this.toNumberOrNull(ctrl.value);
    if (!current) return;

    const found = this.originOptions.find((s) => Number(s.id) === current);
    if (!found) return;

    this.setControlValueIfChanged('sedeOrigen', found.id, false);
  }

  private normalizeSelectedDestinoValue(): void {
    const ctrl = this.formGroup?.get('sedeDestino');
    if (!ctrl) return;

    const current = this.toNumberOrNull(ctrl.value);
    if (!current) return;

    const found = this.destinationOptions.find((s) => Number(s.id) === current);
    if (!found) return;

    this.setControlValueIfChanged('sedeDestino', found.id, false);
  }

  onOrigenChange(): void {
    this.ensureNoDuplicateSelection();
  }

  onDestinoChange(): void {
    this.ensureNoDuplicateSelection();
  }

  // =========================
  // ORIGEN: Non-principal
  // =========================
  private loadOriginStations(): void {
    this.loadingOriginStations = true;

    this.api
      .getNonPrincipalBuyingStations()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.loadingOriginStations = false))
      )
      .subscribe({
        next: (stations) => {
          this.originOptions = stations || [];
          this.normalizeSelectedOrigenValue();
          this.validateSavedSelections();
        },
        error: (err) => {
          this.originOptions = [];
          this.formGroup?.patchValue({ sedeOrigen: null }, { emitEvent: false });
          console.error('Error cargando sedes ORIGEN (non-principal)', err);
        },
      });
  }

  // =========================
  // DESTINO: Principal
  // =========================
  private loadDestinationStations(): void {
    this.loadingDestinationStations = true;

    this.api
      .getPrincipalBuyingStation()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.loadingDestinationStations = false))
      )
      .subscribe({
        next: (principal) => {
          this.destinationOptions = principal ? [principal] : [];
          this.normalizeSelectedDestinoValue();
          this.autoselectDestinoIfSingle();
          this.validateSavedSelections();
          this.ensureNoDuplicateSelection();
        },
        error: (err) => {
          this.destinationOptions = [];
          this.formGroup?.patchValue({ sedeDestino: null }, { emitEvent: false });
          console.error('Error cargando sede DESTINO (principal)', err);
        },
      });
  }

  private autoselectDestinoIfSingle(): void {
    if (this.locked) return;

    const currentDestino = this.toNumberOrNull(
      this.formGroup?.get('sedeDestino')?.value
    );

    if (!currentDestino && this.destinationOptions.length === 1) {
      this.formGroup.patchValue(
        { sedeDestino: this.destinationOptions[0].id },
        { emitEvent: false }
      );
    }
  }

  private ensureNoDuplicateSelection(): void {
    const origenId = this.toNumberOrNull(
      this.formGroup?.get('sedeOrigen')?.value
    );
    const destinoId = this.toNumberOrNull(
      this.formGroup?.get('sedeDestino')?.value
    );

    if (origenId && destinoId && origenId === destinoId) {
      this.formGroup.patchValue({ sedeOrigen: null }, { emitEvent: true });
    }
  }

  private validateSavedSelections(): void {
    if (!this.formGroup) return;

    const origenId = this.toNumberOrNull(
      this.formGroup.get('sedeOrigen')?.value
    );
    const destinoId = this.toNumberOrNull(
      this.formGroup.get('sedeDestino')?.value
    );

    if (
      origenId &&
      !this.originOptions.some((s) => Number(s.id) === origenId)
    ) {
      this.formGroup.patchValue({ sedeOrigen: null }, { emitEvent: false });
    }

    if (
      destinoId &&
      !this.destinationOptions.some((s) => Number(s.id) === destinoId)
    ) {
      this.formGroup.patchValue({ sedeDestino: null }, { emitEvent: false });
    }
  }
}