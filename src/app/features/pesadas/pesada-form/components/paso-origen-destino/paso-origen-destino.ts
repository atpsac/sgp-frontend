import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BuyingStation } from '../../../../../core/services/weighing.service';

@Component({
  selector: 'app-paso-origen-destino',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-origen-destino.html',
  styleUrl: './paso-origen-destino.scss',
})
export class PasoOrigenDestino {
  @Input() formGroup!: FormGroup;
  @Input() originStations: BuyingStation[] = [];
  @Input() destinationStations: BuyingStation[] = [];
}
