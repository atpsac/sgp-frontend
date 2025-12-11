import { Injectable } from '@angular/core';
import { DocumentoRelacionado, PesadaDetalle } from '../pesada-form';

export interface TicketDraft {
  form: any;                         // this.ticketForm.value
  documentos: DocumentoRelacionado[];
  pesadas: PesadaDetalle[];
  currentStep: number;
}

@Injectable({
  providedIn: 'root', // si quieres que sea solo para pesadas, quítalo y proveelo en PesadaForm
})
export class TicketDraftService {
  private readonly STORAGE_KEY = 'sgp_ticket_balanza_draft';

  saveDraft(draft: TicketDraft): void {
    try {
      const json = JSON.stringify(draft);
      localStorage.setItem(this.STORAGE_KEY, json);
    } catch (error) {
      console.error('Error guardando borrador de ticket en localStorage', error);
    }
  }

  loadDraft(): TicketDraft | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as TicketDraft;
    } catch (error) {
      console.error('Error leyendo borrador de ticket en localStorage', error);
      return null;
    }
  }

  clearDraft(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error eliminando borrador de ticket en localStorage', error);
    }
  }
}
