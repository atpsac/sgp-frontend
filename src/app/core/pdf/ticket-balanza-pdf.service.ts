import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TicketBalanzaReport } from '../models/ticket-balanza-report.model';

type Cell = string | number | null | undefined;
type TableRow = Cell[];

@Injectable({ providedIn: 'root' })
export class TicketBalanzaPdfService {
  // =======================
  // Helpers
  // =======================
  private n2(v: any): string {
    const num = Number(v ?? 0);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private toText(v: any, fallback = '—'): string {
    const s = String(v ?? '').trim();
    return s ? s : fallback;
  }

  private toNum(v: any): number | undefined {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  private toDateText(raw: string): string {
    const s = String(raw ?? '').trim();
    if (!s) return '—';

    const d = new Date(s.includes(' ') ? s.replace(' ', 'T') : s);
    if (isNaN(d.getTime())) return s;

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  private toTicketDateEs(raw: string): string {
    const s = String(raw ?? '').trim();
    if (!s) return '—';

    const d = new Date(s.includes(' ') ? s.replace(' ', 'T') : s);
    if (isNaN(d.getTime())) return s;

    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const day = d.getDate();
    const mon = months[d.getMonth()] ?? '';
    const yy = String(d.getFullYear()).slice(-2);
    return `${day}-${mon}-${yy}`;
  }

  private fitText(doc: jsPDF, text: string, maxW: number): string {
    let s = this.toText(text, '');
    if (!s) return '—';
    if (doc.getTextWidth(s) <= maxW) return s;

    const ell = '…';
    while (s.length > 0 && doc.getTextWidth(s + ell) > maxW) s = s.slice(0, -1);
    return s.length ? s + ell : ell;
  }

  // =======================
  // REPORTE A4 (COMPLETO)
  // =======================
  generate(data: TicketBalanzaReport): Blob {
    const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Márgenes / área útil
    const M = 28;      // marco exterior
    const PAD = 12;    // padding interior
    const x = M + PAD;
    const yTop = M + PAD;
    const innerW = pageW - 2 * (M + PAD);

    // Marco
    doc.setDrawColor(0);
    doc.setLineWidth(0.9);
    doc.rect(M, M, pageW - M * 2, pageH - M * 2);

    // Header
    const gap = 14;
    const boxW = 205;
    const boxH = 68;

    const leftW = innerW - boxW - gap;
    const boxX = x + leftW + gap;
    const boxY = yTop;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.6);
    doc.text(this.fitText(doc, this.toText(data.empresa?.razonSocial), leftW), x, boxY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.text(`RUC: ${this.toText(data.empresa?.ruc)}`, x, boxY + 30);
    doc.text(
      `Dirección: ${this.fitText(doc, this.toText(data.empresa?.direccion), leftW - 60)}`,
      x,
      boxY + 44
    );

    // Caja derecha
    doc.setLineWidth(0.8);
    doc.rect(boxX, boxY, boxW, boxH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.3);
    doc.text('Ticket:', boxX + 10, boxY + 18);
    doc.text('Fecha:', boxX + 10, boxY + 34);
    doc.text('Estado:', boxX + 10, boxY + 50);

    doc.setFont('helvetica', 'normal');
    doc.text(this.fitText(doc, this.toText(data.ticket?.numeroTicket), boxW - 72), boxX + 60, boxY + 18);
    doc.text(this.toDateText(this.toText(data.ticket?.fechaEmision, '')), boxX + 60, boxY + 34);
    doc.text(this.fitText(doc, this.toText(data.ticket?.estado), boxW - 72), boxX + 60, boxY + 50);

    // Cursor
    let y = boxY + boxH + 20;

    const widths = (ratios: number[]) => {
      const w = ratios.map((r) => Math.floor(innerW * r));
      const diff = innerW - w.reduce((a, b) => a + b, 0);
      w[w.length - 1] += diff;
      return w;
    };

    // ✅ SIN subrayado y con más aire
    const sectionTitle = (title: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.0);
      doc.text(title, x, y);
      y += 12;
    };

    const table = (headRow: TableRow, bodyRows: TableRow[], opts?: any) => {
      autoTable(doc, {
        startY: y,
        margin: { left: x, right: x },
        tableWidth: innerW,
        head: [headRow] as any,     // ✅ evita errores TS de RowInput
        body: bodyRows as any,      // ✅ evita errores TS de RowInput
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.6,
          textColor: 0,
          lineColor: 0,
          lineWidth: 0.55,
          cellPadding: 3,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: 0,
          fontStyle: 'bold',
          lineColor: 0,
          lineWidth: 0.75,
        },
        ...opts,
      });

      const lastY = (doc as any).lastAutoTable?.finalY;
      y = (typeof lastY === 'number' ? lastY : y) + 16;
    };

    // 1) Datos operación
    sectionTitle('1) Datos de operación');
    const w4 = widths([0.18, 0.32, 0.18, 0.32]);
    table(
      ['Campo', 'Valor', 'Campo', 'Valor'],
      [
        ['Sede operación', this.toText(data.ticket?.sedeOperacion), 'Operación', this.toText(data.ticket?.operacion)],
        ['Calidad', this.toText(data.ticket?.calidad), 'N° Ticket', this.toText(data.ticket?.numeroTicket)],
      ],
      {
        columnStyles: {
          0: { cellWidth: w4[0] },
          1: { cellWidth: w4[1] },
          2: { cellWidth: w4[2] },
          3: { cellWidth: w4[3] },
        },
      }
    );

    // 2) Origen/Destino
    sectionTitle('2) Origen / Destino');
    const w2 = widths([0.28, 0.72]);
    table(
      ['Campo', 'Valor'],
      [
        ['Sede origen', this.toText(data.origenDestino?.sedeOrigen)],
        ['Sede destino', this.toText(data.origenDestino?.sedeDestino)],
      ],
      { columnStyles: { 0: { cellWidth: w2[0] }, 1: { cellWidth: w2[1] } } }
    );

    // 3) Documentos
    sectionTitle('3) Documentos relacionados');
    const docsBody: TableRow[] = (data.documentos ?? []).map((d) => [
      d.item,
      this.toText(d.socioNegocio),
      this.toText(d.tipoDoc),
      this.toText(d.documento),
      this.toDateText(this.toText(d.fechaDoc, '')),
      this.toText(d.numeroDocumento),
      d.pesoBrutoKg != null ? this.n2(d.pesoBrutoKg) : '—',
      d.pesoNetoKg != null ? this.n2(d.pesoNetoKg) : '—',
    ]);
    const wDocs = widths([0.05, 0.23, 0.06, 0.19, 0.09, 0.15, 0.115, 0.115]);
    table(
      ['Item', 'Socio de negocio', 'Tipo', 'Documento', 'Fecha', 'Número', 'Bruto (Kg)', 'Neto (Kg)'],
      docsBody.length ? docsBody : [['—', '—', '—', '—', '—', '—', '—', '—']],
      {
        columnStyles: {
          0: { cellWidth: wDocs[0], halign: 'center' },
          1: { cellWidth: wDocs[1] },
          2: { cellWidth: wDocs[2], halign: 'center' },
          3: { cellWidth: wDocs[3] },
          4: { cellWidth: wDocs[4], halign: 'center' },
          5: { cellWidth: wDocs[5] },
          6: { cellWidth: wDocs[6], halign: 'right' },
          7: { cellWidth: wDocs[7], halign: 'right' },
        },
      }
    );

    // 4) Transporte
    sectionTitle('4) Datos del transporte');
    const wT4 = widths([0.18, 0.32, 0.18, 0.32]);
    table(
      ['Campo', 'Valor', 'Campo', 'Valor'],
      [
        ['Transportista', this.toText(data.transporte?.transportista?.razonSocial), 'RUC', this.toText(data.transporte?.transportista?.ruc)],
        ['Conductor', this.toText(data.transporte?.conductor?.nombreCompleto), 'Doc', `${this.toText(data.transporte?.conductor?.tipoDocumento)} ${this.toText(data.transporte?.conductor?.numeroDocumento)}`],
        ['Licencia', this.toText(data.transporte?.conductor?.licencia), 'Vehículo', this.toText(data.transporte?.vehiculo?.placa)],
        ['Trailer', this.toText(data.transporte?.vehiculo?.trailer), '—', '—'],
      ],
      { columnStyles: { 0: { cellWidth: wT4[0] }, 1: { cellWidth: wT4[1] }, 2: { cellWidth: wT4[2] }, 3: { cellWidth: wT4[3] } } }
    );

    // 5) Resumen
    sectionTitle('5) Resumen de pesos');
    const wR = widths([0.08, 0.16, 0.16, 0.22, 0.16, 0.22]);
    table(
      ['Ítems', 'Bruto (Kg)', 'Tara (Kg)', 'SubTotal Neto (Kg)', 'Ajuste (Kg)', 'Total Neto (Kg)'],
      [[
        data.resumen?.cantidadItems ?? 0,
        this.n2(data.resumen?.totalPesoBrutoKg ?? 0),
        this.n2(data.resumen?.totalTaraKg ?? 0),
        this.n2(data.resumen?.subtotalPesoNetoKg ?? 0),
        this.n2(data.resumen?.ajusteKg ?? 0),
        this.n2(data.resumen?.totalPesoNetoKg ?? 0),
      ]],
      {
        columnStyles: {
          0: { cellWidth: wR[0], halign: 'center' },
          1: { cellWidth: wR[1], halign: 'right' },
          2: { cellWidth: wR[2], halign: 'right' },
          3: { cellWidth: wR[3], halign: 'right' },
          4: { cellWidth: wR[4], halign: 'right' },
          5: { cellWidth: wR[5], halign: 'right' },
        },
      }
    );

    // 6) Pesadas + Taras
    sectionTitle('6) Detalle de pesadas');
    const pesadasBody: TableRow[] = (data.pesadas ?? []).map((p) => [
      p.item,
      this.toText(p.producto),
      this.toText(p.balanza),
      this.n2(p.pesoBrutoKg),
      this.n2(p.taraKg),
      this.n2(p.pesoNetoKg),
      this.toText(p.estado),
    ]);
    const wP = widths([0.06, 0.30, 0.18, 0.115, 0.115, 0.115, 0.115]);
    table(
      ['Item', 'Producto', 'Balanza', 'Bruto', 'Tara', 'Neto', 'Estado'],
      pesadasBody.length ? pesadasBody : [['—', '—', '—', '0.00', '0.00', '0.00', '—']],
      {
        columnStyles: {
          0: { cellWidth: wP[0], halign: 'center' },
          1: { cellWidth: wP[1] },
          2: { cellWidth: wP[2] },
          3: { cellWidth: wP[3], halign: 'right' },
          4: { cellWidth: wP[4], halign: 'right' },
          5: { cellWidth: wP[5], halign: 'right' },
          6: { cellWidth: wP[6], halign: 'center' },
        },
      }
    );

    (data.pesadas ?? []).forEach((p) => {
      sectionTitle(`Taras de la pesada ${p.item}`);
      const tarasBody: TableRow[] = (p.taras ?? []).map((t: any) => [
        this.toText(t.empaque),
        this.toText(t.codigo),
        this.n2(t.taraEmpaqueKg),
        Number(t.cantidad ?? 0),
        this.n2(t.taraTotalKg),
      ]);
      const wTar = widths([0.44, 0.12, 0.18, 0.10, 0.16]);
      table(
        ['Empaque', 'Código', 'Tara x Empaque (Kg)', 'Cant.', 'Tara Total (Kg)'],
        tarasBody.length ? tarasBody : [['—', '—', '0.00', 0, '0.00']],
        {
          columnStyles: {
            0: { cellWidth: wTar[0] },
            1: { cellWidth: wTar[1], halign: 'center' },
            2: { cellWidth: wTar[2], halign: 'right' },
            3: { cellWidth: wTar[3], halign: 'center' },
            4: { cellWidth: wTar[4], halign: 'right' },
          },
        }
      );
    });

    // Firmas (más abajo)
    const sigLineW = 180;
    const footerY = pageH - M - 85;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    doc.text('_____________________________________', x + 40, footerY);
    doc.text('Responsable', x + 40 + sigLineW / 2, footerY + 14, { align: 'center' });

    doc.text('_____________________________________', x + innerW - sigLineW - 40, footerY);
    doc.text('Conductor / Transportista', x + innerW - 40 - sigLineW / 2, footerY + 14, { align: 'center' });

    return doc.output('blob');
  }

  // =======================
  // TICKET CORTO (A4 HORIZONTAL) - 4 COLUMNAS (label+box / label+box)
  // =======================
  generateTicket(data: TicketBalanzaReport | any): Blob {
    const t = data?.ticket ? data.ticket : data;

    // Defaults (cabecera + valores como tu foto)
    const def = {
      gi: '04-01902',
      gre: 'EG07-00001963',
      fecha: '2025-08-04',
      sede: 'EL DORADO',
      calidad: 'CACAO EN GRANO HÚMEDO',
      chofer: 'ANDRÉS MANUEL',
      transporte: 'GDP LOGISTIC E.I.R.L.',
      pesoBrutoKg: 31958.5,
      pesoTaraKg: 59.7,
      pesoNetoKg: 31898.8,
      pesoNetoSedeKg: 31961.3,
      sacosGrandes: 107,
      sacosMedianos: 168,
      sacosPequenos: 131,
      sacosYute: 0,
      totalSacos: 406,
      mermaKg: -62.5,
    };

    const pickS = (v: any, d: string) => {
      const s = String(v ?? '').trim();
      return s ? s : d;
    };
    const pickN = (v: any, d: number) => {
      const n = this.toNum(v);
      return n === undefined ? d : n;
    };

    const sacG = this.toNum(t?.sacosGrandes);
    const sacM = this.toNum(t?.sacosMedianos);
    const sacP = this.toNum(t?.sacosPequenos);
    const sacY = this.toNum(t?.sacosYute);

    const hasAnySaco = [sacG, sacM, sacP, sacY].some((n) => n !== undefined);

    const ticket = {
      gi: pickS(t?.gi, def.gi),
      gre: pickS(t?.gre, def.gre),
      fecha: pickS(t?.fechaEmision ?? t?.fecha, def.fecha),
      sede: pickS(t?.sedeOperacion ?? t?.sede, def.sede),
      calidad: pickS(t?.calidad, def.calidad),
      chofer: pickS(t?.chofer, def.chofer),
      transporte: pickS(t?.transporte, def.transporte),

      pesoBrutoKg: pickN(t?.pesoBrutoKg ?? t?.pesoBruto, def.pesoBrutoKg),
      pesoTaraKg: pickN(t?.pesoTaraKg ?? t?.pesoTara, def.pesoTaraKg),
      pesoNetoKg: pickN(t?.pesoNetoKg ?? t?.pesoNeto, def.pesoNetoKg),
      pesoNetoSedeKg: pickN(t?.pesoNetoSedeKg ?? t?.pesoNetoSede, def.pesoNetoSedeKg),

      sacosGrandes: hasAnySaco ? (sacG ?? 0) : def.sacosGrandes,
      sacosMedianos: hasAnySaco ? (sacM ?? 0) : def.sacosMedianos,
      sacosPequenos: hasAnySaco ? (sacP ?? 0) : def.sacosPequenos,
      sacosYute: hasAnySaco ? (sacY ?? 0) : def.sacosYute,

      totalSacos: (() => {
        const tS = this.toNum(t?.totalSacos);
        if (tS !== undefined) return tS;
        if (hasAnySaco) return (sacG ?? 0) + (sacM ?? 0) + (sacP ?? 0) + (sacY ?? 0);
        return def.totalSacos;
      })(),

      mermaKg: pickN(t?.mermaKg, def.mermaKg),
    };

    // ✅ A4 HORIZONTAL (como la foto)
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'l',
      compress: true,
    });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const M = 28;     // margen marco
    const PAD = 18;   // padding interior
    const x = M + PAD;
    const yTop = M + PAD;
    const innerW = W - 2 * (M + PAD);

    // Marco
    doc.setDrawColor(0);
    doc.setLineWidth(0.9);
    doc.rect(M, M, W - 2 * M, H - 2 * M);

    // ===== Header =====
    const titleY = yTop + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('TICKET DE BALANZA ATP', W / 2, titleY, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`GI  ${ticket.gi}`, W - M - 10, titleY, { align: 'right' });

    // línea del header
    doc.setLineWidth(0.7);
    doc.line(x, titleY + 12, x + innerW, titleY + 12);

    // ===== Cabecera (3 bloques bien alineados) =====
    const row1Y = titleY + 34;
    const row2Y = row1Y + 18;

    const colA = x;
    const colB = x + innerW * 0.36;
    const colC = x + innerW * 0.67;

    const wA = innerW * 0.34;
    const wB = innerW * 0.31;
    const wC = innerW * 0.33;

    const writeKV = (xx: number, yy: number, maxW: number, label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.2);
      doc.text(label, xx, yy);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.2);
      const lx = doc.getTextWidth(label) + 4;
      doc.text(this.fitText(doc, value, Math.max(20, maxW - lx)), xx + lx, yy);
    };

    writeKV(colA, row1Y, wA, 'FECHA:', this.toTicketDateEs(ticket.fecha));
    writeKV(colB, row1Y, wB, 'SEDE:', ticket.sede);
    writeKV(colC, row1Y, wC, 'GRE:', ticket.gre);

    writeKV(colA, row2Y, wA, 'CALIDAD:', ticket.calidad);
    writeKV(colB, row2Y, wB, 'CHOFER:', ticket.chofer);
    writeKV(colC, row2Y, wC, 'TRANSPORTE:', ticket.transporte);

    // ===== Cuerpo: 4 columnas (Label+Box / Label+Box) =====
    const startY = row2Y + 26;

    // Columnas (ratios ajustados para que SIEMPRE quepa dentro del innerW)
    const gapCols = Math.round(innerW * 0.04);
    const col1W = Math.round(innerW * 0.23); // label izq
    const col2W = Math.round(innerW * 0.27); // box izq
    const col3W = Math.round(innerW * 0.20); // label der
    const col4W = innerW - col1W - col2W - col3W - gapCols; // box der

    const L1 = x;
    const B1 = x + col1W;
    const L2 = B1 + col2W + gapCols;
    const B2 = L2 + col3W;

    const boxH = 24;
    const rowGap = 42;

    const drawBox = (bx: number, by: number, bw: number, val: string, bold = true) => {
      doc.setLineWidth(0.9);
      doc.rect(bx, by, bw, boxH);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(10);
      doc.text(this.fitText(doc, val, bw - 12), bx + bw - 8, by + boxH / 2 + 4, { align: 'right' });
    };

    const drawRow = (
      idx: number,
      leftLabel: string,
      leftVal: string,
      rightLabel?: string,
      rightVal?: string
    ) => {
      const by = startY + idx * rowGap;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(leftLabel, L1 + 6, by + 16);

      drawBox(B1, by, col2W, leftVal, true);

      if (rightLabel && rightVal !== undefined) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        // etiqueta derecha (en 2 líneas si es necesario)
        if (rightLabel.includes('\n')) {
          const [a, b] = rightLabel.split('\n');
          doc.text(a, L2 + 6, by + 12);
          doc.text(b, L2 + 6, by + 24);
        } else {
          doc.text(rightLabel, L2 + 6, by + 16);
        }
        drawBox(B2, by, col4W, rightVal, true);
      }
    };

    drawRow(0, 'PESO BRUTO', this.n2(ticket.pesoBrutoKg));
    drawRow(1, 'PESO TARA', this.n2(ticket.pesoTaraKg));
    drawRow(2, 'PESO NETO', this.n2(ticket.pesoNetoKg), 'PESO NETO\nSEDE:', this.n2(ticket.pesoNetoSedeKg));
    drawRow(3, 'SACOS GRANDES', String(ticket.sacosGrandes));
    drawRow(4, 'SACOS MEDIANOS', String(ticket.sacosMedianos), 'TOTAL SACOS', String(ticket.totalSacos));
    drawRow(5, 'SACOS PEQUEÑOS', String(ticket.sacosPequenos));
    drawRow(6, 'SACOS DE YUTE', String(ticket.sacosYute));

    // Merma (centrado abajo, dentro del marco)
    const mermaY = Math.min(H - M - 70, startY + 7 * rowGap + 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('MERMA :', x + innerW * 0.36, mermaY + 16);
    drawBox(x + innerW * 0.46, mermaY, Math.round(innerW * 0.16), this.n2(ticket.mermaKg), true);

    return doc.output('blob');
  }

  // =======================
  // Download / Open
  // =======================
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  open(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
