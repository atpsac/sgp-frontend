// shared/components/toast/toast.service.ts
import { Injectable } from '@angular/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { Toast, ToastType } from './toast';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  subtitle?: string;
  message?: string;
  chipLabel?: string;
  chipIcon?: string;
  boxTitle?: string;
  boxText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showCancel?: boolean;
  modalOptions?: NgbModalOptions;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private modal: NgbModal) {}

  open(options: ToastOptions): Promise<boolean> {
    const ref = this.modal.open(Toast, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
      ...options.modalOptions,
    });

    Object.assign(ref.componentInstance, {
      type: options.type ?? 'info',
      title: options.title ?? '',
      subtitle: options.subtitle ?? '',
      message: options.message ?? '',
      chipLabel: options.chipLabel,
      chipIcon: options.chipIcon ?? 'badge',
      boxTitle: options.boxTitle,
      boxText: options.boxText,
      confirmLabel: options.confirmLabel ?? 'Aceptar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      showCancel: options.showCancel ?? true,
    });

    return ref.result.then(
      (result) => !!result,
      () => false
    );
  }

  // Atajos cómodos
  confirm(message: string, opts: Partial<ToastOptions> = {}): Promise<boolean> {
    return this.open({
      type: 'question',
      title: opts.title ?? 'Confirmar acción',
      message,
      boxTitle: opts.boxTitle,
      boxText: opts.boxText,
      confirmLabel: opts.confirmLabel ?? 'Sí, continuar',
      cancelLabel: opts.cancelLabel ?? 'Cancelar',
      showCancel: true,
      ...opts,
    });
  }

  success(message: string, opts: Partial<ToastOptions> = {}): Promise<boolean> {
    return this.open({
      type: 'success',
      title: opts.title ?? 'Operación exitosa',
      message,
      confirmLabel: opts.confirmLabel ?? 'Continuar',
      showCancel: false,
      ...opts,
    });
  }

  error(message: string, opts: Partial<ToastOptions> = {}): Promise<boolean> {
    return this.open({
      type: 'error',
      title: opts.title ?? 'Ocurrió un error',
      message,
      confirmLabel: opts.confirmLabel ?? 'Aceptar',
      showCancel: false,
      ...opts,
    });
  }

  warning(message: string, opts: Partial<ToastOptions> = {}): Promise<boolean> {
    return this.open({
      type: 'warning',
      title: opts.title ?? 'Advertencia',
      message,
      confirmLabel: opts.confirmLabel ?? 'Entendido',
      showCancel: opts.showCancel ?? true,
      ...opts,
    });
  }
}
