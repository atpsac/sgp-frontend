import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import {
  CarrierListQuery,
  MaintenanceService,
} from '../../../../core/services/maintenance.service';

import { CarrierForm } from '../carrier-form/carrier-form';
import { CarrierDelete } from '../carrier-delete/carrier-delete';
import { CarrierReactivate } from '../carrier-reactivate/carrier-reactivate';

type SortDirection = 'asc' | 'desc';
type CarrierAction = 'EDT' | 'DEL' | 'REA';

interface CarrierRow {
  id: number;
  code: string;
  companyName: string;
  ruc: string;
  isActive: boolean;
  status: string;
  activeDriversCount: number;
  activeTrucksCount: number;
  activeTrailersCount: number;
  raw?: any;
}

@Component({
  selector: 'app-carrier-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carrier-list.html',
  styleUrl: './carrier-list.scss',
})
export class CarrierList implements OnInit {
  data: CarrierRow[] = [];

  filters = {
    companyName: '',
    ruc: '',
    status: '',
  };

  pageSize = 10;
  currentPage = 1;
  totalPages = 0;
  totalRecords = 0;
  pageSizes = [10, 25, 50, 100];

  sort = 'companyName';
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

    const query: CarrierListQuery = {
      page: this.currentPage,
      pageSize: this.pageSize,
      sort: this.sort,
      sortDirection: this.sortDirection,
    };

    if (this.filters.companyName.trim()) {
      query.companyName = this.filters.companyName.trim();
    }

    if (this.filters.ruc.trim()) {
      query.ruc = this.filters.ruc.trim();
    }

    if (this.filters.status.trim()) {
      query.status = this.filters.status.trim();
    }

    this.maintenanceService.listCarriers(query).subscribe({
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
        console.error('Error listando transportistas', err);

        this.data = [];
        this.totalRecords = 0;
        this.totalPages = 0;
        this.isLoading = false;

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el listado de transportistas.',
        });
      },
    });
  }

  private mapRow(item: any): CarrierRow {
    const statusRaw = String(item?.status ?? '').toLowerCase().trim();

    const isActive =
      typeof item?.isActive === 'boolean'
        ? item.isActive
        : statusRaw === 'activo';

    return {
      id: Number(item?.id ?? item?.idBusinessPartners ?? 0),
      code: String(item?.code ?? item?.carrierCode ?? item?.registrationNumber ?? '—'),
      companyName: String(item?.companyName ?? '—'),
      ruc: String(item?.ruc ?? item?.documentNumber ?? '—'),
      isActive,
      status: isActive ? 'Activo' : 'Inactivo',
      activeDriversCount: Number(item?.activeDriversCount ?? 0),
      activeTrucksCount: Number(item?.activeTrucksCount ?? 0),
      activeTrailersCount: Number(item?.activeTrailersCount ?? 0),
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
      companyName: '',
      ruc: '',
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

  toggleActions(row: CarrierRow, ev?: MouseEvent): void {
    ev?.stopPropagation();
    ev?.preventDefault();

    this.actionsOpenId = this.actionsOpenId === row.id ? null : row.id;
  }

  onAction(action: CarrierAction, row: CarrierRow, ev?: MouseEvent): void {
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
    const modalRef = this.modalService.open(CarrierForm, {
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

  openEdit(row: CarrierRow): void {
    const modalRef = this.modalService.open(CarrierForm, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.mode = 'edit';
    modalRef.componentInstance.carrierId = row.id;
    modalRef.componentInstance.carrier = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'saved' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openDelete(row: CarrierRow): void {
    const modalRef = this.modalService.open(CarrierDelete, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.carrierId = row.id;
    modalRef.componentInstance.carrier = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'deleted' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  openReactivate(row: CarrierRow): void {
    if (row.isActive) return;

    const modalRef = this.modalService.open(CarrierReactivate, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.carrierId = row.id;
    modalRef.componentInstance.carrier = row.raw;

    modalRef.result
      .then((result) => {
        if (result === 'reactivated' || result === true) this.loadData();
      })
      .catch(() => {});
  }

  onStatusBadgeClick(row: CarrierRow, ev?: MouseEvent): void {
    ev?.stopPropagation();

    if (!row.isActive) {
      this.openReactivate(row);
    }
  }

  getStatusClass(row: CarrierRow): string {
    return row.isActive ? 'ux-status--active' : 'ux-status--inactive';
  }

  trackByRow(_: number, row: CarrierRow): number {
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