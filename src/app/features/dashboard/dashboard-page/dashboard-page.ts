import { Component } from '@angular/core';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexStroke,
  ApexXAxis,
  ApexLegend,
  ApexGrid,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexFill,
  ApexTooltip
} from 'ng-apexcharts';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  xaxis?: ApexXAxis;
  legend?: ApexLegend;
  grid?: ApexGrid;
  fill?: ApexFill;
  tooltip?: ApexTooltip;
};

export type DonutOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels?: string[];
  responsive?: ApexResponsive[];
  legend?: ApexLegend;
  colors?: string[];
};


@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './dashboard-page.html',
  styleUrls: ['./dashboard-page.scss'],
})
export class DashboardPage  {
 
// === Tarjetas KPI (ejemplo) ===
  kpis = [
    {
      title: 'Tickets registrados',
      subtitle: 'Este mes',
      icon: 'bi-receipt',
      value: 128,
      helper: '+14 vs. mes ant.',
      color: '#3b82f6'
    },
    {
      title: 'Tickets cerrados',
      subtitle: 'Este mes',
      icon: 'bi-check2-circle',
      value: 96,
      helper: '75% cierre',
      color: '#10b981'
    },
    {
      title: 'Peso neto total',
      subtitle: 'kg (mes)',
      icon: 'bi-speedometer2',
      value: '155,320.50',
      helper: 'kg',
      color: '#f59e0b'
    },
    {
      title: 'Merma promedio',
      subtitle: 'en el mes',
      icon: 'bi-percent',
      value: '0.21%',
      helper: 'obj. < 0.30%',
      color: '#f43f5e'
    }
  ];

  // === Gráfico de línea: Tickets por día ===
  public lineChartOptions: Partial<ChartOptions> = {
    series: [
      {
        name: 'Tickets',
        data: [18, 22, 17, 25, 20, 26] // demo últimas 6 fechas
      }
    ],
    chart: {
      type: 'line',
      height: 280,
      toolbar: { show: false }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
      categories: ['01/10', '02/10', '03/10', '04/10', '05/10', '06/10'],
      labels: { style: { colors: '#94a3b8' } }
    },
    legend: { position: 'top', horizontalAlign: 'right' },
    grid: { borderColor: 'rgba(148, 163, 184, 0.25)' },
    tooltip: { theme: 'light' }
  };

  // === Donut: Estados de ticket ===
  public donutEstados: Partial<DonutOptions> = {
    series: [12, 8, 2, 3], // En registro, Cerrada, Anulada, En evaluación
    labels: ['En registro', 'Cerrada', 'Anulada', 'En evaluación'],
    chart: { type: 'donut', height: 240 },
    colors: ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b'],
    legend: { show: false }
  };

  // === Donut: Tickets por sede ===
  public donutSedes: Partial<DonutOptions> = {
    series: [22, 9, 6], // Lima Planta, San Alejandro, Otras
    labels: ['ATP - LIMA PLANTA', 'ATP - SAN ALEJANDRO', 'Otras'],
    chart: { type: 'donut', height: 240 },
    colors: ['#3b82f6', '#10b981', '#94a3b8'],
    legend: { show: false }
  };
}
