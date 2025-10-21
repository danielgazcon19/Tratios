import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Plan } from './admin-planes.service';
import { Servicio } from './admin-servicios.service';

export interface PlanConServicios extends Plan {
  servicios: Servicio[];
  total_servicios: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPlanServiciosService {
  private apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  obtenerServiciosPlan(planId: number): Observable<{ plan: Plan; servicios: Servicio[] }> {
    return this.http.get<{ plan: Plan; servicios: Servicio[] }>(`${this.apiUrl}/planes/${planId}/servicios`);
  }

  asociarServicios(planId: number, servicioIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/planes/${planId}/servicios`, { servicio_ids: servicioIds });
  }

  agregarServicio(planId: number, servicioId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/planes/${planId}/servicios/${servicioId}`, {});
  }

  eliminarServicio(planId: number, servicioId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/planes/${planId}/servicios/${servicioId}`);
  }

  obtenerResumen(): Observable<PlanConServicios[]> {
    return this.http.get<PlanConServicios[]>(`${this.apiUrl}/planes-servicios/resumen`);
  }
}
