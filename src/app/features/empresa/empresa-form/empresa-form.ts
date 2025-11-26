import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

interface BankAccount {
  id: number;
  banco: string;
  cuenta: string;
  moneda: string;
  tipoCuenta: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './empresa-form.html',
  styleUrl: './empresa-form.scss',
})
export class EmpresaForm {
  empresaForm: FormGroup;

  logoPreview = 'assets/company.png';

  cuentas: BankAccount[] = [];

  constructor(private fb: FormBuilder) {
    // -------- DATOS DE EMPRESA (editables en la card) --------
    this.empresaForm = this.fb.group({
      razonSocial: [
        'AMAZONAS TRADING PERU S.A.C.',
        Validators.required,
      ],
      ruc: ['20521137682', Validators.required],
      telefono1: ['(01) 371-1443', Validators.required],
      telefono2: ['936-566-989'],
      correo: [
        'sales@amazonastrading.com',
        [Validators.required, Validators.email],
      ],
      web: ['https://www.amazonastrading.com'],
      direccion: [
        'Cal. Los Brillantes, Urb. La Capitana Lote S15B Mz C1, Lurigancho - Lima - Perú',
        Validators.required,
      ],
      ubigeo: ['LIMA - LIMA - LURIGANCHO (LA CAPITANA)', Validators.required],
      rubro: ['Exportación de cacao en grano y derivados'],
      tipoContribuyente: ['SOCIEDAD ANÓNIMA CERRADA'],
    });

    // Demo inicial (luego lo cargas desde tu API)
    this.cuentas = [
      {
        id: 1,
        banco: 'BCP',
        cuenta: '194-9234456-0-41 CCI: 0021900929485204556',
        moneda: 'SOLES',
        tipoCuenta: 'CUENTA CORRIENTE',
        estado: 'ACTIVO',
      },
      {
        id: 2,
        banco: 'INTERBANK',
        cuenta: '0011-0146-02-00012113',
        moneda: 'SOLES',
        tipoCuenta: 'CUENTA CORRIENTE',
        estado: 'ACTIVO',
      },
    ];
  }

  // ===== Empresa =====
  onSubmitEmpresa(): void {
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      return;
    }

    console.log('Datos empresa:', this.empresaForm.value);
    // TODO: llamar a tu API para guardar
  }

  onLogoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);

    // TODO: subir logo al backend si corresponde
  }

  // ===== Cuentas bancarias (solo hooks para modales) =====
  nuevaCuenta(): void {
    // Aquí abrirás tu modal de "Nueva cuenta"
    console.log('Abrir modal: nueva cuenta bancaria');
  }

  editarCuenta(idx: number): void {
    const cuenta = this.cuentas[idx];
    // Aquí abrirás tu modal de edición pasando la cuenta
    console.log('Abrir modal: editar cuenta', cuenta);
  }

  eliminarCuenta(idx: number): void {
    // Podrías confirmar con Swal y luego llamar a la API
    this.cuentas.splice(idx, 1);
  }

  toggleEstado(cta: BankAccount): void {
    cta.estado = cta.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  }
}
