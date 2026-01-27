import { Injectable } from '@angular/core';
import type { DocumentoRelacionado, PesadaDetalle } from '../pesada-form';
import type { BuyingStation } from '../../../../core/services/weighing.service';

export interface TicketDraft {
  form: any;
  documentos: DocumentoRelacionado[];
  pesadas: PesadaDetalle[];
  currentStep: number;

  headerSaved?: boolean;
  headerTicketId?: number | null;

  originStations?: BuyingStation[];
  destinationStations?: BuyingStation[];
}

@Injectable({ providedIn: 'root' })
export class TicketDraftService {
  private readonly STORAGE_KEY = 'sgp_ticket_balanza_draft';

  saveDraft(draft: TicketDraft): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(draft));
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
