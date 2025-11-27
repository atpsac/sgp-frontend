// src/app/core/services/pedidos.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type PedidoEstado =
  | 'PENDIENTE'
  | 'PROCESANDO'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'FALLIDO';

export type MetodoEntrega = 'RECOJO' | 'DELIVERY';
export type MetodoPago =
  | 'CONTRA_ENTREGA'
  | 'IZIPAY'
  | 'YAPE'
  | 'PLIN'
  | 'YAPE_PLIN'        // <- agregado para coincidir con el backend
  | 'TRANSFERENCIA'
  | 'OTRO';

export interface PedidoListItem {
  PedidoId: number;
  Numero: string;
  UsuarioId?: number | null;

  Correo?: string | null;
  Telefono?: string | null;

  Estado: PedidoEstado;
  MetodoEntrega: MetodoEntrega;
  MetodoPago: MetodoPago;

  Moneda?: string | null;

  TotalItems?: number | string;
  TotalEnvio?: number | string;
  TotalImpuesto?: number | string;
  TotalDescuento?: number | string;
  TotalGeneral: number | string;

  Comprobante?: string | null;   // /uploads/... o URL absoluta
  Observacion?: string | null;   // <- NUEVO

  // Derivados desde JSON
  ClienteNombre?: string | null;
  ClienteDocumento?: string | null;
  ClienteTipoDocumentoId?: string | number | null;

  CreadoEn: string;
  ActualizadoEn: string;
  ItemsCount: number;
}

export interface PedidoListResponse {
  data: PedidoListItem[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
}

export interface PedidoDetalle {
  pedido: any; // incluye Observacion y Comprobante
  direccionEnvio: any | null;
  direccionFactura: any | null;
  cliente: {
    tipoDocumentoId: number | string | null;
    numeroDocumento: string | null;
    nombres: string | null;
    apellidos: string | null;
    correo: string | null;
    telefono: string | null;
  };
  items: Array<{
    PedidoItemId: number;
    PedidoId: number;
    ProductoId: number;
    VariacionId: number | null;
    Nombre: string;
    Sku: string;
    Archivo: string; // nombre de archivo (no URL)
    Cantidad: number | string;
    PrecioUnitario: number | string;
    Total: number | string;
  }>;
}

export interface PedidoFilters {
  search?: string;
  Estado?: PedidoEstado | '';
  MetodoEntrega?: MetodoEntrega | '';
  MetodoPago?: MetodoPago | '';
  UsuarioId?: number | null;
  fechaDesde?: string; // 'YYYY-MM-DD'
  fechaHasta?: string; // 'YYYY-MM-DD'
  orden?: 'reciente' | 'monto_asc' | 'monto_desc';
}

@Injectable({ providedIn: 'root' })
export class Pedidos {
  // base pública (p.ej. http://localhost/api-pharma/public)
  readonly publicBase = environment.apiUrl?.replace(/\/$/, '') || '';
  // base de API
  readonly apiBase = `${this.publicBase}/api/`;
  // base para imágenes de productos por Archivo
  readonly assetsBase = (environment as any).assetsBaseUrl
    ? (environment as any).assetsBaseUrl.replace(/\/?$/, '/')
    : `${this.publicBase}/uploads/productos/`;

  /** Form opcional para filtros en UI */
  private filtersFormGroup: FormGroup;

  constructor(private http: HttpClient, fb: FormBuilder) {
    this.filtersFormGroup = fb.group({
      search: [''],
      Estado: [''],
      MetodoEntrega: [''],
      MetodoPago: [''],
      UsuarioId: [null],
      fechaDesde: [''],
      fechaHasta: [''],
      orden: ['reciente'],
    });
  }

  // ---------- Form helpers (opcional) ----------
  get filtersForm(): FormGroup {
    return this.filtersFormGroup;
  }
  set fillFilters(data: Partial<PedidoFilters> | null) {
    this.filtersFormGroup.patchValue({
      search: data?.search ?? '',
      Estado: data?.Estado ?? '',
      MetodoEntrega: data?.MetodoEntrega ?? '',
      MetodoPago: data?.MetodoPago ?? '',
      UsuarioId: data?.UsuarioId ?? null,
      fechaDesde: data?.fechaDesde ?? '',
      fechaHasta: data?.fechaHasta ?? '',
      orden: data?.orden ?? 'reciente',
    });
  }

  // ---------- HTTP ----------
  /** Listado con paginación y filtros */
  getPedidos(
    page: number,
    pageSize: number,
    filters: PedidoFilters = {}
  ): Observable<PedidoListResponse> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.Estado !== undefined && filters.Estado !== '')
      params = params.set('Estado', String(filters.Estado));
    if (filters.MetodoEntrega)
      params = params.set('MetodoEntrega', String(filters.MetodoEntrega));
    if (filters.MetodoPago)
      params = params.set('MetodoPago', String(filters.MetodoPago));
    if (filters.UsuarioId !== null && filters.UsuarioId !== undefined)
      params = params.set('UsuarioId', String(filters.UsuarioId));
    if (filters.fechaDesde)
      params = params.set('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta)
      params = params.set('fechaHasta', filters.fechaHasta);
    if (filters.orden) params = params.set('orden', filters.orden);

    return this.http.get<PedidoListResponse>(`${this.apiBase}pedidos`, { params });
  }

  /** Detalle por id */
  getById(id: number): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalle>(`${this.apiBase}pedidos/show/${id}`);
  }

  /** Cambiar estado (+ opcional Observacion y Comprobante relativo /uploads/...) */
  changeEstado(
    id: number,
    estado: PedidoEstado,
    observacion?: string,
    comprobante?: string
  ): Observable<any> {
    const payload: any = { Estado: estado };
    if (observacion !== undefined) payload.Observacion = observacion;
    if (comprobante !== undefined) payload.Comprobante = comprobante;
    return this.http.put<any>(`${this.apiBase}pedidos/${id}/estado`, payload);
  }

  /** Estados permitidos (array en `data`) */
  estados(): Observable<{ data: PedidoEstado[] }> {
    return this.http.get<{ data: PedidoEstado[] }>(`${this.apiBase}pedidos/estados`);
  }

  // ---------- Utilidades ----------
  /** Convierte ruta relativa (/uploads/...) a URL pública absoluta */
  resolvePublicUrl(path?: string | null): string {
    if (!path) return '';
    const p = String(path);
    if (/^https?:\/\//i.test(p)) return p;
    return `${this.publicBase}${p.startsWith('/') ? '' : '/'}${p}`.replace(/([^:]\/)\/+/g, '$1');
  }

  /** URL de imagen de producto desde su nombre de Archivo */
  productoArchivoUrl(archivo?: string | null): string {
    if (!archivo) return 'https://placehold.co/600x400';
    return `${this.assetsBase}${archivo}`.replace(/([^:]\/)\/+/g, '$1');
  }

  /** Compatibilidad: antes usabas WP; ahora apunta a assetsBaseUrl */
  archivoToUploadsUrl(archivo: string | null | undefined): string | null {
    if (!archivo) return null;
    return `${this.assetsBase}${archivo}`.replace(/([^:]\/)\/+/g, '$1');
  }
}
