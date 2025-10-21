import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Plan {
  id: number;
  nombre: string;
  precio_mensual: number;
  precio_anual: number;
  descripcion?: string;
  seleccionado?: boolean;
}

export interface CrearPlanDto {
  nombre: string;
  precio_mensual: number;
  precio_anual: number;
  descripcion?: string;
  seleccionado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminPlanesService {
  private apiUrl = `${environment.apiUrl}/admin/planes`;

  constructor(private http: HttpClient) {}

  listarPlanes(): Observable<Plan[]> {
    return this.http.get<Plan[]>(this.apiUrl);
  }

  crearPlan(plan: CrearPlanDto): Observable<any> {
    return this.http.post(this.apiUrl, plan);
  }

  actualizarPlan(id: number, plan: Partial<CrearPlanDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, plan);
  }

  eliminarPlan(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
