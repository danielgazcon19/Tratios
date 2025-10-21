import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Servicio {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  url_api?: string;
}

export interface CrearServicioDto {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  url_api?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminServiciosService {
  private apiUrl = `${environment.apiUrl}/admin/servicios`;

  constructor(private http: HttpClient) {}

  listarServicios(activo?: boolean): Observable<Servicio[]> {
    let params = new HttpParams();
    if (activo !== undefined) {
      params = params.set('activo', activo.toString());
    }
    return this.http.get<Servicio[]>(this.apiUrl, { params });
  }

  crearServicio(servicio: CrearServicioDto): Observable<any> {
    return this.http.post(this.apiUrl, servicio);
  }

  actualizarServicio(id: number, servicio: Partial<CrearServicioDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, servicio);
  }

  toggleServicio(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/toggle`, {});
  }

  eliminarServicio(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
