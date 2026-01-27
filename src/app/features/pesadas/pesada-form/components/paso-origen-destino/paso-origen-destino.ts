import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { BuyingStation, WeighingService } from '../../../../../core/services/weighing.service';

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

  // ✅ IMPORTANTE: estos Inputs EVITAN el NG8002 si el padre los bindea
  @Input() originStations: BuyingStation[] | null = null;        // non-principal (opcional)
  @Input() destinationStations: BuyingStation[] | null = null;   // principal (opcional)

  private api = inject(WeighingService);
  private destroyRef = inject(DestroyRef);

  loadingOriginStations = false;
  loadingDestinationStations = false;

  originOptions: BuyingStation[] = [];
  destinationOptions: BuyingStation[] = [];

  ngOnInit(): void {
    // ORIGEN: si el padre manda lista, úsala; si no, llama API non-principal
    if (this.originStations?.length) {
      this.originOptions = [...this.originStations];
      this.validateSavedSelections();
    } else {
      this.loadOriginStations();
    }

    // DESTINO: si el padre manda lista, úsala; si no, llama API principal
    if (this.destinationStations?.length) {
      this.destinationOptions = [...this.destinationStations];
      this.autoselectDestinoIfSingle();
      this.validateSavedSelections();
      this.ensureNoDuplicateSelection();
    } else {
      this.loadDestinationStations();
    }
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
  // DESTINO: Principal (1 item)
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

    const currentDestino = Number(this.formGroup?.get('sedeDestino')?.value || 0);
    if (!currentDestino && this.destinationOptions.length === 1) {
      this.formGroup.patchValue(
        { sedeDestino: this.destinationOptions[0].id },
        { emitEvent: false }
      );
    }
  }

  private ensureNoDuplicateSelection(): void {
    const origenId = Number(this.formGroup?.get('sedeOrigen')?.value || 0);
    const destinoId = Number(this.formGroup?.get('sedeDestino')?.value || 0);

    if (origenId && destinoId && origenId === destinoId) {
      // como destino es principal, reseteo origen
      this.formGroup.patchValue({ sedeOrigen: null }, { emitEvent: true });
    }
  }

  private validateSavedSelections(): void {
    if (!this.formGroup) return;

    const origenId = Number(this.formGroup.get('sedeOrigen')?.value || 0);
    const destinoId = Number(this.formGroup.get('sedeDestino')?.value || 0);

    if (origenId && !this.originOptions.some((s) => s.id === origenId)) {
      this.formGroup.patchValue({ sedeOrigen: null }, { emitEvent: false });
    }

    if (destinoId && !this.destinationOptions.some((s) => s.id === destinoId)) {
      this.formGroup.patchValue({ sedeDestino: null }, { emitEvent: false });
    }
  }
}
