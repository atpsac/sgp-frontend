import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Pedidos,
  PedidoDetalle,
  PedidoEstado,
} from '../services/dashboard';

@Component({
  selector: 'app-pedido-details',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './pedido-details.html',
  styleUrl: './pedido-details.scss',
})
export class PedidoDetails implements OnInit {
  id!: number;

  loading = false;
  saving = false;
  errorMsg: string | null = null;
  okMsg: string | null = null;

  detalle: PedidoDetalle | null = null;

  // gestión
  estados: PedidoEstado[] = ['PENDIENTE','PROCESANDO','COMPLETADO','CANCELADO','FALLIDO'];
  estadoSel: PedidoEstado = 'PENDIENTE';
  observacion = '';
  notificarWa: any = true;

  // visor / lightbox
  showLightbox = false;
  lightboxUrl = 'https://via.placeholder.com/900x600.png?text=Sin+comprobante';
  lightboxScale = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pedidos: Pedidos
  ) {}

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    if (!this.id) { this.errorMsg = 'ID de pedido inválido'; return; }
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.okMsg = null;
    this.errorMsg = null;
    this.pedidos.getById(this.id).subscribe({
      next: (r) => {
        this.detalle = r;
        this.estadoSel = (r?.pedido?.Estado ?? 'PENDIENTE') as PedidoEstado;
        this.observacion = r?.pedido?.Observacion ?? '';
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar el pedido.';
        this.loading = false;
      },
    });
  }

  // ======= Helpers visuales =======
  private norm(v: any): string {
    return (v ?? '').toString().trim().toUpperCase();
  }
  normalizePago(v: any):
    'CONTRA_ENTREGA'|'IZIPAY'|'YAPE'|'PLIN'|'YAPE_PLIN'|'TRANSFERENCIA'|'OTRO' {
    const k = this.norm(v);
    const hasYape = k.includes('YAPE');
    const hasPlin = k.includes('PLIN');
    if (hasYape && hasPlin) return 'YAPE_PLIN';
    if (k.includes('IZIPAY')) return 'IZIPAY';
    if (k.includes('CONTRA')) return 'CONTRA_ENTREGA';
    if (hasYape) return 'YAPE';
    if (hasPlin) return 'PLIN';
    if (k.includes('TRANSFER')) return 'TRANSFERENCIA';
    return 'OTRO';
  }
  estadoClass(e: any): string {
    switch (this.norm(e)) {
      case 'PENDIENTE':   return 'ux-badge ux-badge--estado-pendiente';
      case 'PROCESANDO':  return 'ux-badge ux-badge--estado-procesando';
      case 'COMPLETADO':  return 'ux-badge ux-badge--estado-completado';
      case 'CANCELADO':   return 'ux-badge ux-badge--estado-cancelado';
      case 'FALLIDO':     return 'ux-badge ux-badge--estado-fallido';
      default:            return 'ux-badge';
    }
  }
  entregaClass(e: any): string {
    const k = this.norm(e);
    return k === 'RECOJO'
      ? 'ux-badge ux-badge--entrega-recojo'
      : k === 'DELIVERY'
      ? 'ux-badge ux-badge--entrega-delivery'
      : 'ux-badge';
  }
  pagoClass(p: any): string {
    switch (this.normalizePago(p)) {
      case 'CONTRA_ENTREGA': return 'ux-badge ux-badge--pago-contra';
      case 'IZIPAY':         return 'ux-badge ux-badge--pago-izipay';
      case 'YAPE':           return 'ux-badge ux-badge--pago-yape';
      case 'PLIN':           return 'ux-badge ux-badge--pago-plin';
      case 'YAPE_PLIN':      return 'ux-badge ux-badge--pago-yapeplin';
      case 'TRANSFERENCIA':  return 'ux-badge ux-badge--pago-transferencia';
      default:               return 'ux-badge ux-badge--pago-otro';
    }
  }
  prettyPago(p: any): string {
    const k = this.normalizePago(p);
    if (k === 'YAPE_PLIN') return 'Yape/Plin';
    return k.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
  }
  prettyEntrega(v: any): string {
    return this.norm(v) === 'RECOJO' ? 'Recojo'
         : this.norm(v) === 'DELIVERY' ? 'Delivery' : '-';
  }
  prettyMoney(v: any): string {
    const n = Number(v ?? 0);
    return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Google Maps link (mapsUrl -> lat/long -> dirección)
  mapsUrl(): string {
    const e: any = this.detalle?.direccionEnvio || {};
    if (e?.mapsUrl) return e.mapsUrl;
    if (e?.latitud && e?.longitud) return `https://www.google.com/maps?q=${e.latitud},${e.longitud}`;
    if (e?.direccion) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.direccion)}`;
    return '';
  }
  async copyMaps(): Promise<void> {
    const url = this.mapsUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.okMsg = 'Enlace de Maps copiado';
      setTimeout(()=> this.okMsg = null, 1800);
    } catch {}
  }
  shareMaps(): void {
    const url = this.mapsUrl();
    if (!url) return;
    if ((navigator as any).share) {
      (navigator as any).share({ title: 'Ubicación de entrega', url });
    } else {
      window.open(url, '_blank');
    }
  }

  // comprobante
  hasComprobante(): boolean {
    return !!(this.detalle?.pedido?.Comprobante);
  }
  comprobanteUrl(): string {
    const path = this.detalle?.pedido?.Comprobante || '';
    const url = this.pedidos.resolvePublicUrl(path);
    return url || 'https://via.placeholder.com/900x600.png?text=Sin+comprobante';
  }
  thumbUrl(): string { return this.comprobanteUrl(); }
  openComprobante(): void {
    this.lightboxUrl = this.comprobanteUrl();
    this.lightboxScale = 1;
    this.showLightbox = true;
  }
  onImgError(ev: Event) {
    (ev.target as HTMLImageElement).src =
      'https://via.placeholder.com/900x600.png?text=Sin+comprobante';
  }
  closeLightbox() { this.showLightbox = false; }
  zoomIn()   { this.lightboxScale = Math.min(this.lightboxScale + 0.2, 3); }
  zoomOut()  { this.lightboxScale = Math.max(this.lightboxScale - 0.2, 0.5); }
  zoomReset(){ this.lightboxScale = 1; }

  // imagen de item (Archivo)
  itemImgUrl(archivo: string | null | undefined): string {
    const u = this.pedidos.productoArchivoUrl(archivo ?? '');
    return u ?? 'https://via.placeholder.com/300x300.png?text=Producto';
  }
  itemImgError(ev: Event) {
    (ev.target as HTMLImageElement).src =
      'https://via.placeholder.com/300x300.png?text=Producto';
  }

  // acciones
  back(): void { this.router.navigate(['/dashboard']); }

  guardarEstado(): void {
    if (!this.detalle) return;
    this.saving = true;
    this.okMsg = null;
    this.errorMsg = null;

    this.pedidos.changeEstado(this.id, this.estadoSel, this.observacion, this.notificarWa)
      .subscribe({
        next: () => {
          this.saving = false;
          this.okMsg = 'Estado actualizado' + (this.notificarWa ? ' y cliente notificado ✅' : ' ✅');
          this.fetch();
          setTimeout(()=> this.okMsg = null, 2200);
        },
        error: () => {
          this.saving = false;
          this.errorMsg = 'No se pudo actualizar el estado.';
        }
      });
  }
}
