// src/app/core/services/weighing.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface BuyingStation {
  id: number;
  name: string;
  address: string;
  isPrincipal: boolean;
}

export interface OperationStation {
  id: number;
  name: string;
  code: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class WeighingService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  /**
   * Gets buying stations for the current logged user
   * GET /users/{id}/buying-stations
   */
  getUserBuyingStations(): Observable<BuyingStation[]> {
    const user = this.auth.getUser();
    if (!user?.id) {
      throw new Error('User not found in AuthService');
    }

    // relative URL → apiInterceptor adds base URL + Authorization
    return this.http.get<BuyingStation[]>(`users/${user.id}/buying-stations`);
  }

  /**
   * Gets all non-principal buying stations
   * GET /buying-stations/non-principal
   */
  getNonPrincipalBuyingStations(): Observable<BuyingStation[]> {
    return this.http.get<BuyingStation[]>(`buying-stations/non-principal`);
  }

  /**
   * Gets the principal buying station
   * GET /buying-stations/principal
   */
  getPrincipalBuyingStation(): Observable<BuyingStation> {
    return this.http.get<BuyingStation>(`buying-stations/principal`);
  }

  /**
   * Gets operations for a given station
   * GET /operations/station/{buyingStationId}
   */
  getOperationsByStation(stationId: number): Observable<OperationStation[]> {
    return this.http.get<OperationStation[]>(
      `operations/station/${stationId}`
    );
  }
}
