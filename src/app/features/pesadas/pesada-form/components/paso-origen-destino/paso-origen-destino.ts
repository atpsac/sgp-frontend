import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BuyingStation } from '../../../../../core/services/weighing.service';

@Component({
  selector: 'app-paso-origen-destino',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-origen-destino.html',
  styleUrl: './paso-origen-destino.scss',
})
export class PasoOrigenDestino implements OnChanges {
  @Input() formGroup!: FormGroup;

  @Input() originStations: BuyingStation[] = [];
  @Input() destinationStations: BuyingStation[] = [];

  /** Bloquear edición cuando ya se guardó cabecera */
  @Input() locked = false;

  // Listas filtradas para evitar duplicados
  originOptions: BuyingStation[] = [];
  destinationOptions: BuyingStation[] = [];

  ngOnChanges(_: SimpleChanges): void {
    this.rebuildOptions();
    this.ensureNoDuplicateSelection();
  }

  onOrigenChange(): void {
    this.rebuildOptions();
    this.ensureNoDuplicateSelection();
  }

  onDestinoChange(): void {
    this.rebuildOptions();
    this.ensureNoDuplicateSelection();
  }

  private rebuildOptions(): void {
    const origenId = Number(this.formGroup?.get('sedeOrigen')?.value || 0);
    const destinoId = Number(this.formGroup?.get('sedeDestino')?.value || 0);

    // En origen, ocultar el destino seleccionado (si existe)
    this.originOptions = (this.originStations || []).filter(
      (s) => !destinoId || s.id !== destinoId
    );

    // En destino, ocultar el origen seleccionado (si existe)
    this.destinationOptions = (this.destinationStations || []).filter(
      (s) => !origenId || s.id !== origenId
    );
  }

  private ensureNoDuplicateSelection(): void {
    const origenId = Number(this.formGroup?.get('sedeOrigen')?.value || 0);
    const destinoId = Number(this.formGroup?.get('sedeDestino')?.value || 0);

    if (origenId && destinoId && origenId === destinoId) {
      // Si son iguales, reseteo destino (puedes elegir resetear origen si prefieres)
      this.formGroup.patchValue({ sedeDestino: null }, { emitEvent: true });
      this.rebuildOptions();
    }
  }
}
