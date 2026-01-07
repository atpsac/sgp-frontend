export type EstadoTicket = 'EN REGISTRO' | 'CERRADA' | 'ANULADA' | 'EN EVALUACIÓN';

export interface EmpresaInfo {
  razonSocial: string;
  ruc: string;
  direccion?: string;
}

export interface TicketOperacionInfo {
  numeroTicket: string;       // TKTP-0000001
  fechaEmision: string;       // 2026-01-06T00:00:00 o "06/01/2026"
  sedeOperacion: string;      // ATP - LIMA
  operacion: string;          // RECEPCION DE PRODUCTO - PLANTA PRINCIPAL
  calidad?: string;           // CACAO EN GRANO HÚMEDO
  estado?: EstadoTicket;
}

export interface OrigenDestinoInfo {
  sedeOrigen: string;
  sedeDestino: string;
}

export interface DocumentoRelacionado {
  item: string;               // "01"
  socioNegocio: string;       // AMAZONAS TRADING PERU S.A.C.
  tipoDoc: string;            // EF, GR, etc.
  documento: string;          // FACTURA ELECTRONICA, GUIA, etc.
  fechaDoc: string;           // 2026-01-06
  numeroDocumento: string;    // TR5-0473247
  pesoBrutoKg?: number;
  pesoNetoKg?: number;
}

export interface TransporteInfo {
  transportista: {
    razonSocial: string;
    ruc: string;
  };
  conductor: {
    nombreCompleto: string;
    tipoDocumento: 'DNI' | 'CE' | 'PAS';
    numeroDocumento: string;
    licencia?: string;
  };
  vehiculo: {
    placa: string;
    trailer?: string;
  };
}

export interface TaraDetalle {
  empaque: string;            // SACO PLÁSTICO CREMA 150 GR
  codigo?: string;            // SPC
  taraEmpaqueKg: number;      // 0.15
  cantidad: number;           // 1
  taraTotalKg: number;        // 0.15
}

export interface PesadaDetalle {
  item: string;               // "01"
  producto: string;           // CACAO EN GRANO HÚMEDO
  balanza: string;            // COM3 Precix Weight 8513
  pesoBrutoKg: number;        // 30142.08
  taraKg: number;             // 42.00 (o suma taras)
  pesoNetoKg: number;         // 30100.08
  observaciones?: string;
  estado?: string;            // EN REGISTRO...
  taras: TaraDetalle[];       // subdetalle
}

export interface ResumenPesos {
  cantidadItems: number;
  totalPesoBrutoKg: number;
  totalTaraKg: number;
  subtotalPesoNetoKg: number;
  ajusteKg?: number;          // si usas ajuste
  diferenciaAjusteKg?: number;
  totalPesoNetoKg: number;
}

export interface TicketBalanzaReport {
  empresa: EmpresaInfo;
  ticket: any;
  origenDestino: any;
  documentos: any[];
  transporte: any;
  resumen: any;
  pesadas: any[];
}
