import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ============ TIPOS DE SOPORTE ============
export interface SoporteTipo {
  id: number;
  nombre: string;
  descripcion?: string;
  modalidad: 'mensual' | 'anual' | 'por_tickets' | 'por_horas';
  precio: number;
  max_tickets?: number;
  max_horas?: number;
  activo: boolean;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

export interface CrearSoporteTipoDto {
  nombre: string;
  descripcion?: string;
  modalidad: 'mensual' | 'anual' | 'por_tickets' | 'por_horas';
  precio: number;
  max_tickets?: number;
  max_horas?: number;
  activo?: boolean;
}

// ============ SUSCRIPCIONES DE SOPORTE ============
export interface SoporteSuscripcion {
  id: number;
  suscripcion_id: number;
  empresa_id: number;
  soporte_tipo_id: number;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: 'activo' | 'vencido' | 'cancelado' | 'pendiente_pago';
  precio_actual: number;
  tickets_consumidos: number;
  horas_consumidas: number;
  renovacion_automatica?: boolean;
  notas?: string;
  creado_por?: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  // Relaciones incluidas
  tipo_soporte?: SoporteTipo;
  empresa?: { id: number; nombre: string };
  suscripcion?: { id: number; plan_nombre: string };
  tickets_activos?: number;
}

export interface CrearSoporteSuscripcionDto {
  suscripcion_id: number;
  empresa_id: number;
  soporte_tipo_id: number;
  fecha_inicio: string;
  fecha_fin?: string;
  precio_actual?: number;
  renovacion_automatica?: boolean;
  notas?: string;
}

export interface RenovarSoporteDto {
  meses?: number;
  notas?: string;
}

// ============ PAGOS DE SOPORTE ============
export interface SoportePago {
  id: number;
  soporte_suscripcion_id: number;
  fecha_pago: string;
  monto: number;
  metodo_pago?: string;
  referencia_pago?: string;
  estado: 'exitoso' | 'fallido' | 'pendiente';
  detalle?: any;
  registrado_por?: number;
  fecha_creacion?: string;
  // Relaciones
  soporte_suscripcion?: {
    id: number;
    empresa_id: number;
    empresa?: string;
  };
}

export interface CrearSoportePagoDto {
  soporte_suscripcion_id: number;
  fecha_pago: string;
  monto: number;
  metodo_pago?: string;
  referencia_pago?: string;
  estado?: 'exitoso' | 'fallido' | 'pendiente';
  detalle?: any;
}

// ============ TICKETS DE SOPORTE ============
export interface SoporteTicket {
  id: number;
  soporte_suscripcion_id: number;
  empresa_id: number;
  usuario_creador_id?: number;
  titulo: string;
  descripcion?: string;
  estado: 'abierto' | 'en_proceso' | 'pendiente_respuesta' | 'cerrado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
  asignado_a?: number;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  fecha_cierre?: string;
  extra_data?: any;
  total_comentarios?: number;
  // Relaciones
  empresa?: { id: number; nombre: string };
  admin_asignado?: { id: number; nombre: string };
  tipo_soporte?: string;
  comentarios?: SoporteComentario[];
}

export interface CrearSoporteTicketDto {
  soporte_suscripcion_id: number;
  empresa_id: number;
  usuario_creador_id?: number;
  titulo: string;
  descripcion?: string;
  prioridad?: 'baja' | 'media' | 'alta' | 'critica';
  extra_data?: any;
}

export interface SoporteComentario {
  id: number;
  ticket_id: number;
  usuario_id?: number;
  es_admin: boolean;
  admin_id?: number;
  admin_nombre?: string;
  comentario: string;
  archivos?: string[];
  fecha_creacion?: string;
}

export interface CrearComentarioDto {
  comentario: string;
  archivos?: string[];
}

export interface FiltrosTicket {
  estado?: string;
  prioridad?: string;
  empresa_id?: number;
  asignado_a?: number;
}

export interface EstadisticasSoporte {
  total_suscripciones: number;
  suscripciones_activas: number;
  total_tickets: number;
  tickets_abiertos: number;
  tickets_en_proceso: number;
  tickets_cerrados: number;
  por_prioridad: { prioridad: string; cantidad: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminSoporteService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ============ TIPOS DE SOPORTE ============

  listarTiposSoporte(soloActivos: boolean = false): Observable<SoporteTipo[]> {
    let params = new HttpParams();
    if (soloActivos) {
      params = params.set('activos', 'true');
    }
    return this.http.get<{ tipos: SoporteTipo[], total: number }>(`${this.apiUrl}/admin/soporte-tipos`, { params })
      .pipe(map(response => response.tipos));
  }

  obtenerTipoSoporte(id: number): Observable<SoporteTipo> {
    return this.http.get<SoporteTipo>(`${this.apiUrl}/admin/soporte-tipos/${id}`);
  }

  crearTipoSoporte(data: CrearSoporteTipoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-tipos`, data);
  }

  actualizarTipoSoporte(id: number, data: Partial<CrearSoporteTipoDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/soporte-tipos/${id}`, data);
  }

  eliminarTipoSoporte(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/soporte-tipos/${id}`);
  }

  // ============ SUSCRIPCIONES DE SOPORTE ============

  listarSoporteSuscripciones(filtros?: { estado?: string; empresa_id?: number }): Observable<SoporteSuscripcion[]> {
    let params = new HttpParams();
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.empresa_id) {
      params = params.set('empresa_id', filtros.empresa_id.toString());
    }
    return this.http.get<{ suscripciones: SoporteSuscripcion[], total: number }>(`${this.apiUrl}/admin/soporte-suscripciones`, { params })
      .pipe(map(response => response.suscripciones));
  }

  obtenerSoporteSuscripcion(id: number): Observable<SoporteSuscripcion> {
    return this.http.get<SoporteSuscripcion>(`${this.apiUrl}/admin/soporte-suscripciones/${id}`);
  }

  crearSoporteSuscripcion(data: CrearSoporteSuscripcionDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-suscripciones`, data);
  }

  actualizarSoporteSuscripcion(id: number, data: Partial<CrearSoporteSuscripcionDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/soporte-suscripciones/${id}`, data);
  }

  cancelarSoporteSuscripcion(id: number, motivo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-suscripciones/${id}/cancelar`, { motivo });
  }

  renovarSoporteSuscripcion(id: number, data?: RenovarSoporteDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-suscripciones/${id}/renovar`, data || {});
  }

  eliminarSoporteSuscripcion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/soporte-suscripciones/${id}`);
  }

  obtenerSuscripcionActivaEmpresa(empresaId: number): Observable<{tiene_soporte: boolean; suscripcion?: SoporteSuscripcion; message?: string}> {
    return this.http.get<{tiene_soporte: boolean; suscripcion?: SoporteSuscripcion; message?: string}>(
      `${this.apiUrl}/admin/soporte-suscripciones/empresa/${empresaId}/verificar-activa`
    );
  }

  // ============ PAGOS DE SOPORTE ============

  listarSoportePagos(filtros?: { soporte_suscripcion_id?: number; estado?: string }): Observable<SoportePago[]> {
    let params = new HttpParams();
    if (filtros?.soporte_suscripcion_id) {
      params = params.set('soporte_suscripcion_id', filtros.soporte_suscripcion_id.toString());
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<{ pagos: SoportePago[], total: number, monto_total: number }>(`${this.apiUrl}/admin/soporte-pagos`, { params })
      .pipe(map(response => response.pagos));
  }

  obtenerSoportePago(id: number): Observable<SoportePago> {
    return this.http.get<SoportePago>(`${this.apiUrl}/admin/soporte-pagos/${id}`);
  }

  crearSoportePago(data: CrearSoportePagoDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-pagos`, data);
  }

  actualizarSoportePago(id: number, data: Partial<CrearSoportePagoDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/soporte-pagos/${id}`, data);
  }

  eliminarSoportePago(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/soporte-pagos/${id}`);
  }

  // ============ TICKETS DE SOPORTE ============

  listarSoporteTickets(filtros?: FiltrosTicket): Observable<SoporteTicket[]> {
    let params = new HttpParams();
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.prioridad) {
      params = params.set('prioridad', filtros.prioridad);
    }
    if (filtros?.empresa_id) {
      params = params.set('empresa_id', filtros.empresa_id.toString());
    }
    if (filtros?.asignado_a) {
      params = params.set('asignado_a', filtros.asignado_a.toString());
    }
    return this.http.get<{ tickets: SoporteTicket[], total: number, estadisticas: any }>(`${this.apiUrl}/admin/soporte-tickets`, { params })
      .pipe(map(response => response.tickets));
  }

  obtenerSoporteTicket(id: number): Observable<SoporteTicket> {
    return this.http.get<SoporteTicket>(`${this.apiUrl}/admin/soporte-tickets/${id}`);
  }

  crearSoporteTicket(data: CrearSoporteTicketDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-tickets`, data);
  }

  actualizarSoporteTicket(id: number, data: Partial<CrearSoporteTicketDto>): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/soporte-tickets/${id}`, data);
  }

  asignarTicket(id: number, adminId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-tickets/${id}/asignar`, { admin_id: adminId });
  }

  cambiarEstadoTicket(id: number, estado: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-tickets/${id}/estado`, { estado });
  }

  cerrarTicket(id: number, comentarioFinal?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-tickets/${id}/cerrar`, { comentario: comentarioFinal });
  }

  reabrirTicket(id: number, motivo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-tickets/${id}/reabrir`, { motivo });
  }

  eliminarSoporteTicket(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/soporte-tickets/${id}`);
  }

  // ============ COMENTARIOS EN TICKETS ============

  listarComentariosTicket(ticketId: number): Observable<SoporteComentario[]> {
    return this.http.get<SoporteComentario[]>(`${this.apiUrl}/admin/soporte-tickets/${ticketId}/comentarios`);
  }

  agregarComentario(ticketId: number, data: CrearComentarioDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/soporte-tickets/${ticketId}/comentarios`, data);
  }

  // ============ ARCHIVOS DE TICKETS ============

  subirArchivosTicket(ticketId: number, archivos: File[]): Observable<any> {
    const formData = new FormData();
    archivos.forEach(archivo => {
      formData.append('files', archivo);
    });
    return this.http.post(`${this.apiUrl}/admin/soporte-tickets/${ticketId}/upload`, formData);
  }

  descargarArchivoTicket(ticketId: number, filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/admin/soporte-tickets/${ticketId}/archivo/${filename}`, {
      responseType: 'blob'
    });
  }

  eliminarArchivoTicket(ticketId: number, filename: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/soporte-tickets/${ticketId}/archivo/${filename}`);
  }

  // ============ ESTADÍSTICAS ============

  obtenerEstadisticasTickets(): Observable<EstadisticasSoporte> {
    return this.http.get<EstadisticasSoporte>(`${this.apiUrl}/admin/soporte-tickets/estadisticas`);
  }
}
