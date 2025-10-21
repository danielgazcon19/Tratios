import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Suscripcion {
  id: number;
  empresa_id: number;
  plan_id: number;
  plan?: {
    id: number;
    nombre: string;
    precio_mensual: number;
    precio_anual: number;
  };
  empresa?: {
    id: number;
    nombre: string;
    nit: string;
    estado: boolean;
  };
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activa' | 'inactiva' | 'suspendida' | 'cancelada';
  periodo: 'mensual' | 'anual';
  precio_pagado: number;
  forma_pago?: string;
  creado_en: string;
  actualizado_en?: string;
  creado_por: number;
  motivo_cancelacion?: string;
  notas?: string;
}

export interface CrearSuscripcionDto {
  empresa_id: number;
  plan_id: number;
  periodo: 'mensual' | 'anual';
  fecha_inicio?: string;
  forma_pago?: string;
  notas?: string;
}

export interface RenovarDto {
  periodo?: 'mensual' | 'anual';
  fecha_inicio?: string;
  notas?: string;
}

export interface CancelarDto {
  motivo: string;
  notas?: string;
}

export interface Estadisticas {
  total: number;
  activas: number;
  suspendidas: number;
  canceladas: number;
  inactivas: number;
  por_plan: { plan: string; cantidad: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminSuscripcionesService {
  private apiUrl = `${environment.apiUrl}/admin/suscripciones`;

  constructor(private http: HttpClient) {}

  listarSuscripciones(filtros?: { estado?: string; empresa_id?: number }): Observable<Suscripcion[]> {
    let params = new HttpParams();
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.empresa_id) {
      params = params.set('empresa_id', filtros.empresa_id.toString());
    }
    
    return this.http.get<Suscripcion[]>(this.apiUrl, { params });
  }

  crearSuscripcion(data: CrearSuscripcionDto): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  renovarSuscripcion(id: number, data?: RenovarDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/renovar`, data || {});
  }

  cancelarSuscripcion(id: number, data: CancelarDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancelar`, data);
  }

  suspenderSuscripcion(id: number, motivo: string, notas?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/suspender`, { motivo, notas });
  }

  reactivarSuscripcion(id: number, notas?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/reactivar`, { notas });
  }

  obtenerEstadisticas(): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(`${this.apiUrl}/estadisticas`);
  }
}
