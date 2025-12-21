import { Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import {
  PrintNodeConfig,
  PrintNodeDeviceInfo,
  PrintNodeError,
  PrintNodeReading,
  PrintNodeStatus,
} from '../models/printnode.models';
import { parsePrintNodeMeasurement } from '../utils/weight.utils';
import { StableDetector } from '../utils/stable-detector';

@Injectable({ providedIn: 'root' })
export class PrintNodeAdapterService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  private cfg: PrintNodeConfig | null = null;

  private ws: any = null;                 // instancia PrintNode.WebSocket
  private serverSubIds: number[] = [];    // ids de getScales()
  private scalesListener: any = null;     // fn para ws.subscribe('scales', fn)

  private noDataTimer: any = null;
  private readonly NO_DATA_MS = 10_000;

  private stable = new StableDetector(0.02, 3000);

  private statusSubject = new BehaviorSubject<PrintNodeStatus>('DISCONNECTED');
  status$ = this.statusSubject.asObservable();

  private readingSubject = new BehaviorSubject<PrintNodeReading | null>(null);
  reading$ = this.readingSubject.asObservable();

  private deviceInfoSubject = new BehaviorSubject<PrintNodeDeviceInfo | null>(null);
  deviceInfo$ = this.deviceInfoSubject.asObservable();

  private errorSubject = new BehaviorSubject<PrintNodeError | null>(null);
  error$ = this.errorSubject.asObservable();

  // --- helpers ---
  private ensureLib() {
    if (!window.PrintNode) {
      throw new Error('PrintNode no está cargado. Revisa angular.json/scripts.');
    }
    if (!window.PrintNode.WebSocket?.isSupported?.()) {
      throw new Error('WebSocket no soportado por el navegador.');
    }
  }

  setConfig(cfg: PrintNodeConfig) {
    this.cfg = { ...cfg };
  }

  /** REST validation (los 3 pasos que ya tenías en HTML) */
  async validateDevice(): Promise<{ ok: boolean; device?: any; error?: string }> {
    try {
      this.ensureLib();
      if (!this.cfg) return { ok: false, error: 'Config no definida' };

      this.statusSubject.next('VALIDATING');
      this.errorSubject.next(null);

      const { apiKey, computerId, deviceName, deviceNum } = this.cfg;

      // 1) /computer/{id}/scales
      await this.apiGet(`/computer/${computerId}/scales`, apiKey);

      // 2) /computer/{id}/scales/{deviceName}
      const list = await this.apiGet(`/computer/${computerId}/scales/${encodeURIComponent(deviceName)}`, apiKey);
      if (!Array.isArray(list) || list.length === 0) {
        this.statusSubject.next('ERROR');
        return { ok: false, error: `No se encontró el Device Name: ${deviceName}` };
      }

      // 3) /computer/{id}/scale/{deviceName}/{deviceNum}
      const device = await this.apiGet(
        `/computer/${computerId}/scale/${encodeURIComponent(deviceName)}/${deviceNum}`,
        apiKey
      );

      // Guardar info del dispositivo
      this.deviceInfoSubject.next({
        deviceName: device?.deviceName ?? deviceName,
        deviceNum: device?.deviceNum ?? deviceNum,
        vendor: device?.vendor,
        product: device?.product,
        port: device?.port,
        vendorId: device?.vendorId,
        productId: device?.productId,
      });

      this.statusSubject.next('VALIDATED');
      return { ok: true, device };

    } catch (e: any) {
      const msg = e?.message ?? 'Error validando dispositivo';
      this.statusSubject.next('ERROR');
      this.errorSubject.next({ message: msg, detail: e });
      return { ok: false, error: msg };
    }
  }

  connect(): void {
    try {
      this.ensureLib();
      if (!this.cfg) throw new Error('Config no definida');
      if (this.ws) throw new Error('Ya existe una conexión activa');

      const { apiKey, computerId, deviceName, deviceNum } = this.cfg;

      this.statusSubject.next('CONNECTING');
      this.errorSubject.next(null);
      this.stable.reset();
      this.readingSubject.next(null);

      // onAuth
      const onAuth = (authData: any) => {
        this.zone.run(() => {
          if (authData?.error) {
            this.statusSubject.next('ERROR');
            this.errorSubject.next({ message: `Auth error: ${authData.error}`, detail: authData });
            this.forceCleanup();
            return;
          }

          // IMPORTANTE: config correcto para getScales (computerId + deviceName + deviceNum)
          const subId = this.ws.getScales(
            { computerId, deviceName, deviceNum },
            (measurement: any) => this.handleMeasurement(measurement)
          );
          this.serverSubIds.push(subId);

          // Listener adicional (evento general), filtramos adentro
          this.scalesListener = (measurement: any) => this.handleMeasurement(measurement);
          this.ws.subscribe('scales', this.scalesListener);

          this.statusSubject.next('CONNECTED');
          this.startNoDataTimer();
        });
      };

      // onError
      const onErr = (err: any, data: any) => {
        this.zone.run(() => {
          const msg = err?.message ?? data?.error ?? 'Error de conexión WebSocket';
          this.statusSubject.next('ERROR');
          this.errorSubject.next({ message: msg, detail: { err, data } });
          this.forceCleanup();
        });
      };

      // Crear WS
      this.ws = new window.PrintNode.WebSocket({ apiKey }, onAuth, onErr);

    } catch (e: any) {
      this.statusSubject.next('ERROR');
      this.errorSubject.next({ message: e?.message ?? 'Error conectando', detail: e });
      this.forceCleanup();
    }
  }

  disconnect(): void {
    try {
      if (!this.ws) {
        this.statusSubject.next('DISCONNECTED');
        return;
      }

      // server subscriptions
      for (const id of this.serverSubIds) {
        try { this.ws.removeServerSubscription(id); } catch {}
      }
      this.serverSubIds = [];

      // client subscription
      if (this.scalesListener) {
        try { this.ws.unsubscribe(this.scalesListener); } catch {}
        this.scalesListener = null;
      }

      // close socket
      try { this.ws.closeSocket?.(); } catch {}

    } finally {
      this.forceCleanup();
      this.statusSubject.next('DISCONNECTED');
    }
  }

  // --- internals ---
  private handleMeasurement(measurement: any) {
    if (!this.cfg) return;

    // filtrar solo el dispositivo correcto
    const { deviceName, deviceNum } = this.cfg;
    if (measurement?.deviceName !== deviceName) return;
    if (measurement?.deviceNum !== deviceNum) return;

    this.kickNoDataTimer();

    const parsed = parsePrintNodeMeasurement(measurement);
    if (!parsed) return;

    const stable = this.stable.isStable(parsed.weightKg);

    const reading: PrintNodeReading = {
      value: parsed.value,
      unit: parsed.unit,
      weightKg: parsed.weightKg,
      isStable: stable,
      timestamp: new Date().toISOString(),
      latencyMs: typeof measurement?.getLatency === 'function' ? measurement.getLatency() : undefined,
      raw: measurement,
    };

    this.zone.run(() => {
      this.readingSubject.next(reading);

      // si viene info del dispositivo, la refrescamos
      this.deviceInfoSubject.next({
        deviceName: measurement?.deviceName,
        deviceNum: measurement?.deviceNum,
        vendor: measurement?.vendor,
        product: measurement?.product,
        port: measurement?.port,
        vendorId: measurement?.vendorId,
        productId: measurement?.productId,
      });
    });
  }

  private startNoDataTimer() {
    this.clearNoDataTimer();
    this.noDataTimer = setTimeout(() => {
      this.zone.run(() => {
        this.statusSubject.next('ERROR');
        this.errorSubject.next({ message: 'Timeout: no se reciben datos de la balanza' });
        this.disconnect();
      });
    }, this.NO_DATA_MS);
  }

  private kickNoDataTimer() {
    // reinicia el timer cada vez que llega data
    this.startNoDataTimer();
  }

  private clearNoDataTimer() {
    if (this.noDataTimer) {
      clearTimeout(this.noDataTimer);
      this.noDataTimer = null;
    }
  }

  private forceCleanup() {
    this.clearNoDataTimer();
    this.serverSubIds = [];
    this.scalesListener = null;

    // no dejamos ws colgado
    this.ws = null;

    this.stable.reset();
  }

  private async apiGet(path: string, apiKey: string): Promise<any> {
    const headers = new HttpHeaders({
      Authorization: 'Basic ' + btoa(apiKey + ':'),
      Accept: 'application/json',
    });

    // PrintNode base
    const url = `https://api.printnode.com${path}`;
    return await firstValueFrom(this.http.get<any>(url, { headers }));
  }
}
