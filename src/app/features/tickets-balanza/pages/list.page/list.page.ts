import { Component } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type Estado = 'EN REGISTRO' | 'CERRADA' | 'ANULADA' | 'EN EVALUACIÓN';
type PageToken = number | '…';

interface TicketRow {
  id: string;
  sede: string;
  fecha: string;          // ISO 'YYYY-MM-DD'
  operacion: string;
  brutoKg: number;
  taraKg: number;
  mermaPct: number;       // 0.23 => 0.23%
  netoKg: number;
  estado: Estado;
  activo: boolean;
}

@Component({
  selector: 'app-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgFor, NgIf, NgClass, DatePipe, DecimalPipe],
  templateUrl: './list.page.html',
  styleUrl: './list.page.scss'
})
export class ListPage {
  // filtros
  filtro = {
    sede: '',
    operacion: '',
    desde: '',
    hasta: '',
    numero: ''
  };

  sedes = ['ATP - LIMA PLANTA', 'ATP - SAN ALEJANDRO', 'ATP - SATIPO'];
  operaciones = [
    'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL',
    'RECEPCIÓN DE PRODUCTO - SEDE DE ACOPIO',
    'DESPACHO DE PRODUCTO - PLANTA PRINCIPAL'
  ];

  // datos mock
  data: TicketRow[] = [
    { id:'TKTP-0000001', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-01', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:30142.08, taraKg:42,    mermaPct:0.23, netoKg:30100.08, estado:'EN REGISTRO',  activo:true },
    { id:'TKTP-0000002', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-01', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:31021.04, taraKg:21.04, mermaPct:0.25, netoKg:31000.00, estado:'CERRADA',      activo:true },
    { id:'TKTP-0000003', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-02', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:32235.00, taraKg:135,   mermaPct:0.26, netoKg:32100.00, estado:'ANULADA',      activo:false },
    { id:'TKTP-0000004', sede:'ATP - SAN ALEJANDRO',   fecha:'2025-10-03', operacion:'RECEPCIÓN DE PRODUCTO - SEDE DE ACOPIO',  brutoKg:32147.19, taraKg:45.18, mermaPct:0.00, netoKg:32102.01, estado:'EN EVALUACIÓN', activo:true },
    { id:'TKTP-0000005', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-04', operacion:'DESPACHO DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:31269.01, taraKg:66,    mermaPct:0.00, netoKg:31200.01, estado:'EN REGISTRO',  activo:true },
    { id:'TKTP-0000006', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-01', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:30142.08, taraKg:42,    mermaPct:0.23, netoKg:30100.08, estado:'EN REGISTRO',  activo:true },
    { id:'TKTP-0000007', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-01', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:31021.04, taraKg:21.04, mermaPct:0.25, netoKg:31000.00, estado:'CERRADA',      activo:true },
    { id:'TKTP-0000008', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-02', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:32235.00, taraKg:135,   mermaPct:0.26, netoKg:32100.00, estado:'ANULADA',      activo:false },
    { id:'TKTP-0000009', sede:'ATP - SAN ALEJANDRO',   fecha:'2025-10-03', operacion:'RECEPCIÓN DE PRODUCTO - SEDE DE ACOPIO',  brutoKg:32147.19, taraKg:45.18, mermaPct:0.00, netoKg:32102.01, estado:'EN EVALUACIÓN', activo:true },
    { id:'TKTP-0000010', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-04', operacion:'DESPACHO DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:31269.01, taraKg:66,    mermaPct:0.00, netoKg:31200.01, estado:'EN REGISTRO',  activo:true },
    { id:'TKTP-0000011', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-01', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:30142.08, taraKg:42,    mermaPct:0.23, netoKg:30100.08, estado:'EN REGISTRO',  activo:true },
    { id:'TKTP-0000012', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-01', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:31021.04, taraKg:21.04, mermaPct:0.25, netoKg:31000.00, estado:'CERRADA',      activo:true },
    { id:'TKTP-0000013', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-02', operacion:'RECEPCIÓN DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:32235.00, taraKg:135,   mermaPct:0.26, netoKg:32100.00, estado:'ANULADA',      activo:false },
    { id:'TKTP-0000014', sede:'ATP - SAN ALEJANDRO',   fecha:'2025-10-03', operacion:'RECEPCIÓN DE PRODUCTO - SEDE DE ACOPIO',  brutoKg:32147.19, taraKg:45.18, mermaPct:0.00, netoKg:32102.01, estado:'EN EVALUACIÓN', activo:true },
    { id:'TKTP-0000015', sede:'ATP - LIMA PLANTA',     fecha:'2025-10-04', operacion:'DESPACHO DE PRODUCTO - PLANTA PRINCIPAL', brutoKg:31269.01, taraKg:66,    mermaPct:0.00, netoKg:31200.01, estado:'EN REGISTRO',  activo:true },
  ];

  // paginación
  page = 1;
  pageSize = 10;

  get rows(): TicketRow[] {
    return this.data.filter(r => {
      const okSede   = !this.filtro.sede      || r.sede === this.filtro.sede;
      const okOp     = !this.filtro.operacion || r.operacion === this.filtro.operacion;
      const okNum    = !this.filtro.numero    || r.id.toLowerCase().includes(this.filtro.numero.toLowerCase());
      const okDesde  = !this.filtro.desde     || r.fecha >= this.filtro.desde;
      const okHasta  = !this.filtro.hasta     || r.fecha <= this.filtro.hasta;
      return okSede && okOp && okNum && okDesde && okHasta;
    });
  }

  get totalItems(): number { return this.rows.length; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.totalItems / this.pageSize)); }

  get pagedRows(): TicketRow[] {
    const start = (this.page - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  filtrar(): void { this.page = 1; }

  limpiar(): void {
    this.filtro = { sede:'', operacion:'', desde:'', hasta:'', numero:'' };
    this.page = 1;
  }

  changePageSize(): void { this.page = 1; }

  prev(): void { if (this.page > 1) this.page--; }
  next(): void { if (this.page < this.totalPages) this.page++; }

  goTo(token: PageToken): void {
    if (token === '…') return;
    if (token < 1 || token > this.totalPages) return;
    this.page = token;
  }

  pagesToShow(): PageToken[] {
    const t = this.totalPages;
    const p = this.page;

    if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);

    const pages: PageToken[] = [1];
    const left = Math.max(2, p - 1);
    const right = Math.min(t - 1, p + 1);

    if (left > 2) pages.push('…');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < t - 1) pages.push('…');

    pages.push(t);
    return pages;
  }

  // placeholders
  exportExcel(): void { alert('Exportar a Excel (pendiente)'); }
  exportPDF(): void { alert('Exportar a PDF (pendiente)'); }
}
