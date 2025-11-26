import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface PesadaPesoOption {
  id: number | string;
  nombre: string;
}

/** Forma mínima que tu PesadaForm espera recibir del modal */
interface TaraItemLight {
  id?: number;
  empaque?: string;
  codigo?: string;
  descripcion?: string;
  taraPorEmpaqueKg?: number;
  cantidad?: number;
  taraKg?: number;
}

interface PesadaDetalleResult {
  id?: number;
  producto: string;
  balanza: string;
  pesoBrutoKg: number;
  taraTotalKg: number;
  pesoNetoKg: number;
  observaciones: string;
  tieneTara: boolean;
  estado: string;
  taras: TaraItemLight[];
}

@Component({
  selector: 'app-pesada-peso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-peso.html',
  styleUrl: './pesada-peso.scss',
})
export class PesadaPeso implements OnInit {
  /** Lo que le envía PesadaForm:
   *  { pesada: PesadaDetalle | null, productos: string[], balanzas: string[] }
   */
  @Input() data: any;

  // Título y subtítulo configurables
  @Input() title = 'Agregar pesada';
  @Input() subtitle =
    'Completa los datos de la pesada. El peso bruto se mostrará en el visor de la derecha.';

  // Opciones para los selects
  productoOptions: PesadaPesoOption[] = [];
  balanzaOptions: PesadaPesoOption[] = [];

  // Pesada existente (si es edición)
  private existingPesada: any | null = null;

  form!: FormGroup;
  loading = false;
  loadingData = false;
  isEdit = false;

  // Valor mostrado en el visor de la derecha
  pesoActual = 0;

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    // ==============================
    // 1) Preparar combos desde data
    // ==============================
    const productosRaw: string[] = this.data?.productos ?? [];
    const balanzasRaw: string[] = this.data?.balanzas ?? [];
    this.existingPesada = this.data?.pesada ?? null;

    if (productosRaw.length) {
      this.productoOptions = productosRaw.map((nombre) => ({
        id: nombre,          // usamos el nombre como id
        nombre,
      }));
    } else {
      // fallback demo
      this.productoOptions = [
        { id: 'CACAO EN GRANO HÚMEDO', nombre: 'CACAO EN GRANO HÚMEDO' },
        { id: 'CACAO EN GRANO SECO', nombre: 'CACAO EN GRANO SECO' },
      ];
    }

    if (balanzasRaw.length) {
      this.balanzaOptions = balanzasRaw.map((nombre) => ({
        id: nombre,
        nombre,
      }));
    } else {
      // fallback demo
      this.balanzaOptions = [
        { id: '001-METTLER TOLEDO PBA430', nombre: '001-METTLER TOLEDO PBA430' },
        { id: '002-METTLER TOLEDO PBA430', nombre: '002-METTLER TOLEDO PBA430' },
      ];
    }

    // ==========================
    // 2) Construir formulario
    // ==========================
    this.buildForm();

    if (this.existingPesada) {
      // ---- Modo edición ----
      this.isEdit = true;

      this.form.patchValue({
        ProductoId:
          this.existingPesada.producto ??
          this.productoOptions[0]?.id ??
          null,
        BalanzaId:
          this.existingPesada.balanza ??
          this.balanzaOptions[0]?.id ??
          null,
        PesoBruto: this.existingPesada.pesoBrutoKg ?? 0,
        Observaciones: this.existingPesada.observaciones ?? '',
      });

      this.pesoActual = Number(this.existingPesada.pesoBrutoKg) || 0;
    } else {
      // ---- Modo creación ----
      const firstProducto = this.productoOptions[0];
      const firstBalanza = this.balanzaOptions[0];

      this.form.patchValue({
        ProductoId: firstProducto ? firstProducto.id : null,
        BalanzaId: firstBalanza ? firstBalanza.id : null,
        PesoBruto: 0,
        Observaciones: '',
      });

      this.pesoActual = 0;
    }

    // Cada vez que cambie el peso, actualizamos el visor
    this.form
      .get('PesoBruto')
      ?.valueChanges.subscribe((val: any) => this.updatePesoActual(val));
  }

  private buildForm(): void {
    this.form = this.fb.group({
      ProductoId: [null, Validators.required],
      BalanzaId: [null, Validators.required],
      PesoBruto: [0, [Validators.required, Validators.min(0)]],
      Observaciones: [''],
    });
  }

  private updatePesoActual(raw: any): void {
    const num = parseFloat(raw);
    this.pesoActual = isNaN(num) ? 0 : num;
  }

  // Cerrar sin devolver datos
  close(): void {
    if (this.loading) return;
    this.activeModal.dismiss();
  }

  // Guardar y devolver la pesada al padre (como PesadaDetalle)
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const value = this.form.value;

    const productoOpt = this.productoOptions.find(
      (p) => p.id === value.ProductoId
    );
    const balanzaOpt = this.balanzaOptions.find(
      (b) => b.id === value.BalanzaId
    );

    const pesoBruto = value.PesoBruto != null ? Number(value.PesoBruto) : 0;

    const prev = this.existingPesada || {};
    const taras: TaraItemLight[] = Array.isArray(prev.taras) ? prev.taras : [];
    const taraTotalKg =
      typeof prev.taraTotalKg === 'number'
        ? prev.taraTotalKg
        : taras.reduce((acc, t) => acc + (t.taraKg || 0), 0) || 0;

    const pesoNetoKg = pesoBruto - taraTotalKg;
    const estado = prev.estado || 'EN REGISTRO';
    const tieneTara = taraTotalKg > 0 || !!prev.tieneTara;

    const result: PesadaDetalleResult = {
      id: prev.id,
      producto: productoOpt?.nombre || prev.producto || '',
      balanza: balanzaOpt?.nombre || prev.balanza || '',
      pesoBrutoKg: pesoBruto,
      taraTotalKg,
      pesoNetoKg,
      observaciones:
        (value.Observaciones || '').toString().trim() || '-',
      tieneTara,
      estado,
      taras,
    };

    // Esto es lo que tu PesadaForm recibe en modalRef.result
    this.activeModal.close(result);
    this.loading = false;
  }

  // Helper para el template
  get f() {
    return this.form.controls;
  }
}
