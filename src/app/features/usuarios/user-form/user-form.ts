import { Component, Input, OnInit, inject } from '@angular/core';
import {
  CommonModule
} from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { Users } from '../services/users';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss'],
})
export class UserForm implements OnInit {
  @Input() data: any | null = null;

  form!: FormGroup;
  loading = false;
  loadingData = false;      // por si el HTML lo usa para spinner
  loadingRoles = false;
  lookupLoading = false;

  roleOptions: { RolId: number; Nombre: string }[] = [];

  // UI para búsqueda por documento
  docSelect: 'DNI' | 'CE' = 'DNI';
  docNumber = '';

  private fb = inject(FormBuilder);
  private api = inject(Users);          // ✅ Solo se usa para identidadLookup (RENIEC)
  private activeModal = inject(NgbActiveModal);

  // --- Roles MOCK (sin API) ---
  private mockRoles = [
    { RolId: 1, Nombre: 'Cliente' },
    { RolId: 2, Nombre: 'Vendedor' },
    { RolId: 3, Nombre: 'Administrador' },
  ];

  get isEdit(): boolean {
    return !!(this.data && Number(this.data.UsuarioId));
  }

  get title(): string {
    return this.isEdit ? 'Editar usuario' : 'Crear usuario';
  }

  ngOnInit(): void {
    this.buildForm();
    this.fetchRoles(); // desde mock

    // Si es edición, usamos los datos que llegan por @Input()
    if (this.isEdit && this.data) {
      this.patchFromData(this.data);
    }
  }

  /* ============== FORM ============== */
  private buildForm(): void {
    this.form = this.fb.group(
      {
        // Backing fields (no inputs visibles directos)
        TipoDocumentoId: [1], // 1: DNI, 2: CE
        NumeroDocumento: ['', [Validators.maxLength(15)]],

        Correo: [
          '',
          [Validators.required, Validators.email, Validators.maxLength(120)],
        ],
        Telefono: ['', [Validators.maxLength(20)]],

        Nombres: ['', [Validators.required, Validators.maxLength(80)]],
        Apellidos: ['', [Validators.required, Validators.maxLength(120)]],

        Departamento: ['', [Validators.maxLength(80)]],
        Provincia: ['', [Validators.maxLength(80)]],
        Distrito: ['', [Validators.maxLength(80)]],

        FechaNacimiento: [null], // yyyy-mm-dd
        Sexo: [''], // 'M' | 'F' | 'O' | ''
        Edad: [null],

        RolId: [null, [Validators.required]],
        Contrasena: [''],
        Contrasena2: [''],

        FlagActivo: [1],
        Foto: [''], // se envía vacío / existente pero no se muestra
      },
      { validators: [this.passwordsMatch()] }
    );

    // Reglas de contraseña según modo
    if (!this.isEdit) {
      this.form
        .get('Contrasena')
        ?.addValidators([Validators.required, Validators.minLength(6)]);
    } else {
      this.form.get('Contrasena')?.addValidators([Validators.minLength(6)]);
    }

    // Autocalcular edad
    this.form.get('FechaNacimiento')?.valueChanges.subscribe((v) => {
      const e = this.calcAge(v);
      if (e !== null) {
        this.form.patchValue({ Edad: e }, { emitEvent: false });
      }
    });
  }

  private passwordsMatch() {
    return (group: AbstractControl): ValidationErrors | null => {
      const p = group.get('Contrasena')?.value || '';
      const c = group.get('Contrasena2')?.value || '';

      // En edición, solo validar match si se escribió nueva contraseña
      if (this.isEdit && !p && !c) return null;
      if (!p && !c && !this.isEdit) return { passRequired: true };

      return p === c ? null : { passMismatch: true };
    };
  }

  // ========== ROLES (SIN API) ==========
  private fetchRoles(): void {
    this.loadingRoles = true;
    this.roleOptions = [...this.mockRoles];
    this.loadingRoles = false;
  }

  // ========== CARGA DE DATOS (SIN API) ==========
  private patchFromData(res: any): void {
    // Simula lo que hacía loadUser, pero con lo que llegó por @Input()
    this.form.patchValue({
      TipoDocumentoId: res?.TipoDocumentoId ?? 1,
      NumeroDocumento: res?.NumeroDocumento ?? '',
      Correo: res?.Correo ?? '',
      Telefono: res?.Telefono ?? '',
      Nombres: res?.Nombres ?? '',
      Apellidos: res?.Apellidos ?? '',
      Departamento: res?.Departamento ?? '',
      Provincia: res?.Provincia ?? '',
      Distrito: res?.Distrito ?? '',
      FechaNacimiento: res?.FechaNacimiento ?? null,
      Sexo: res?.Sexo ?? '',
      Edad: res?.Edad ?? null,
      RolId: res?.RolId ?? null,
      Foto: res?.Foto ?? '',
      FlagActivo: res?.FlagActivo ?? 1,
    });

    // UI del lookup
    this.docSelect = res?.TipoDocumentoId == 2 ? 'CE' : 'DNI';
    this.docNumber = res?.NumeroDocumento ?? '';
  }

  /* ============== LOOKUP DNI/CE (RENIEC) ============== */
  buscarIdentidad(): void {
    const numero = (this.docNumber || '').trim();
    if (!numero) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta número',
        text: 'Ingresa el número de documento.',
      });
      return;
    }

    this.lookupLoading = true;

    // ✅ ESTA ES LA ÚNICA API QUE MANTENEMOS
    this.api.identidadLookup(this.docSelect, numero).subscribe({
      next: (res) => {
        const get = (a: string, b: string) =>
          (res as any)?.[a] ?? (res as any)?.[b] ?? null;

        const nombres = get('Nombres', 'nombres');
        const apellidos = get('Apellidos', 'apellidos');
        const dep = get('Departamento', 'departamento');
        const prov = get('Provincia', 'provincia');
        const dist = get('Distrito', 'distrito');
        const sexo = get('Sexo', 'sexo');

        const fnRaw = get('FechaNacimiento', 'fecha_nacimiento');
        const fnISO = this.parseDateToISO(fnRaw);
        const edadCalc = this.calcAge(fnISO);

        this.form.patchValue({
          TipoDocumentoId: this.docSelect === 'CE' ? 2 : 1,
          NumeroDocumento: numero,
          Nombres: nombres ?? this.form.value.Nombres,
          Apellidos: apellidos ?? this.form.value.Apellidos,
          Departamento: dep ?? this.form.value.Departamento,
          Provincia: prov ?? this.form.value.Provincia,
          Distrito: dist ?? this.form.value.Distrito,
          FechaNacimiento: fnISO ?? this.form.value.FechaNacimiento,
          Sexo:
            sexo === 'M' || sexo === 'F' || sexo === 'O'
              ? sexo
              : this.form.value.Sexo || '',
          Edad: edadCalc ?? this.form.value.Edad,
        });

        this.lookupLoading = false;
      },
      error: (err) => {
        this.lookupLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'No encontrado',
          text:
            err?.error?.error || err?.error?.message || 'No se pudo consultar el documento.',
        });
      },
    });
  }

  /* ============== UTIL ============== */
  close(): void {
    if (!this.loading) this.activeModal.dismiss('cancel');
  }

  private calcAge(iso: string | null): number | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const t = new Date();
    let age = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
    return age;
  }

  private parseDateToISO(raw: string | null): string | null {
    if (!raw) return null;

    // ya ISO yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // dd/mm/yyyy
    const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const [_, d, mo, y] = m;
      return `${y}-${mo}-${d}`;
    }

    const dt = new Date(raw);
    if (!isNaN(dt.getTime())) {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  }

  /* ============== GUARDAR (SIN API) ============== */
  save(): void {
    if (this.loading || this.loadingData) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading = true;

    const payload: any = {
      ...this.form.value,
      Foto: this.isEdit ? this.data?.Foto ?? '' : '',
      FlagActivo: 1,
    };

    // En edición, si no hay nueva contraseña, no enviamos campo (para cuando conectes backend)
    if (
      this.isEdit &&
      (!payload.Contrasena || String(payload.Contrasena).trim() === '')
    ) {
      delete payload.Contrasena;
    }

    // 🔹 Simulación de guardado SIN API (modo demo)
    setTimeout(() => {
      this.loading = false;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        html: `<span style="font-size:14px">${
          this.isEdit ? 'Usuario actualizado' : 'Usuario creado'
        } correctamente (modo demo, sin API).</span>`,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        background: '#e6ffed',
        color: '#2d662d',
      });

      // devolvemos datos al padre por si quiere actualizar el array en memoria
      const merged = this.isEdit
        ? { ...this.data, ...payload }
        : { ...payload };

      this.activeModal.close({
        isEdit: this.isEdit,
        data: merged,
      });
    }, 600);
  }
}
