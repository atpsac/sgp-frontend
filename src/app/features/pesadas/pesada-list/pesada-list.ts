import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { TicketBalanzaPdfService } from '../../../core/pdf/ticket-balanza-pdf.service';

// ✅ USA EL TYPE DEL MODEL (NO LO DECLARES EN ESTE COMPONENTE)
import {
  TicketBalanzaReport,
  // Si tu model exporta EstadoTicket, déjalo. Si no existe, borra esta línea.
  EstadoTicket,
} from '../../../core/models/ticket-balanza-report.model';

interface Pesada {
  NumeroTicket: string;
  SedeOperacion: string;
  Fecha: string;
  Operacion: string;
  PesoBruto: number;
  PesoTara: number;
  PorcentajeMerma: number;
  PesoNeto: number;
  Estado: string;
  FlagActivo: number;

  Calidad?: string;
  Chofer?: string;
  Transporte?: string;
  GRE?: string;
  GI?: string;
  PesoNetoSede?: number;
  MermaKg?: number;

  SacosGrandes?: number;
  SacosMedianos?: number;
  SacosPequenos?: number;
  SacosYute?: number;
  TotalSacos?: number;
}

@Component({
  selector: 'app-pesada-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pesada-list.html',
  styleUrl: './pesada-list.scss',
})
export class PesadaList implements OnInit {
  data: Pesada[] = [];
  private allPesadas: Pesada[] = [];

  filters: {
    search: string;
    sede: string;
    operacion: string;
    fechaDesde: string | null;
    fechaHasta: string | null;
    numero: string;
  } = {
    search: '',
    sede: 'ALL',
    operacion: 'ALL',
    fechaDesde: null,
    fechaHasta: null,
    numero: '',
  };

  sedeOptions: string[] = [];
  operacionOptions: string[] = [];

  pageSize = 10;
  currentPage = 1;
  pageSizes = [10, 25, 50, 100];
  totalPages = 0;
  totalRecords = 0;

  isLoading = false;
  downloading = false;
  showAdvancedFilters = false;

  actionsOpenTicket: string | null = null;

  constructor(
    private http: HttpClient,
    public router: Router,
    private pdf: TicketBalanzaPdfService
  ) {}

  ngOnInit(): void {
    this.loadDataFromJson();
  }

  // ================== CARGA DATA ==================
  private loadDataFromJson(): void {
    this.isLoading = true;

    this.http.get<{ data?: Pesada[] }>('assets/data/pesadas.json').subscribe({
      next: (resp) => {
        this.allPesadas = Array.isArray(resp?.data) ? resp.data : [];
        this.buildFilterOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error cargando pesadas.json', err);
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la lista de pesadas.',
        });
      },
    });
  }

  private buildFilterOptions(): void {
    const sedes = new Set<string>();
    const ops = new Set<string>();

    this.allPesadas.forEach((p) => {
      if (p?.SedeOperacion) sedes.add(p.SedeOperacion);
      if (p?.Operacion) ops.add(p.Operacion);
    });

    this.sedeOptions = Array.from(sedes).sort();
    this.operacionOptions = Array.from(ops).sort();
  }

  // ================== FILTROS + PAGINACIÓN ==================
  applyFilters(): void {
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      sede: 'ALL',
      operacion: 'ALL',
      fechaDesde: null,
      fechaHasta: null,
      numero: '',
    };
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  private filterAndPaginate(): void {
    this.isLoading = true;

    const search = (this.filters.search || '').toLowerCase().trim();
    const sede = this.filters.sede;
    const operacion = this.filters.operacion;
    const numero = (this.filters.numero || '').toLowerCase().trim();

    const fechaDesde = this.filters.fechaDesde ? new Date(this.filters.fechaDesde) : null;
    const fechaHasta = this.filters.fechaHasta ? new Date(this.filters.fechaHasta) : null;

    let filtered = [...this.allPesadas];

    if (search) {
      filtered = filtered.filter((p) => {
        const haystack = `${p.NumeroTicket} ${p.SedeOperacion} ${p.Operacion}`.toLowerCase().trim();
        return haystack.includes(search);
      });
    }

    if (sede !== 'ALL') filtered = filtered.filter((p) => p.SedeOperacion === sede);
    if (operacion !== 'ALL') filtered = filtered.filter((p) => p.Operacion === operacion);
    if (numero) filtered = filtered.filter((p) => p.NumeroTicket.toLowerCase().includes(numero));

    if (fechaDesde) filtered = filtered.filter((p) => new Date(p.Fecha) >= fechaDesde);
    if (fechaHasta) {
      fechaHasta.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.Fecha) <= fechaHasta);
    }

    this.totalRecords = filtered.length;
    this.totalPages = this.totalRecords === 0 ? 0 : Math.ceil(this.totalRecords / this.pageSize);

    if (this.currentPage > this.totalPages && this.totalPages > 0) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.data = filtered.slice(start, end);

    this.isLoading = false;
  }

  changePageSize(newSize: number): void {
    this.pageSize = +newSize;
    this.currentPage = 1;
    this.filterAndPaginate();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.filterAndPaginate();
  }

  getPageRange(): number[] {
    const range: number[] = [];
    const rangeSize = 5;
    const total = this.totalPages;

    if (total <= rangeSize) {
      for (let i = 1; i <= total; i++) range.push(i);
      return range;
    }

    range.push(1);
    if (this.currentPage > 4) range.push(-1);

    const start = Math.max(2, this.currentPage - 2);
    const end = Math.min(total - 1, this.currentPage + 2);
    for (let i = start; i <= end; i++) range.push(i);

    if (this.currentPage < total - 3) range.push(-2);
    if (!range.includes(total)) range.push(total);

    return range;
  }

  get startRecord(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  // ================== FILTROS AVANZADOS ==================
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  // ================== BADGES ==================
  getEstadoClass(estado: string): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('REGISTRO')) return 'ux-status--registro';
    if (e.includes('EVALUAC')) return 'ux-status--evaluacion';
    if (e.includes('CERRAD')) return 'ux-status--cerrado';
    if (e.includes('ANULAD')) return 'ux-status--anulado';
    return 'ux-status--otro';
  }

  // ================== ACCIONES ==================
  toggleActions(row: Pesada, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();
    this.actionsOpenTicket =
      this.actionsOpenTicket === row.NumeroTicket ? null : row.NumeroTicket;
  }





  onAction(
    action: 'continuar' | 'generar' | 'generar_corto' | 'duplicar' | 'cancelar',
    row: Pesada,
    ev?: MouseEvent
  ): void {
    ev?.stopPropagation();
    ev?.preventDefault();
    this.actionsOpenTicket = null;

    if (action === 'generar') {
      this.generarPdf(row);
      return;
    }

    if (action === 'generar_corto') {
      this.generarPdfCorto(row);
      return;
    }



    if (action === 'continuar') {
      this.router.navigateByUrl(`pesadas/editar/${encodeURIComponent(row.NumeroTicket)}`);
      return;
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title:
        action === 'duplicar'
          ? `Duplicar datos de la pesada ${row.NumeroTicket}.`
          : `Cancelar la pesada ${row.NumeroTicket}.`,
      showConfirmButton: false,
      timer: 2200,
    });
  }




generarPdfCorto(row: Pesada): void {
  if (this.downloading) return;
  this.downloading = true;

  try {
    const report = this.buildReport(row);
    const blob = this.pdf.generateTicket(report); // ✅ este método lo crearás en el service
    this.pdf.download(blob, `TICKET_CORTO_${row.NumeroTicket}.pdf`);

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Ticket corto generado: ${row.NumeroTicket}`,
      showConfirmButton: false,
      timer: 1500,
    });
  } catch (e: any) {
    console.error(e);
    Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'No se pudo generar.' });
  } finally {
    this.downloading = false;
  }
}





private buildReport(row: Pesada): TicketBalanzaReport {
  // ⚠️ Aquí armamos un ejemplo completo con la data que me pasaste.
  // Si tu row ya trae más campos, reemplazas los "—" o los valores fijos.

  const numeroTicket = row.NumeroTicket;

  return {
    empresa: {
      razonSocial: 'AMAZONAS TRADING PERU S.A.C.',
      ruc: '20521137682',
      direccion: '—',
    },

    ticket: {
      numeroTicket,
      fechaEmision: row.Fecha,
      estado: row.Estado ?? '—',
      sedeOperacion: row.SedeOperacion,
      operacion: row.Operacion,
      calidad: row.Calidad ?? '—',
      gre: row.GRE ?? '—',
      gi: row.GI ?? '—',
      chofer: row.Chofer ?? '—',
      transporte: row.Transporte ?? '—',
    },

    origenDestino: {
      sedeOrigen: 'ATP - BAGUA GRANDE',
      sedeDestino: row.SedeOperacion || 'ATP - LIMA PLANTA',
    },

    documentos: [
      {
        item: 1,
        socioNegocio: 'AMAZONAS TRADING PERU S.A.C.',
        tipoDoc: 'EF',
        documento: 'FACTURA ELECTRONICA',
        fechaDoc: '2026-01-05',
        numeroDocumento: 'TR5-0473247',
        pesoBrutoKg: 12434,
        pesoNetoKg: 4344,
      },
    ],

    transporte: {
      transportista: {
        razonSocial: 'TRANSPORTES & NEGOCIACIONES SERLUZ S.R.L.',
        ruc: '20555619821',
      },
      conductor: {
        nombreCompleto: 'JOSELITO ROJAS SALDAÑA',
        tipoDocumento: 'DNI',
        numeroDocumento: '21570832',
        licencia: 'Q21570832',
      },
      vehiculo: {
        placa: 'ZZI974',
        trailer: 'AUR778',
      },
    },

    resumen: {
      cantidadItems: 1,
      totalPesoBrutoKg: Number(row.PesoBruto ?? 0),
      totalTaraKg: Number(row.PesoTara ?? 0),
      subtotalPesoNetoKg: Number(row.PesoNeto ?? 0),
      ajusteKg: 0,
      totalPesoNetoKg: Number(row.PesoNeto ?? 0),
    },

    pesadas: [
      {
        item: 1,
        producto: 'CACAO EN GRANO HÚMEDO',
        balanza: 'COM3 Precix Weight 8513',
        pesoBrutoKg: Number(row.PesoBruto ?? 0),
        taraKg: Number(row.PesoTara ?? 0),
        pesoNetoKg: Number(row.PesoNeto ?? 0),
        estado: row.Estado ?? '—',
        taras: [
          {
            empaque: 'SACO PLÁSTICO CREMA 150 GR',
            codigo: 'SPC',
            taraEmpaqueKg: 0.15,
            cantidad: 1,
            taraTotalKg: 0.15,
          },
        ],
      },
    ],
  };
}







  // ================== NORMALIZADORES (TIPOS DEL MODEL) ==================
  private normalizeEstadoTicket(raw?: string): EstadoTicket | undefined {
    const e = (raw || '').toUpperCase().trim();
    if (!e) return undefined;

    // Ajusta aquí a los literales EXACTOS que tengas en tu union EstadoTicket
    if (e.includes('REGISTRO')) return 'EN REGISTRO' as EstadoTicket;
    if (e.includes('CERR')) return 'CERRADA' as EstadoTicket;
    if (e.includes('ANUL')) return 'ANULADA' as EstadoTicket;
    if (e.includes('EVALU')) return 'EVALUACION' as EstadoTicket;

    // si no calza con tu union, mejor undefined (y en el PDF pintas “—”)
    return undefined;
  }

  // ================== BUILD REPORTE (USANDO EL MODEL REAL) ==================
  private buildReportFromRow(row: Pesada): TicketBalanzaReport {
    // ⚠️ OJO: NO pongas "—" en campos tipados como union.
    // Mejor undefined y el PDF service renderiza "—".
    const report: TicketBalanzaReport = {
      empresa: {
        razonSocial: 'AMAZONAS TRADING PERU S.A.C.',
        ruc: '20521137682',
        direccion: '—',
      },

      ticket: {
        numeroTicket: row.NumeroTicket,
        fechaEmision: row.Fecha,
        sedeOperacion: row.SedeOperacion,
        operacion: row.Operacion,

        calidad: row.Calidad || undefined,
        estado: this.normalizeEstadoTicket(row.Estado),

        gi: row.GI || undefined,
        gre: row.GRE || undefined,
        chofer: row.Chofer || undefined,

        pesoNetoSedeKg: row.PesoNetoSede,
        mermaKg: row.MermaKg,

        sacosGrandes: row.SacosGrandes,
        sacosMedianos: row.SacosMedianos,
        sacosPequenos: row.SacosPequenos,
        sacosYute: row.SacosYute,
        totalSacos: row.TotalSacos,
      },

      origenDestino: {
        sedeOrigen: 'ATP - BAGUA GRANDE',
        sedeDestino: row.SedeOperacion || 'ATP - LIMA',
      },

      documentos: [
        {
          item: 1,
          socioNegocio: 'AMAZONAS TRADING PERU S.A.C.',
          tipoDoc: 'EF',
          documento: 'FACTURA ELECTRONICA',
          fechaDoc: '2026-01-06',
          numeroDocumento: 'TR5-0473247',
          pesoBrutoKg: 12434,
          pesoNetoKg: 4344,
        },
      ],

      transporte: {
        transportista: {
          razonSocial: 'TRANSPORTES & NEGOCIACIONES SERLUZ S.R.L.',
          ruc: '20555619821',
        },
        conductor: {
          nombreCompleto: 'JOSELITO ROJAS SALDAÑA',
          tipoDocumento: 'DNI',
          numeroDocumento: '21570832',
          licencia: 'Q21570832',
        },
        vehiculo: {
          placa: 'ZZI974',
          trailer: 'AUR778',
        },
      },

      resumen: {
        cantidadItems: 1,
        totalPesoBrutoKg: Number(row.PesoBruto ?? 0),
        totalTaraKg: Number(row.PesoTara ?? 0),
        subtotalPesoNetoKg: Number(row.PesoNeto ?? 0),
        ajusteKg: 0,
        totalPesoNetoKg: Number(row.PesoNeto ?? 0),
      },

      pesadas: [
        {
          item: 1,
          producto: 'CACAO EN GRANO HÚMEDO',
          balanza: 'COM3 Precix Weight 8513',
          pesoBrutoKg: Number(row.PesoBruto ?? 0),
          taraKg: Number(row.PesoTara ?? 0),
          pesoNetoKg: Number(row.PesoNeto ?? 0),
          observaciones: '—',
          estado: row.Estado || undefined,
          taras: [
            {
              empaque: 'SACO PLÁSTICO CREMA 150 GR',
              codigo: 'SPC',
              taraEmpaqueKg: 0.15,
              cantidad: 1,
              taraTotalKg: 0.15,
            },
          ],
        },
      ],
    };

    return report;
  }

  // ================== PDF ==================
  generarPdf(row: Pesada): void {
    if (this.downloading) return;
    this.downloading = true;

    try {
      const report = this.buildReportFromRow(row);

      const blob = this.pdf.generate(report);
      this.pdf.download(blob, `TICKET_${row.NumeroTicket}.pdf`);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `PDF generado: ${row.NumeroTicket}`,
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e?.message || 'No se pudo generar el PDF.',
      });
    } finally {
      this.downloading = false;
    }
  }

  // ================== EXPORT (placeholder) ==================
  exportarExcel(): void {
    this.downloading = true;
    setTimeout(() => {
      this.downloading = false;
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Exportación generada.',
        showConfirmButton: false,
        timer: 1800,
      });
    }, 900);
  }

  crear(): void {
    this.router.navigateByUrl('pesadas/nuevo');
  }

  // ================== CLOSE MENU ==================
  @HostListener('document:click')
  onDocClick(): void {
    this.actionsOpenTicket = null;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.actionsOpenTicket = null;
  }
}
