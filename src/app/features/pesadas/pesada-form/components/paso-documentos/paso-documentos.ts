import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DocumentoRelacionado } from '../../pesada-form';

@Component({
  selector: 'app-paso-documentos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paso-documentos.html',
  styleUrl: './paso-documentos.scss',
})
export class PasoDocumentos {
  @Input() documentos: DocumentoRelacionado[] = [];

  @Output() addDocumento = new EventEmitter<void>();
  @Output() editDocumento = new EventEmitter<number>();   // index
  @Output() deleteDocumento = new EventEmitter<number>(); // index

  onAdd(): void {
    this.addDocumento.emit();
  }

  onEdit(index: number): void {
    this.editDocumento.emit(index);
  }

  onDelete(index: number): void {
    this.deleteDocumento.emit(index);
  }
}
