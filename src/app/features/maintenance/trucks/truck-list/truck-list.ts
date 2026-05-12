import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import {
  MaintenanceService,
  TruckListQuery,
} from '../../../../core/services/maintenance.service';

import { TruckForm } from '../truck-form/truck-form';
import { TruckDelete } from '../truck-delete/truck-delete';
import { TruckReactivate } from '../truck-reactivate/truck-reactivate';

type SortDirection = 'asc' | 'desc';
type TruckAction = 'EDT' | 'DEL' | 'REA';

interface TruckRow {
  id: number;
  licensePlate: string;
  payloadCapacity: number | null;
  configuration: string;
  carrierId: number | null;
  carrierCode: string;
  carrierCompanyName: string;
  isActive: boolean;
  status: string;
  raw?: any;
}

@Component({
  selector: 'app-truck-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './truck-list.html',
  styleUrl: './truck-list.scss',
})
export class TruckList implements OnInit {
  data: TruckRow[] = [];

  filters = {
    licensePlate: '',
    configuration: '',
    status: '',
  };

  pageSize = 10;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;
  pageSizes = [10, 25, 50, 100];

  sort = 'licensePlate';
  sortDirection: SortDirection = 'asc';

  isLoading = false;
  actionsOpenId: number | null = null;

  constructor(
    private maintenanceService: MaintenanceService,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.actionsOpenId = null;

    const query: TruckListQuery = {
      page: this.currentPage,
      pageSize: this.pageSize,
      sort: this.sort,
      sortDirection: this.sortDirection,
    };

    if (this.filters.licensePlate.trim()) {
      query.licensePlate = this.filters.licensePlate.trim();
    }

    if (this.filters.configuration.trim()) {
      query.configuration = this.filters.configuration.trim();
    }

    if (this.filters.status.trim()) {
      query.status = this.filters.status.trim();
    }

    this.maintenanceService.listTrucks(query).subscribe({
      next: (resp: any) => {
        const items = Array.isArray(resp?.items) ? resp.items : [];

        this.data = items.map((item: any) => this.mapRow(item));

        this.totalRecords = Number(resp?.total ?? 0);
        this.currentPage = Number(resp?.page ?? this.currentPage);
        this.pageSize = Number(resp?.pageSize ?? this.pageSize);

        this.totalPages =
          this.totalRecords > 0
            ? Math.ceil(this.totalRecords / this.pageSize)
            : 0;

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error listando camiones', err);

        this.data = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.isLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el listado de camiones.',
        });
      },
    });
  }

  private mapRow(item: any): TruckRow {
    const statusRaw = String(item?.status ?? '').toLowerCase().trim();

    const isActive =
      typeof item?.isActive === 'boolean'
        ? item.isActive
        : statusRaw === 'activo';

    return {
      id: Number(item?.id ?? 0),

      licensePlate: item?.licensePlate
        ? String(item.licensePlate).toUpperCase()
        : '—',

      payloadCapacity:
        item?.payloadCapacity === null || item?.payloadCapacity === undefined
          ? null
          : Number(item.payloadCapacity),

      configuration: item?.configuration ? String(item.configuration) : '—',

      carrierId:
        item?.carrierId ??
        item?.idBusinessPartnersCarriers ??
        item?.id_business_partners_carriers ??
        null,

      carrierCode: item?.carrierCode ? String(item.carrierCode) : '—',

      carrierCompanyName: item?.carrierCompanyName
        ? String(item.carrierCompanyName)
        : '—',

      isActive,
      status: isActive ? 'Activo' : 'Inactivo',
      raw: item,
    };
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadData();
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.loadData();
  }

  clearFilters(): void {
    this.filters = {
      licensePlate: '',
      configuration: '',
      status: '',
    };

    this.currentPage = 1;
    this.loadData();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;

    this.currentPage = page;
    this.loadData();
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.loadData();
  }

  onSortDirectionChange(): void {
    this.currentPage = 1;
    this.loadData();
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
    return this.totalRecords === 0
      ? 0
      : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endRecord(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalRecords);
  }

  toggleActions(row: TruckRow, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();

    this.actionsOpenId = this.actionsOpenId === row.id ? null : row.id;
  }

  onAction(action: TruckAction, row: TruckRow, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();

    this.actionsOpenId = null;

    if (action === 'EDT') {
      this.openEdit(row);
      return;
    }

    if (action === 'DEL') {
      this.openDelete(row);
      return;
    }

    if (action === 'REA') {
      this.openReactivate(row);
    }
  }

  crear(): void {
    const modalRef = this.modalService.open(TruckForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.mode = 'create';

    modalRef.result
      .then((result) => {
        if (result === 'saved' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openEdit(row: TruckRow): void {
    const modalRef = this.modalService.open(TruckForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.mode = 'edit';
    modalRef.componentInstance.truckId = row.id;
    modalRef.componentInstance.truck = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'saved' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openDelete(row: TruckRow): void {
    const modalRef = this.modalService.open(TruckDelete, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.truckId = row.id;
    modalRef.componentInstance.truck = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'deleted' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openReactivate(row: TruckRow): void {
    if (row.isActive) return;

    const modalRef = this.modalService.open(TruckReactivate, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.truckId = row.id;
    modalRef.componentInstance.truck = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'reactivated' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  onStatusBadgeClick(row: TruckRow, ev?: MouseEvent): void {
    ev?.stopPropagation();

    if (!row.isActive) {
      this.openReactivate(row);
    }
  }

  getStatusClass(row: TruckRow): string {
    return row.isActive ? 'ux-status--active' : 'ux-status--inactive';
  }

  trackByRow(_: number, row: TruckRow): number {
    return row.id;
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.actionsOpenId = null;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.actionsOpenId = null;
  }
}