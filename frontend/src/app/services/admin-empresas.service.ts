import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Empresa {
  id: number;
  nombre: string;
  nit: string;
  contacto: string;
  plan: string;
  estado: boolean;
  creado_en: string;
  suscripcion_activa?: any;
  suscripciones?: any[];
}

export interface CrearEmpresaDto {
  nombre: string;
  nit: string;
  contacto?: string;
  plan?: string;
  plan_id?: number;
  periodo?: 'mensual' | 'anual';
  notas?: string;
}

export interface ActualizarEmpresaDto {
  nombre?: string;
  nit?: string;
  contacto?: string;
  estado?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminEmpresasService {
  private apiUrl = `${environment.apiUrl}/admin/empresas`;

  constructor(private http: HttpClient) {}

  listarEmpresas(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(this.apiUrl);
  }

  obtenerEmpresa(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${id}`);
  }

  crearEmpresa(data: CrearEmpresaDto): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  actualizarEmpresa(id: number, data: ActualizarEmpresaDto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  eliminarEmpresa(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  activarEmpresa(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/activar`, {});
  }
}
