import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

declare const bootstrap: any;

const LS_STEP_KEY = 'ticket-new.step';
const LS_FORM_KEY = 'ticket-new.form';

@Component({
  selector: 'app-new-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NgIf, NgFor, DatePipe, NgClass],
  templateUrl: './new.page.html',
  styleUrl: './new.page.scss'
})
export class NewPage implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // ---- Stepper ----
  step = 1;
  readonly maxStep = 5;

  stepLabels = [
    'Datos de operación',
    'Origen / Destino',
    'Documentos relacionados',
    'Datos del transporte',
    'Detalle del Ticket'
  ];
  stepIcons = [
    'bi-gear-wide-connected',
    'bi-arrow-left-right',
    'bi-files',
    'bi-truck',
    'bi-clipboard-check'
  ];

  get progressPct(): number {
    return Math.round((this.step / this.maxStep) * 100);
  }
  stepState(i: number): 'done' | 'active' | 'todo' {
    const idx = i + 1;
    if (this.step > idx) return 'done';
    if (this.step === idx) return 'active';
    return 'todo';
  }

  // ---- Catálogos (mock) ----
  sedes = ['ATP - LIMA PLANTA', 'ATP - BAGUA GRANDE', 'ATP - SAN ALEJANDRO', 'ATP - SATIPO', 'ATP - PICHARI'];
  operaciones = [
    'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL',
    'RECEPCIÓN DE PRODUCTO - SEDE DE ACOPIO',
    'DESPACHO DE PRODUCTO - PLANTA PRINCIPAL',
    'REPESEAJE - SEDE DE ACOPIO'
  ];
  socios = ['AMAZONAS TRADING PERU S.A.C.'];
  tiposDoc = ['EG', 'FG', 'NC'];
  documentosCat = ['GUIA DE REMISION ELECTRONICA', 'FACTURA', 'NOTA DE CRÉDITO'];
  transportistas = ['TRANSPORTES Y LOGÍSTICA CAMAC E.I.R.L.'];
  conductores = ['CRISTIAN PAUL ANGULO ANYOSA'];
  vehiculos = ['AVZ-547'];
  trailers = ['XDF-458'];

  // ---- Formulario principal ----
  form = this.fb.group({
    // 1) Datos de operación
    fechaEmision: ['', Validators.required],
    sede: ['', Validators.required],
    operacion: ['', Validators.required],

    // 2) Origen/Destino
    origenDestino: this.fb.group({
      sedeOrigen: [''],
      sedeDestino: ['']
    }),

    // 3) Documentos relacionados
    documentos: this.fb.array([]),

    // 4) Transporte
    transporte: this.fb.group({
      transportista: [''],
      ruc: [''],
      conductor: [''],
      dni: [''],
      licencia: [''],
      vehiculo: [''],
      trailer: ['']
    }),

    // 5) Observación
    observacion: ['']
  });

  // Form temporal para “Agregar documento”
  docTmp = this.fb.group({
    socio: [this.socios[0], Validators.required],
    tipo: [this.tiposDoc[0], Validators.required],
    documento: [this.documentosCat[0], Validators.required],
    fecha: ['', Validators.required],
    serie: ['EG07', Validators.required],
    numero: ['0000001', Validators.required],
    brutoKg: [0, [Validators.required, Validators.min(0)]],
    netoKg: [0, [Validators.required, Validators.min(0)]]
  });

  get documentosFA() { return this.form.get('documentos') as FormArray; }

  // UI
  addDocOpen = false;

  // ---------- Lifecycle ----------
  ngOnInit(): void {
    const lsStep = Number(localStorage.getItem(LS_STEP_KEY) || '0');
    this.step = lsStep > 0 ? lsStep : 1;

    const draft = localStorage.getItem(LS_FORM_KEY);
    if (draft) {
      try {
        const value = JSON.parse(draft);
        this.form.patchValue(value);
        if (Array.isArray(value?.documentos)) {
          value.documentos.forEach((d: any) => {
            this.documentosFA.push(this.fb.group({
              socio: [d.socio],
              tipo: [d.tipo],
              documento: [d.documento],
              fecha: [d.fecha],
              serie: [d.serie],
              numero: [d.numero],
              brutoKg: [d.brutoKg],
              netoKg: [d.netoKg]
            }));
          });
        }
      } catch { /* ignore */ }
    }

    this.form.valueChanges.subscribe(() => this.persist());
  }

  ngOnDestroy(): void { this.persist(); }

  // ---------- Persistencia ----------
  private persist() {
    localStorage.setItem(LS_STEP_KEY, String(this.step));
    localStorage.setItem(LS_FORM_KEY, JSON.stringify(this.form.getRawValue()));
  }
  private resetDraft() {
    localStorage.removeItem(LS_STEP_KEY);
    localStorage.removeItem(LS_FORM_KEY);
  }

  // ---------- Navegación ----------
  goTo(s: number) { this.step = Math.min(Math.max(s, 1), this.maxStep); this.persist(); }
  prev() { if (this.step > 1) { this.step--; this.persist(); } }
  next() {
    if (!this.validateCurrentStep()) return;
    if (this.step < this.maxStep) { this.step++; this.persist(); }
  }
  private validateCurrentStep(): boolean {
    if (this.step === 1) {
      const keys = ['fechaEmision', 'sede', 'operacion'];
      keys.forEach(k => this.form.get(k)?.markAsTouched());
      return keys.every(k => this.form.get(k)?.valid);
    }
    return true;
  }

  // ---------- Documentos ----------
  toggleAddDoc() { this.addDocOpen = !this.addDocOpen; }
  addDocumento() {
    if (this.docTmp.invalid) { this.docTmp.markAllAsTouched(); return; }
    this.documentosFA.push(this.fb.group(this.docTmp.getRawValue()));
    this.docTmp.reset({
      socio: this.socios[0],
      tipo: this.tiposDoc[0],
      documento: this.documentosCat[0],
      fecha: '',
      serie: 'EG07',
      numero: '0000001',
      brutoKg: 0,
      netoKg: 0
    });
    this.addDocOpen = false;
    this.persist();
  }
  removeDocumento(i: number) { this.documentosFA.removeAt(i); this.persist(); }

  // ---------- Guardado ----------
  openConfirmSave() {
    const el = document.getElementById('confirmSaveModal');
    const modal = new bootstrap.Modal(el);
    modal.show();
  }
  guardarTicket() {
    setTimeout(() => {
      this.resetDraft();
      const el = document.getElementById('successModal');
      const modal = new bootstrap.Modal(el);
      modal.show();
    }, 350);
  }

  goToList() { this.router.navigate(['/tickets-balanza']); }
  cancelarYReiniciar() {
    this.resetDraft();
    this.form.reset();
    this.step = 1;
  }
}
