import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  BuyingStation,
  OperationStation,
  WeighingService,
} from '../../../../../core/services/weighing.service';

export type StationsReadyPayload = {
  principal: BuyingStation;
  nonPrincipal: BuyingStation[];
  all: BuyingStation[];
};

@Component({
  selector: 'app-paso-datos-operacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paso-datos-operacion.html',
  styleUrl: './paso-datos-operacion.scss',
})
export class PasoDatosOperacion implements OnInit {
  @Input({ required: true }) formGroup!: FormGroup;

  /** Si el encabezado ya fue guardado (form disable), pasa locked=true */
  @Input() locked = false;

  /** Si el padre te los pasa, se respetan. Si no, se calculan automáticamente */
  @Input() minFechaEmision?: string;
  @Input() maxFechaEmision?: string;

  /** Por defecto +-3 días si no vienen min/max */
  @Input() rangeDays = 3;

  /** ✅ Para que el padre reciba la sede principal y las no principales */
  @Output() stationsReady = new EventEmitter<StationsReadyPayload>();

  /**
   * ✅ Para NO romper el flujo actual:
   * el padre puede seguir llamando a loadDocumentCatalogsForOperation(opId)
   * (luego lo moveremos a PasoDocumentos).
   */
  @Output() operationChange = new EventEmitter<number>();

  private api = inject(WeighingService);
  private destroyRef = inject(DestroyRef);

  stations: BuyingStation[] = [];
  operations: OperationStation[] = [];

  loadingStations = false;
  loadingOperations = false;

  ngOnInit(): void {
    this.ensureMinMaxDates();
    this.loadStations();
    this.bindStationChanges();
    this.bindOperationChanges();
  }

  // =========================
  // Helpers de fecha
  // =========================
  private ensureMinMaxDates(): void {
    if (this.minFechaEmision && this.maxFechaEmision) return;

    const today = new Date();
    const min = this.shiftDateLocal(today, -this.rangeDays);
    const max = this.shiftDateLocal(today, +this.rangeDays);

    this.minFechaEmision = this.minFechaEmision ?? min;
    this.maxFechaEmision = this.maxFechaEmision ?? max;

    const ctrl = this.formGroup.get('fechaEmision');
    if (ctrl && !ctrl.value) {
      ctrl.setValue(this.shiftDateLocal(today, 0), { emitEvent: false });
    }
  }

  private shiftDateLocal(base: Date, days: number): string {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // =========================
  // Compare para select
  // =========================
  compareSelectValues = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return String(a) === String(b);
  };

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private setControlValueIfChanged(path: string, value: any, emitEvent = false): void {
    const ctrl = this.formGroup.get(path);
    if (!ctrl) return;

    if (this.compareSelectValues(ctrl.value, value)) {
      return;
    }

    ctrl.setValue(value, { emitEvent });
  }

  private normalizeSelectedStationValue(): void {
    const ctrl = this.formGroup.get('sedeOperacion');
    if (!ctrl) return;

    const current = this.toNumberOrNull(ctrl.value);
    if (!current) return;

    const found = this.stations.find((s) => Number(s.id) === current);
    if (!found) return;

    this.setControlValueIfChanged('sedeOperacion', found.id, false);
  }

  private normalizeSelectedOperationValue(): void {
    const ctrl = this.formGroup.get('operacion');
    if (!ctrl) return;

    const current = this.toNumberOrNull(ctrl.value);
    if (!current) return;

    const found = this.operations.find((o) => Number(o.id) === current);
    if (!found) return;

    this.setControlValueIfChanged('operacion', found.id, false);
  }

  // =========================
  // Cargar sedes (POR USUARIO)
  // =========================
  private loadStations(): void {
    this.loadingStations = true;

    this.api
      .getUserBuyingStations()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.loadingStations = false))
      )
      .subscribe({
        next: (stations) => {
          this.stations = stations || [];

          if (!this.stations.length) {
            this.operations = [];
            this.formGroup.patchValue(
              { sedeOperacion: null, operacion: null },
              { emitEvent: false }
            );
            return;
          }

          const principal =
            this.stations.find((s: any) => (s as any).isPrincipal === true) ??
            this.stations[0];

          const nonPrincipal = this.stations.filter((s) => s.id !== principal.id);

          this.stationsReady.emit({
            principal,
            nonPrincipal,
            all: this.stations,
          });

          // Normaliza el valor actual del select para que haga match aunque venga string
          this.normalizeSelectedStationValue();

          const savedStationId = this.toNumberOrNull(
            this.formGroup.get('sedeOperacion')?.value
          );

          if (
            savedStationId &&
            this.stations.some((s) => Number(s.id) === savedStationId)
          ) {
            this.loadOperations(savedStationId, true);
          } else {
            if (savedStationId) {
              this.formGroup.patchValue(
                { sedeOperacion: null, operacion: null },
                { emitEvent: false }
              );
            }
            this.operations = [];
          }
        },
        error: (err) => console.error('Error cargando sedes del usuario', err),
      });
  }

  // =========================
  // Operaciones por sede
  // =========================
  private loadOperations(stationId: number, keepOperation: boolean): void {
    if (!stationId) {
      this.operations = [];
      this.formGroup.patchValue({ operacion: null }, { emitEvent: false });
      return;
    }

    this.loadingOperations = true;

    this.api
      .getOperationsByStation(stationId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => (this.loadingOperations = false))
      )
      .subscribe({
        next: (ops) => {
          this.operations = ops || [];

          if (!keepOperation) {
            this.formGroup.patchValue({ operacion: null }, { emitEvent: false });
            return;
          }

          const currentOp = this.toNumberOrNull(
            this.formGroup.get('operacion')?.value
          );

          if (!currentOp) {
            this.formGroup.patchValue({ operacion: null }, { emitEvent: false });
            return;
          }

          const found = this.operations.find((o) => Number(o.id) === currentOp);

          if (!found) {
            this.formGroup.patchValue({ operacion: null }, { emitEvent: false });
            return;
          }

          // Normaliza el valor actual del select para que haga match aunque venga string
          this.normalizeSelectedOperationValue();
        },
        error: (err) => console.error('Error cargando operaciones', err),
      });
  }

  // =========================
  // Subscriptions
  // =========================
  private bindStationChanges(): void {
    const ctrl = this.formGroup.get('sedeOperacion');
    if (!ctrl) return;

    ctrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        if (this.locked) return;

        const stationId = this.toNumberOrNull(val);

        if (!stationId) {
          this.operations = [];
          this.formGroup.patchValue({ operacion: null }, { emitEvent: false });
          return;
        }

        this.loadOperations(stationId, false);
      });
  }

  private bindOperationChanges(): void {
    const ctrl = this.formGroup.get('operacion');
    if (!ctrl) return;

    ctrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => {
        const opId = this.toNumberOrNull(val) ?? 0;
        this.operationChange.emit(opId);
      });
  }
}