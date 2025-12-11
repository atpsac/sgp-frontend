import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  BuyingStation,
  OperationStation,
} from '../../../../../core/services/weighing.service';

@Component({
  selector: 'app-paso-datos-operacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-datos-operacion.html',
  styleUrl: './paso-datos-operacion.scss',
})
export class PasoDatosOperacion {
  @Input() formGroup!: FormGroup;
  @Input() stations: BuyingStation[] = [];
  @Input() operations: OperationStation[] = [];
  @Input() minFechaEmision!: string;
  @Input() maxFechaEmision!: string;

  @Output() stationChange = new EventEmitter<void>();

  onStationChange(): void {
    this.stationChange.emit();
  }
}
