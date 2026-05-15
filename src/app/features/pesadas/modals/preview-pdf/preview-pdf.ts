import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs';

import { WeighingService } from '../../../../core/services/weighing.service';

@Component({
  selector: 'app-preview-pdf',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview-pdf.html',
  styleUrl: './preview-pdf.scss',
})
export class PreviewPdf implements OnInit, OnDestroy {
  @Input() ticketId!: number;
  @Input() ticketLabel = '';

  isLoading = false;
  errorMessage = '';

  pdfBlob: Blob | null = null;
  pdfUrl = '';
  safePdfUrl: SafeResourceUrl | null = null;
  filename = 'ticket-balanza.pdf';

  constructor(
    public activeModal: NgbActiveModal,
    private weighingService: WeighingService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadPdf();
  }

  private loadPdf(): void {
    if (!this.ticketId) {
      this.errorMessage = 'No se recibió el ID del ticket.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.weighingService
      .getScaleTicketPdf(this.ticketId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ blob, filename }) => {
          this.pdfBlob = blob;
          this.filename = filename || `ticket-balanza-${this.ticketId}.pdf`;

          this.pdfUrl = URL.createObjectURL(blob);
          this.safePdfUrl =
            this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfUrl);
        },
        error: (err) => {
          console.error('Error cargando PDF:', err);
          this.errorMessage = 'No se pudo cargar la vista previa del PDF.';
        },
      });
  }

  download(): void {
    if (!this.pdfBlob) return;

    const url = URL.createObjectURL(this.pdfBlob);
    const a = document.createElement('a');

    a.href = url;
    a.download = this.filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  close(): void {
    this.activeModal.dismiss();
  }

  ngOnDestroy(): void {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl);
    }
  }
}