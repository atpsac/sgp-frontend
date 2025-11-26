// src/app/core/services/users.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface User {
  UsuarioId?: number;
  RolId: number | null;
  Correo: string;
  Telefono?: string | null;
  RolNombre?: string | null;
  TipoDocumentoId?: number | null;
  NumeroDocumento?: string | null;

  Nombres: string;
  Apellidos: string;

  Departamento?: string | null;
  Provincia?: string | null;
  Distrito?: string | null;

  FechaNacimiento?: string | null;  // 'YYYY-MM-DD'
  Sexo?: 'M' | 'F' | 'O' | null;
  Edad?: number | null;

  Foto?: string | null;

  FlagActivo: 0 | 1;

  // sólo para crear/editar
  Contrasena?: string | null;
  CreadoPor?: string | null;
  ModificadoPor?: string | null;
}

@Injectable({ providedIn: 'root' })
export class Users {
  private formGroup: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.formGroup = this.fb.group({
      UsuarioId: [null],
      RolId: [null, [Validators.required]],

      Correo: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
      Telefono: [''],

      TipoDocumentoId: [null],
      NumeroDocumento: [''],

      Nombres: ['', [Validators.required, Validators.maxLength(80)]],
      Apellidos: ['', [Validators.required, Validators.maxLength(120)]],

      Departamento: [''],
      Provincia: [''],
      Distrito: [''],

      FechaNacimiento: [null],  // string 'YYYY-MM-DD'
      Sexo: [null],             // 'M'|'F'|'O'
      Foto: [''],

      FlagActivo: [1],

      // Contraseña se envía solo si quieres poner/actualizar password
      Contrasena: [''],
    });
  }

  // ------------ Form API ------------
  get form(): FormGroup {
    return this.formGroup;
  }

  /** Rellena el formulario para editar/crear. No toca la contraseña. */
  set fillForm(data: Partial<User> | null) {
    this.formGroup.patchValue({
      UsuarioId: data?.UsuarioId ?? null,
      RolId: data?.RolId ?? null,

      Correo: data?.Correo ?? '',
      Telefono: data?.Telefono ?? '',

      TipoDocumentoId: data?.TipoDocumentoId ?? null,
      NumeroDocumento: data?.NumeroDocumento ?? '',

      Nombres: data?.Nombres ?? '',
      Apellidos: data?.Apellidos ?? '',

      Departamento: data?.Departamento ?? '',
      Provincia: data?.Provincia ?? '',
      Distrito: data?.Distrito ?? '',

      FechaNacimiento: data?.FechaNacimiento ?? null,
      Sexo: (data?.Sexo as any) ?? null,
      Foto: data?.Foto ?? '',

      FlagActivo: (data?.FlagActivo ?? 1) as 0 | 1,

      Contrasena: '', // no setear por defecto
    });
  }

  /** Limpia el campo contraseña (útil tras guardar). */
  clearPassword(): void {
    this.formGroup.get('Contrasena')?.setValue('');
    this.formGroup.get('Contrasena')?.markAsPristine();
  }

  // ------------ HTTP helpers ------------
  /** Lista con paginación y filtros. Filtros soportados:
   *  { search, FlagActivo, Sexo, RolId, Departamento, Provincia, Distrito, EdadMin, EdadMax }
   */
  getUsers(page: number, pageSize: number, filters: any = {}): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (filters?.search) params = params.set('search', String(filters.search));
    if (filters?.FlagActivo !== null && filters?.FlagActivo !== undefined) {
      params = params.set('FlagActivo', String(filters.FlagActivo));
    }
    if (filters?.Sexo)         params = params.set('Sexo', String(filters.Sexo));
    if (filters?.RolId)        params = params.set('RolId', String(filters.RolId));
    if (filters?.Departamento) params = params.set('Departamento', String(filters.Departamento));
    if (filters?.Provincia)    params = params.set('Provincia', String(filters.Provincia));
    if (filters?.Distrito)     params = params.set('Distrito', String(filters.Distrito));
    if (filters?.EdadMin !== undefined && filters?.EdadMin !== null) {
      params = params.set('EdadMin', String(filters.EdadMin));
    }
    if (filters?.EdadMax !== undefined && filters?.EdadMax !== null) {
      params = params.set('EdadMax', String(filters.EdadMax));
    }

    return this.http.get(`${environment.apiUrl}usuarios`, { params });
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}usuarios/show/${id}`);
  }

  /** Crea usuario. Enviar Contrasena si quieres setear password. */
  create(payload: Partial<User>): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}usuarios/store`, payload);
  }

  /** Edita usuario. Si incluyes Contrasena (no vacía), se cambia la contraseña. */
  edit(id: number, payload: Partial<User>): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}usuarios/${id}`, payload);
  }

  changeStatus(id: number, flagActivo: 0 | 1): Observable<any> {
    return this.http.put(`${environment.apiUrl}usuarios/change-status/${id}`, {
      FlagActivo: flagActivo,
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}usuarios/${id}`);
  }

  /** Exporta respetando filtros (mismos que getUsers) */
  exportExcel(filters: any = {}): Observable<Blob> {
    let params = new HttpParams();
    if (filters?.search)       params = params.set('search', String(filters.search));
    if (filters?.FlagActivo !== null && filters?.FlagActivo !== undefined) {
      params = params.set('FlagActivo', String(filters.FlagActivo));
    }
    if (filters?.Sexo)         params = params.set('Sexo', String(filters.Sexo));
    if (filters?.RolId)        params = params.set('RolId', String(filters.RolId));
    if (filters?.Departamento) params = params.set('Departamento', String(filters.Departamento));
    if (filters?.Provincia)    params = params.set('Provincia', String(filters.Provincia));
    if (filters?.Distrito)     params = params.set('Distrito', String(filters.Distrito));
    if (filters?.EdadMin !== undefined && filters?.EdadMin !== null) {
      params = params.set('EdadMin', String(filters.EdadMin));
    }
    if (filters?.EdadMax !== undefined && filters?.EdadMax !== null) {
      params = params.set('EdadMax', String(filters.EdadMax));
    }

    return this.http.get(`${environment.apiUrl}usuarios/export`, {
      params,
      responseType: 'blob',
    });
  }

  /** Login para panel admin (ADMIN o VENDEDOR) */
  loginAdmin(correo: string, contrasena: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}usuarios/login-admin`, {
      Correo: correo,
      Contrasena: contrasena,
    });
  }


  // dentro de Users (users.service.ts)
identidadLookup(tipo: 'DNI' | 'CE', numero: string) {
  // Tu backend está en /api/usuario/identidad/{tipo}/{numero}
  return this.http.get<any>(`${environment.apiUrl}usuario/identidad/${tipo}/${encodeURIComponent(numero)}`);
}


}
