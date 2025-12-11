import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PesadaDetalle, TaraItem } from '../../pesada-form';

@Component({
  selector: 'app-paso-detalle-ticket',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-detalle-ticket.html',
  styleUrl: './paso-detalle-ticket.scss',
})
export class PasoDetalleTicket {
  @Input() formGroup!: FormGroup;
  @Input() pesadas: PesadaDetalle[] = [];
  @Input() totales!: any;

  @Output() addPesada = new EventEmitter<void>();
  @Output() editPesada = new EventEmitter<number>(); // index
  @Output() deletePesada = new EventEmitter<number>(); // index
  @Output() manageTaras = new EventEmitter<number>(); // index
  @Output() ajusteChange = new EventEmitter<void>();

  onAdd(): void {
    this.addPesada.emit();
  }

  onEdit(index: number): void {
    this.editPesada.emit(index);
  }

  onDelete(index: number): void {
    this.deletePesada.emit(index);
  }

  onManageTaras(index: number): void {
    this.manageTaras.emit(index);
  }

  onAjusteChange(): void {
    this.ajusteChange.emit();
  }
}
