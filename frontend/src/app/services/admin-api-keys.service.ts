import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiKey {
  id: number;
  empresa_id: number;
  empresa_nombre?: string;
  nombre: string;
  codigo: string;
  activo: boolean;
  fecha_creacion: string;
  ultimo_uso?: string;
  fecha_expiracion?: string;
  api_key_hash?: string;
}

export interface CrearApiKeyDto {
  empresa_id: number;
  nombre: string;
  codigo: string;
  dias_expiracion?: number;
}

export interface ActualizarApiKeyDto {
  nombre?: string;
  activo?: boolean;
  dias_expiracion?: number;
}

export interface RenovarApiKeyDto {
  dias_expiracion?: number;
}

export interface ApiKeyResponse {
  message: string;
  api_key: ApiKey;
  api_key_plana?: string;
  importante?: string;
}

export interface ListadoApiKeysResponse {
  api_keys: ApiKey[];
  total: number;
  page?: number;
  per_page?: number;
  pages?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminApiKeysService {
  private apiUrl = `${environment.apiUrl}/admin/api-keys`;

  constructor(private http: HttpClient) {}

  listarApiKeys(filtros?: {
    empresa_id?: number;
    activo?: boolean;
    search?: string;
    page?: number;
    per_page?: number;
  }): Observable<ListadoApiKeysResponse> {
    let params = new HttpParams();
    
    if (filtros?.empresa_id) {
      params = params.set('empresa_id', filtros.empresa_id.toString());
    }
    if (filtros?.activo !== undefined) {
      params = params.set('activo', filtros.activo.toString());
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.page) {
      params = params.set('page', filtros.page.toString());
    }
    if (filtros?.per_page) {
      params = params.set('per_page', filtros.per_page.toString());
    }

    return this.http.get<ListadoApiKeysResponse>(this.apiUrl, { params });
  }

  obtenerApiKey(id: number): Observable<ApiKey> {
    return this.http.get<ApiKey>(`${this.apiUrl}/${id}`);
  }

  crearApiKey(data: CrearApiKeyDto): Observable<ApiKeyResponse> {
    return this.http.post<ApiKeyResponse>(this.apiUrl, data);
  }

  actualizarApiKey(id: number, data: ActualizarApiKeyDto): Observable<ApiKeyResponse> {
    return this.http.put<ApiKeyResponse>(`${this.apiUrl}/${id}`, data);
  }

  eliminarApiKey(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  toggleApiKey(id: number): Observable<ApiKeyResponse> {
    return this.http.post<ApiKeyResponse>(`${this.apiUrl}/${id}/toggle`, {});
  }

  renovarApiKey(id: number, data?: RenovarApiKeyDto): Observable<ApiKeyResponse> {
    return this.http.post<ApiKeyResponse>(`${this.apiUrl}/${id}/renovar`, data || {});
  }
}
