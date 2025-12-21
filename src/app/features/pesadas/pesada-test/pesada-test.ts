import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrintNodeAdapterService } from '../../../core/printcode/services/printnode-adapter.service';

// import { PrintNodeAdapterService } from '../../core/printnode/services/printnode-adapter.service';
// Ajusta la ruta ↑ según tu estructura real (core/printnode/...)
// Ej: '../../../core/printnode/services/printnode-adapter.service'

@Component({
  selector: 'app-pesada-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pesada-test.html',
  styleUrl: './pesada-test.scss',
})
export class PesadaTest implements OnDestroy {
  private fb = inject(FormBuilder);
  svc = inject(PrintNodeAdapterService);

  form = this.fb.group({
    apiKey: ['LWv4BzHIRmydcxcp5n-KK8lNV-bT4AuKBbkMt8yxOGE', [Validators.required, Validators.minLength(20)]],
    computerId: [709782, [Validators.required]],
    deviceName: ['COM3 Precix Weight 8513', [Validators.required]],
    deviceNum: [0, [Validators.required]],
  });

  async onValidate() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    this.svc.setConfig({
      apiKey: v.apiKey!,
      computerId: Number(v.computerId),
      deviceName: v.deviceName!,
      deviceNum: Number(v.deviceNum),
    });

    await this.svc.validateDevice();
  }

  onConnect() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Asegura config set (por si el usuario conectó sin validar)
    const v = this.form.getRawValue();
    this.svc.setConfig({
      apiKey: v.apiKey!,
      computerId: Number(v.computerId),
      deviceName: v.deviceName!,
      deviceNum: Number(v.deviceNum),
    });

    this.svc.connect();
  }

  onDisconnect() {
    this.svc.disconnect();
  }

  /** Botón opcional: usar el valor estable como “captura” */
  captureIfStable() {
    // Si quieres, aquí lo mandarías a tu memoria/localStorage o a tu form principal.
    // Para test, solo lo dejamos listo.
  }

  ngOnDestroy(): void {
    // súper importante: si sales de la vista, se cierra socket y subs
    this.svc.disconnect();
  }
}
