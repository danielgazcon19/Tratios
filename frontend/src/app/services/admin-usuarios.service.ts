import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'cliente';
  empresa_id?: number;
  empresa?: {
    id: number;
    nombre: string;
    nit: string;
  };
  creado_en: string;
  is_active: boolean;
  otp_enabled: boolean;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  fecha_nacimiento?: string;
}

export interface CrearUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'cliente';
  empresa_id?: number;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
}

export interface ActualizarUsuarioDto {
  nombre?: string;
  email?: string;
  rol?: 'admin' | 'cliente';
  empresa_id?: number;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
}

export interface PaginacionUsuarios {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_prev: boolean;
  has_next: boolean;
}

export interface RespuestaListadoUsuarios {
  usuarios: Usuario[];
  pagination: PaginacionUsuarios;
}

export interface EstadisticasUsuarios {
  total: number;
  activos: number;
  inactivos: number;
  admins: number;
  clientes: number;
  con_2fa: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsuariosService {
  private apiUrl = `${environment.apiUrl}/admin/usuarios`;

  constructor(private http: HttpClient) {}

  /**
   * Lista usuarios con paginación y filtros
   */
  listarUsuarios(filtros?: {
    page?: number;
    per_page?: number;
    search?: string;
    rol?: string;
    estado?: string;
    empresa_id?: number;
  }): Observable<RespuestaListadoUsuarios> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.page) params = params.set('page', filtros.page.toString());
      if (filtros.per_page) params = params.set('per_page', filtros.per_page.toString());
      if (filtros.search) params = params.set('search', filtros.search);
      if (filtros.rol) params = params.set('rol', filtros.rol);
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.empresa_id) params = params.set('empresa_id', filtros.empresa_id.toString());
    }

    return this.http.get<RespuestaListadoUsuarios>(this.apiUrl, { params });
  }

  /**
   * Obtiene un usuario por ID
   */
  obtenerUsuario(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo usuario
   */
  crearUsuario(usuario: CrearUsuarioDto): Observable<{ message: string; usuario: Usuario }> {
    return this.http.post<{ message: string; usuario: Usuario }>(this.apiUrl, usuario);
  }

  /**
   * Actualiza un usuario existente
   */
  actualizarUsuario(id: number, usuario: ActualizarUsuarioDto): Observable<{ message: string; usuario: Usuario }> {
    return this.http.put<{ message: string; usuario: Usuario }>(`${this.apiUrl}/${id}`, usuario);
  }

  /**
   * Cambia la contraseña de un usuario
   */
  cambiarPassword(id: number, nueva_password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/cambiar-password`, { nueva_password });
  }

  /**
   * Activa o inactiva un usuario
   */
  toggleEstado(id: number): Observable<{ message: string; usuario: Usuario }> {
    return this.http.post<{ message: string; usuario: Usuario }>(`${this.apiUrl}/${id}/toggle-estado`, {});
  }

  /**
   * Elimina un usuario (eliminación física)
   */
  eliminarUsuario(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  obtenerEstadisticas(): Observable<EstadisticasUsuarios> {
    return this.http.get<EstadisticasUsuarios>(`${this.apiUrl}/estadisticas`);
  }
}
