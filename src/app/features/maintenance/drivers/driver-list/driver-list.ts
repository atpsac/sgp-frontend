import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import {
  DriverListQuery,
  MaintenanceService,
} from '../../../../core/services/maintenance.service';

import { DriverForm } from '../driver-form/driver-form';
import { DriverDelete } from '../driver-delete/driver-delete';
import { DriverReactivate } from '../driver-reactivate/driver-reactivate';

type SortDirection = 'asc' | 'desc';
type DriverAction = 'EDT' | 'DEL' | 'REA';

interface DriverRow {
  id: number;
  fullName: string;
  documentNumber: string;
  license: string;
  carrierId: number | null;
  carrierCode: string;
  carrierCompanyName: string;
  isActive: boolean;
  status: string;
  raw?: any;
}

@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './driver-list.html',
  styleUrl: './driver-list.scss',
})
export class DriverList implements OnInit {
  data: DriverRow[] = [];

  filters = {
    fullName: '',
    documentNumber: '',
    license: '',
    status: '',
  };

  pageSize = 10;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;
  pageSizes = [10, 25, 50, 100];

  sort = 'fullName';
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

    const query: DriverListQuery = {
      page: this.currentPage,
      pageSize: this.pageSize,
      sort: this.sort,
      sortDirection: this.sortDirection,
    };

    if (this.filters.fullName.trim()) {
      query.fullName = this.filters.fullName.trim();
    }

    if (this.filters.documentNumber.trim()) {
      query.documentNumber = this.filters.documentNumber.trim();
    }

    if (this.filters.license.trim()) {
      query.license = this.filters.license.trim();
    }

    if (this.filters.status.trim()) {
      query.status = this.filters.status.trim();
    }

    this.maintenanceService.listDrivers(query).subscribe({
      next: (resp: any) => {
        const payload = Array.isArray(resp?.data) ? resp.data[0] : resp;

        const items = Array.isArray(payload?.items) ? payload.items : [];

        this.data = items.map((item: any) => this.mapRow(item));

        this.totalRecords = Number(payload?.total ?? 0);
        this.currentPage = Number(payload?.page ?? this.currentPage);
        this.pageSize = Number(payload?.pageSize ?? this.pageSize);

        this.totalPages =
          this.totalRecords > 0
            ? Math.ceil(this.totalRecords / this.pageSize)
            : 0;

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error listando choferes', err);

        this.data = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.isLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el listado de choferes.',
        });
      },
    });
  }

  private mapRow(item: any): DriverRow {
    const statusRaw = String(item?.status ?? '').toLowerCase().trim();

    const isActive =
      typeof item?.isActive === 'boolean'
        ? item.isActive
        : statusRaw === 'activo';

    return {
      id: Number(item?.id ?? 0),
      fullName: String(item?.fullName ?? '—'),
      documentNumber: String(item?.documentNumber ?? '—'),
      license: String(item?.license ?? '—'),
      carrierId:
        item?.carrierId === null || item?.carrierId === undefined
          ? null
          : Number(item.carrierId),
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
      fullName: '',
      documentNumber: '',
      license: '',
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

  toggleActions(row: DriverRow, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();

    this.actionsOpenId = this.actionsOpenId === row.id ? null : row.id;
  }

  onAction(action: DriverAction, row: DriverRow, ev?: MouseEvent): void {
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
    const modalRef = this.modalService.open(DriverForm, {
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

  openEdit(row: DriverRow): void {
    const modalRef = this.modalService.open(DriverForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.mode = 'edit';
    modalRef.componentInstance.driverId = row.id;
    modalRef.componentInstance.driver = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'saved' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openDelete(row: DriverRow): void {
    const modalRef = this.modalService.open(DriverDelete, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.driverId = row.id;
    modalRef.componentInstance.driver = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'deleted' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openReactivate(row: DriverRow): void {
    if (row.isActive) return;

    const modalRef = this.modalService.open(DriverReactivate, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.driverId = row.id;
    modalRef.componentInstance.driver = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'reactivated' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  onStatusBadgeClick(row: DriverRow, ev?: MouseEvent): void {
    ev?.stopPropagation();

    if (!row.isActive) {
      this.openReactivate(row);
    }
  }

  getStatusClass(row: DriverRow): string {
    return row.isActive ? 'ux-status--active' : 'ux-status--inactive';
  }

  trackByRow(_: number, row: DriverRow): number {
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