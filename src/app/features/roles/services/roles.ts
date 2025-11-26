// src/app/core/services/roles.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Role {
  RolId?: number;
  Codigo: string;
  Nombre: string;
  FlagActivo: number; // 0 | 1
  CreadoPor?: string | null;
  ModificadoPor?: string | null;
  FechaCreacion?: string;
  FechaModificacion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class Roles {
  private formGroup: FormGroup;

  constructor(
    private http: HttpClient,
    protected router: Router,
    protected fb: FormBuilder
  ) {
    this.formGroup = this.fb.group({
      // en DB: Codigo varchar(30), Nombre varchar(60)
      Codigo: ['', [Validators.required, Validators.maxLength(30)]],
      Nombre: ['', [Validators.required, Validators.maxLength(60)]],
      FlagActivo: [1, []],
    });
  }

  // ---- Form API ----
  get form(): FormGroup {
    return this.formGroup;
  }

  set fillForm(data: Partial<Role> | null) {
    this.formGroup.patchValue({
      Codigo: data?.Codigo ?? '',
      Nombre: data?.Nombre ?? '',
      FlagActivo: data?.FlagActivo ?? 1,
    });
  }

  // ---- HTTP API ----

  /**
   * Lista roles con filtros y paginación
   * @param filters admite { search?: string, FlagActivo?: 0|1 }
   */
  getRoles(page: number, pageSize: number, filters: any = {}): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    // El backend busca por Codigo o Nombre con "search"
    const search =
      (filters?.search ?? '').toString().trim() ||
      (filters?.Nombre ?? '').toString().trim() ||
      (filters?.Codigo ?? '').toString().trim();

    if (search) params = params.set('search', search);

    if (filters?.FlagActivo !== null && filters?.FlagActivo !== undefined) {
      params = params.set('FlagActivo', String(filters.FlagActivo));
    }

    return this.http.get(`${environment.apiUrl}rol`, { params });
  }

  getById(id: number): Observable<Role> {
    return this.http.get<Role>(`${environment.apiUrl}rol/show/${id}`);
  }

  create(payload: Role): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}rol/store`, payload);
  }

  edit(id: number, payload: Partial<Role>): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}rol/${id}`, payload);
  }

  changeStatus(id: number, flagActivo: 0 | 1): Observable<any> {
    return this.http.put(`${environment.apiUrl}rol/change-status/${id}`, {
      FlagActivo: flagActivo,
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}rol/${id}`);
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}rol/export`, {
      responseType: 'blob',
    });
  }
}
