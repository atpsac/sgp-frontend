import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  Carrier,
  CarrierDriver,
  CarrierTruck,
  CarrierTrailer,
} from '../../../../../core/services/weighing.service';

@Component({
  selector: 'app-paso-transporte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-transporte.html',
  styleUrl: './paso-transporte.scss',
})
export class PasoTransporte {
  @Input() formGroup!: FormGroup;

  @Input() carriers: Carrier[] = [];
  @Input() carrierDrivers: CarrierDriver[] = [];
  @Input() carrierTrucks: CarrierTruck[] = [];
  @Input() carrierTrailers: CarrierTrailer[] = [];

  @Output() transportistaChange = new EventEmitter<void>();
  @Output() conductorChange = new EventEmitter<void>();

  // Les damos una función por defecto para evitar undefined
  @Input() getTruckPlate: (truck: CarrierTruck) => string = () => '';
  @Input() getTrailerPlate: (trailer: CarrierTrailer) => string = () => '';

  onTransportistaChange(): void {
    this.transportistaChange.emit();
  }

  onConductorChange(): void {
    this.conductorChange.emit();
  }
}
