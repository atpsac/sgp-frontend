export class StableDetector {
  private last: number | null = null;
  private stableSince: number | null = null;

  constructor(
    /** tolerancia (en kg) */
    private readonly thresholdKg = 0.02,
    /** tiempo mínimo estable */
    private readonly stableMs = 3000
  ) {}

  reset() {
    this.last = null;
    this.stableSince = null;
  }

  /**
   * Devuelve true si el peso se mantiene dentro del umbral por el tiempo indicado
   */
  isStable(currentKg: number): boolean {
    const now = Date.now();

    if (this.last === null) {
      this.last = currentKg;
      this.stableSince = now;
      return false;
    }

    const diff = Math.abs(currentKg - this.last);

    if (diff <= this.thresholdKg) {
      if (this.stableSince === null) this.stableSince = now;
      if (now - this.stableSince >= this.stableMs) return true;
    } else {
      this.stableSince = now;
    }

    this.last = currentKg;
    return false;
  }
}
