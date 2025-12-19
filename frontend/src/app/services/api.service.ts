import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Plan {
  id: string;
  nombre: string;
  precio_mensual: number;
  precio_anual: number;
  caracteristicas: string;
  seleccionado: boolean;
  servicios: any[];
}

export interface UsuarioPayload {
  email: string;
  password: string;
}

export interface UsuarioPerfil {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  empresa_id: number | null;
  creado_en: string;
  otp_enabled: boolean;
  is_active: boolean;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  fecha_nacimiento?: string | null;
  empresa?: any;
}

export type OtpMethod = 'totp' | 'none';

export interface LoginSuccessResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  usuario: UsuarioPerfil;
}

export interface OtpChallengeResponse {
  requires_otp: true;
  challenge_token: string;
  otp_methods: string[];
}

export type LoginResponse = LoginSuccessResponse | OtpChallengeResponse;

export interface LoginPayload {
  email: string;
  password: string;
  otp_code?: string;
  backup_code?: string;
}

export interface OtpSetupPayload {
  method: 'totp';
  secret: string;
  provisioning_uri: string;
  backup_codes: string[];
  activation_token: string;
}

export interface RegistroResponse {
  message: string;
  usuario: UsuarioPerfil;
  empresa?: any;
  otp_setup?: OtpSetupPayload;
}

export interface PerfilResponse {
  usuario: UsuarioPerfil;
}

export interface UpdateProfilePayload {
  nombre?: string;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  fecha_nacimiento?: string | null;
}

export interface SuscripcionDetalle {
  id: number;
  empresa_id: number;
  servicio_id: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  forma_pago: string | null;
  servicio?: {
    id: number;
    nombre: string;
    descripcion?: string | null;
    activo?: boolean;
    url_api?: string | null;
  } | null;
}

export interface SuscripcionesResponse {
  suscripciones: SuscripcionDetalle[];
}

export interface TransferEmpresaPayload {
  empresa_codigo: string;
  nuevo_email: string;
  nuevo_nombre?: string;
  nuevo_password?: string;
  desactivar_anterior?: boolean;
}

export interface TransferEmpresaResponse {
  message: string;
  empresa: any;
  nuevo_usuario: any;
  anterior_usuario?: any;
  temp_password?: string;
}

// Interfaz para suscripción con plan (nueva estructura)
export interface SuscripcionPlan {
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
  porcentaje_descuento?: number;
  precio_con_descuento?: number;
  forma_pago?: string;
  creado_en: string;
  actualizado_en?: string;
  creado_por: number;
  motivo_cancelacion?: string;
  notas?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = (environment.apiUrl || '').replace(/\/$/, '');

  private buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return this.baseUrl ? `${this.baseUrl}${normalized}` : normalized;
  }

  getPlanes() {
    return this.http.get<Plan[]>(this.buildUrl('/public/planes'));
  }

  getServicios(activos = true) {
    const params = activos ? { activos: '1' } : {} as any;
    return this.http.get<any[]>(this.buildUrl('/public/servicios'), { params });
  }

  getEmpresa(id: number) {
    return this.http.get<any>(this.buildUrl(`/public/empresas/${id}`));
  }

  crearSuscripcion(empresaId: number, servicioIds: number[]) {
    return this.http.post<any>(this.buildUrl('/public/suscripcion'), { empresa_id: empresaId, servicio_ids: servicioIds });
  }

  registrar(nombre: string, usuario: UsuarioPayload, empresaCodigo: string, otpMethod: OtpMethod = 'totp'): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(this.buildUrl('/auth/registro'), {
      nombre,
      email: usuario.email,
      password: usuario.password,
      empresa_id: empresaCodigo,
      otp_method: otpMethod
    });
  }

  confirmarRegistroOtp(activationToken: string, otpCode: string) {
    return this.http.post<{ message: string }>(this.buildUrl('/auth/registro/confirmar-otp'), {
      activation_token: activationToken,
      otp_code: otpCode
    });
  }

  obtenerPerfil(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(this.buildUrl('/account/profile'));
  }

  actualizarPerfil(payload: UpdateProfilePayload): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(this.buildUrl('/account/profile'), payload);
  }

  cambiarPassword(payload: { new_password: string; otp_code?: string; verification_code?: string }) {
    return this.http.post<{ message: string }>(this.buildUrl('/account/password'), payload);
  }

  solicitarCodigoPassword() {
    return this.http.post<{ message: string; code?: string; expires_in_minutes: number }>(
      this.buildUrl('/account/password/request-code'), 
      {}
    );
  }

  obtenerSuscripciones(): Observable<SuscripcionesResponse> {
    return this.http.get<SuscripcionesResponse>(this.buildUrl('/account/subscriptions'));
  }

  actualizarSuscripcion(id: number, estado: 'activa' | 'suspendida' | 'inactiva') {
    return this.http.patch<{ message: string; suscripcion: SuscripcionDetalle }>(this.buildUrl(`/account/subscriptions/${id}`), {
      estado
    });
  }

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.buildUrl('/auth/login'), payload);
  }

  completeLoginWithOtp(challengeToken: string, otpCode?: string, backupCode?: string): Observable<LoginSuccessResponse> {
    return this.http.post<LoginSuccessResponse>(this.buildUrl('/auth/login/otp'), {
      challenge_token: challengeToken,
      otp_code: otpCode,
      backup_code: backupCode
    });
  }

  refreshAccessToken(refreshToken: string): Observable<LoginSuccessResponse> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${refreshToken}` });
    return this.http.post<LoginSuccessResponse>(this.buildUrl('/auth/refresh'), {}, { headers });
  }

  requestOtpSetup(regenerate = false) {
    return this.http.post<{ secret: string; provisioning_uri: string }>(this.buildUrl('/auth/otp/setup'), { regenerate });
  }

  activateOtp(otpCode: string) {
    return this.http.post<{ message: string; backup_codes: string[] }>(this.buildUrl('/auth/otp/activate'), { otp_code: otpCode });
  }

  disableOtp(password: string) {
    return this.http.post<{ message: string }>(this.buildUrl('/auth/otp/disable'), { password });
  }

  transferirEmpresa(payload: TransferEmpresaPayload): Observable<TransferEmpresaResponse> {
    return this.http.post<TransferEmpresaResponse>(this.buildUrl('/admin/empresa/transfer'), payload);
  }

  obtenerPaises() {
    return this.http.get<{ countries: { code: string; name: string }[] }>(this.buildUrl('/public/location/countries'));
  }

  buscarPaises(query: string, limit = 20) {
    const params: Record<string, string> = { q: query };
    if (limit) {
      params['limit'] = String(limit);
    }
    return this.http.get<{ countries: { code: string; name: string }[] }>(
      this.buildUrl('/public/location/countries'),
      { params }
    );
  }

  obtenerCiudades(countryCode: string) {
    return this.http.get<{ cities: Array<{ name: string; state?: string }>; country_code: string }>(
      this.buildUrl(`/public/location/countries/${countryCode}/cities`)
    );
  }

  /**
   * Obtiene las suscripciones (con plan) de la empresa del usuario autenticado
   */
  obtenerSuscripcionesPlan(): Observable<SuscripcionPlan[]> {
    return this.http.get<SuscripcionPlan[]>(this.buildUrl('/account/suscripciones'));
  }

  /**
   * Cancela una suscripción del usuario
   */
  cancelarSuscripcion(suscripcionId: number, motivo: string, notas?: string): Observable<any> {
    return this.http.post(this.buildUrl(`/admin/suscripciones/${suscripcionId}/cancelar`), { motivo, notas });
  }
}