import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface TaraItem {
  id?: number;
  empaque: string;
  codigo: string;
  descripcion: string;
  taraPorEmpaqueKg: number;
  cantidad: number;
  taraKg: number;
}

export interface TaraCatalogItem {
  id: number | string;
  nombre: string;             // Empaque
  codigo: string;
  descripcion: string;
  taraPorEmpaqueKg: number;
}

@Component({
  selector: 'app-pesada-tara-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-tara-add.html',
  styleUrl: './pesada-tara-add.scss',
})
export class PesadaTaraAdd implements OnInit {
  @Input() title = 'Agregar tara';
  @Input() subtitle =
    'Completa los datos del empaque y su tara para esta pesada.';

  // Para modo edición (opcional)
  @Input() initialData: TaraItem | null = null;

  // Catálogo de empaques (opcional, si no se envía uso mock)
  @Input() catalog: TaraCatalogItem[] = [];

  form!: FormGroup;
  isEdit = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.seedCatalogIfEmpty();

    if (this.initialData) {
      this.isEdit = true;
      this.patchInitialData();
    } else {
      // Seleccionar primer empaque por defecto
      const first = this.catalog[0];
      if (first) {
        this.form.patchValue({
          empaqueId: first.id,
          codigo: first.codigo,
          descripcion: first.descripcion,
          taraPorEmpaqueKg: first.taraPorEmpaqueKg,
          cantidad: 1,
        });
      }
    }

    this.recalcularTara();
    this.setupValueListeners();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      empaqueId: [null, Validators.required],
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      taraPorEmpaqueKg: [
        0,
        [Validators.required, Validators.min(0)],
      ],
      cantidad: [
        1,
        [Validators.required, Validators.min(1)],
      ],
      taraKg: [{ value: 0, disabled: true }, [Validators.min(0)]],
    });
  }

  private seedCatalogIfEmpty(): void {
    // Si no te pasan catálogo desde el padre, uso el mock de la captura
    if (this.catalog.length > 0) return;

    this.catalog = [
      {
        id: 1,
        nombre: 'SACO PLÁSTICO CREMA 150 GR',
        codigo: 'SPC',
        descripcion: 'SACO PLÁSTICO CREMA 150 GR',
        taraPorEmpaqueKg: 0.15,
      },
      {
        id: 2,
        nombre: 'SACO PLÁSTICO NEGRO 200 GR',
        codigo: 'SPN',
        descripcion: 'SACO PLÁSTICO NEGRO 200 GR',
        taraPorEmpaqueKg: 0.2,
      },
      {
        id: 3,
        nombre: 'SACO PLÁSTICO BLANCO 150 GR',
        codigo: 'SPB',
        descripcion: 'SACO PLÁSTICO BLANCO 150 GR',
        taraPorEmpaqueKg: 0.15,
      },
      {
        id: 4,
        nombre: 'SACO YUTE 300 GR',
        codigo: 'SYT',
        descripcion: 'SACO YUTE 300 GR',
        taraPorEmpaqueKg: 0.3,
      },
      {
        id: 5,
        nombre: 'PALLET MADERA',
        codigo: 'PLM',
        descripcion: 'PALLET MADERA',
        taraPorEmpaqueKg: 100.2,
      },
    ];
  }

  private patchInitialData(): void {
    if (!this.initialData) return;

    // Buscar empaque en catálogo por código o nombre (lo que tengas)
    const found = this.catalog.find(
      (c) =>
        c.codigo === this.initialData!.codigo ||
        c.nombre === this.initialData!.empaque
    );

    this.form.patchValue({
      empaqueId: found ? found.id : null,
      codigo: this.initialData.codigo,
      descripcion: this.initialData.descripcion,
      taraPorEmpaqueKg: this.initialData.taraPorEmpaqueKg,
      cantidad: this.initialData.cantidad,
    });

    this.recalcularTara();
  }

  private setupValueListeners(): void {
    this.form.get('empaqueId')?.valueChanges.subscribe((id) => {
      this.aplicarEmpaque(id);
    });

    this.form
      .get('taraPorEmpaqueKg')
      ?.valueChanges.subscribe(() => this.recalcularTara());
    this.form
      .get('cantidad')
      ?.valueChanges.subscribe(() => this.recalcularTara());
  }

  private aplicarEmpaque(id: any): void {
    const item = this.catalog.find((c) => c.id == id);
    if (!item) return;

    this.form.patchValue(
      {
        codigo: item.codigo,
        descripcion: item.descripcion,
        taraPorEmpaqueKg: item.taraPorEmpaqueKg,
      },
      { emitEvent: false }
    );

    this.recalcularTara();
  }

  private recalcularTara(): void {
    const raw = this.form.getRawValue();
    const taraUnit = Number(raw.taraPorEmpaqueKg) || 0;
    const cant = Number(raw.cantidad) || 0;
    const total = taraUnit * cant;

    this.form.patchValue(
      {
        taraKg: total,
      },
      { emitEvent: false }
    );
  }

  // ---- acciones de UI ----

  close(): void {
    if (this.loading) return;
    this.activeModal.dismiss();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const raw = this.form.getRawValue();

    const selected = this.catalog.find((c) => c.id == raw.empaqueId);

    const payload: TaraItem = {
      empaque: selected ? selected.nombre : raw.descripcion,
      codigo: raw.codigo,
      descripcion: raw.descripcion,
      taraPorEmpaqueKg: Number(raw.taraPorEmpaqueKg) || 0,
      cantidad: Number(raw.cantidad) || 0,
      taraKg: Number(raw.taraKg) || 0,
      id: this.initialData?.id,
    };

    // Devuelves la tara al modal padre (PesadaTara)
    this.activeModal.close(payload);
    this.loading = false;
  }

  // helper para template
  get f() {
    return this.form.controls;
  }
}
