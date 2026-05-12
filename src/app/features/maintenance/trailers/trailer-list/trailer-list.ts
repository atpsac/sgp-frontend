import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import {
  MaintenanceService,
  TrailerListQuery,
} from '../../../../core/services/maintenance.service';

import { TrailerForm } from '../trailer-form/trailer-form';
import { TrailerDelete } from '../trailer-delete/trailer-delete';
import { TrailerReactivate } from '../trailer-reactivate/trailer-reactivate';

type SortDirection = 'asc' | 'desc';
type TrailerAction = 'EDT' | 'DEL' | 'REA';

interface TrailerRow {
  id: number;
  licensePlate: string;
  payloadCapacity: number | null;
  axleCount: number | null;
  carrierId: number | null;
  carrierCode: string;
  carrierCompanyName: string;
  isActive: boolean;
  status: string;
  raw?: any;
}

@Component({
  selector: 'app-trailer-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trailer-list.html',
  styleUrl: './trailer-list.scss',
})
export class TrailerList implements OnInit {
  data: TrailerRow[] = [];

  filters = {
    licensePlate: '',
    axleCount: null as number | null,
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

    const query: TrailerListQuery = {
      page: this.currentPage,
      pageSize: this.pageSize,
      sort: this.sort,
      sortDirection: this.sortDirection,
    };

    if (this.filters.licensePlate.trim()) {
      query.licensePlate = this.filters.licensePlate.trim();
    }

    if (this.filters.axleCount !== null && this.filters.axleCount !== undefined) {
      query.axleCount = Number(this.filters.axleCount);
    }

    if (this.filters.status.trim()) {
      query.status = this.filters.status.trim();
    }

    this.maintenanceService.listTrailers(query).subscribe({
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
        console.error('Error listando trailers', err);

        this.data = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.isLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el listado de trailers.',
        });
      },
    });
  }

  private mapRow(item: any): TrailerRow {
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

      axleCount:
        item?.axleCount === null || item?.axleCount === undefined
          ? null
          : Number(item.axleCount),

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
      axleCount: null,
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

  toggleActions(row: TrailerRow, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();

    this.actionsOpenId = this.actionsOpenId === row.id ? null : row.id;
  }

  onAction(action: TrailerAction, row: TrailerRow, ev?: MouseEvent): void {
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
    const modalRef = this.modalService.open(TrailerForm, {
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

  openEdit(row: TrailerRow): void {
    const modalRef = this.modalService.open(TrailerForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.mode = 'edit';
    modalRef.componentInstance.trailerId = row.id;
    modalRef.componentInstance.trailer = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'saved' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openDelete(row: TrailerRow): void {
    const modalRef = this.modalService.open(TrailerDelete, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.trailerId = row.id;
    modalRef.componentInstance.trailer = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'deleted' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openReactivate(row: TrailerRow): void {
    if (row.isActive) return;

    const modalRef = this.modalService.open(TrailerReactivate, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.trailerId = row.id;
    modalRef.componentInstance.trailer = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'reactivated' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  onStatusBadgeClick(row: TrailerRow, ev?: MouseEvent): void {
    ev?.stopPropagation();

    if (!row.isActive) {
      this.openReactivate(row);
    }
  }

  getStatusClass(row: TrailerRow): string {
    return row.isActive ? 'ux-status--active' : 'ux-status--inactive';
  }

  trackByRow(_: number, row: TrailerRow): number {
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