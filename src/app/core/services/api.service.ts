import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API_URL = 'http://localhost:3000'; // ajusta según tu backend

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = API_URL;

  get<T>(url: string, options?: any)  { return this.http.get<T>(this.base + url, options); }
  post<T>(url: string, body: any, options?: any) { return this.http.post<T>(this.base + url, body, options); }
  put<T>(url: string, body: any, options?: any)  { return this.http.put<T>(this.base + url, body, options); }
  delete<T>(url: string, options?: any)          { return this.http.delete<T>(this.base + url, options); }
}
