import { PrintNodeReading, WeightUnit } from '../models/printnode.models';

const BILLIONTHS = 1_000_000_000;
const MICROGRAMS_TO_GRAMS = 1_000_000;

const LB_TO_KG = 0.45359237;
const OZ_TO_KG = 0.028349523125;

function toKg(value: number, unit: WeightUnit): number {
  switch (unit) {
    case 'kg': return value;
    case 'g':  return value / 1000;
    case 'lb': return value * LB_TO_KG;
    case 'oz': return value * OZ_TO_KG;
  }
}

function safeNumber(x: any): number | null {
  const n = typeof x === 'number' ? x : parseFloat(x);
  return Number.isFinite(n) ? n : null;
}

/**
 * Recibe el payload de PrintNode ScalesMeasurement y devuelve lectura normalizada.
 * Soporta:
 * - measurement.{kg,g,lb,oz} (billionths)
 * - mass[0] (micrograms)
 */
export function parsePrintNodeMeasurement(payload: any): { value: number; unit: WeightUnit; weightKg: number } | null {
  if (!payload || typeof payload !== 'object') return null;

  const m = payload.measurement;
  if (m && typeof m === 'object') {
    const candidates: Array<{ unit: WeightUnit; raw: any }> = [
      { unit: 'kg', raw: m.kg },
      { unit: 'g',  raw: m.g  },
      { unit: 'lb', raw: m.lb },
      { unit: 'oz', raw: m.oz },
    ];

    for (const c of candidates) {
      const bn = safeNumber(c.raw);
      if (bn !== null) {
        const value = bn / BILLIONTHS;         // valor en unit
        const weightKg = toKg(value, c.unit);  // normalizado
        return { value, unit: c.unit, weightKg };
      }
    }
  }

  // mass[0] => micrograms (según tu HTML)
  if (Array.isArray(payload.mass) && payload.mass.length > 0) {
    const micro = safeNumber(payload.mass[0]);
    if (micro !== null) {
      const grams = micro / MICROGRAMS_TO_GRAMS;
      const unit: WeightUnit = grams >= 1000 ? 'kg' : 'g';
      const value = unit === 'kg' ? grams / 1000 : grams;
      const weightKg = unit === 'kg' ? value : value / 1000;
      return { value, unit, weightKg };
    }
  }

  return null;
}
