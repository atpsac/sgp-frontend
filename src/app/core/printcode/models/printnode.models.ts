export type PrintNodeStatus =
  | 'DISCONNECTED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR';

export type WeightUnit = 'kg' | 'g' | 'lb' | 'oz';

export interface PrintNodeConfig {
  apiKey: string;
  computerId: number;
  deviceName: string;
  deviceNum: number;
}

export interface PrintNodeReading {
  /** Peso normalizado en kg (lo que usarás en tu ticket) */
  weightKg: number;
  /** Unidad original reportada (si aplica) */
  unit: WeightUnit;
  /** Peso en su unidad original, si quieres mostrarlo */
  value: number;

  isStable: boolean;
  timestamp: string; // ISO
  latencyMs?: number;

  /** Debug opcional */
  raw?: any;
}

export interface PrintNodeDeviceInfo {
  deviceName?: string;
  deviceNum?: number;
  vendor?: string;
  product?: string;
  port?: string;
  vendorId?: string;
  productId?: string;
}

export interface PrintNodeError {
  message: string;
  detail?: any;
}
