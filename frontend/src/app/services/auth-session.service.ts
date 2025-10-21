import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginSuccessResponse } from './api.service';

export interface AuthSession {
  access_token: string;
  refresh_token?: string | null;
  usuario: LoginSuccessResponse['usuario'];
  expires_at: number;
}

const STORAGE_KEY = 'tratios.auth';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private currentUserSubject = new BehaviorSubject<LoginSuccessResponse['usuario'] | null>(null);
  public currentUser$: Observable<LoginSuccessResponse['usuario'] | null> = this.currentUserSubject.asObservable();

  constructor() {
    // Cargar sesión al iniciar el servicio
    const session = this.getSession();
    if (session && this.isSessionValid()) {
      this.currentUserSubject.next(session.usuario);
    }
  }

  getCurrentUser(): LoginSuccessResponse['usuario'] | null {
    return this.currentUserSubject.value;
  }

  getSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }
      const parsed = JSON.parse(stored) as Partial<AuthSession> | null;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      if (!parsed.access_token || !parsed.expires_at) {
        return null;
      }
      return {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token ?? null,
        usuario: parsed.usuario as LoginSuccessResponse['usuario'],
        expires_at: typeof parsed.expires_at === 'number'
          ? parsed.expires_at
          : Number(parsed.expires_at)
      };
    } catch (error) {
      return null;
    }
  }

  storeSession(response: LoginSuccessResponse): AuthSession {
    const expiresAt = Date.now() + response.expires_in * 1000;
    const session: AuthSession = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      usuario: response.usuario,
      expires_at: expiresAt
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
    } catch (error) {
      // Si localStorage arroja error (modo incógnito, etc.), lo ignoramos.
    }

    // Notificar a todos los suscriptores que hay un nuevo usuario
    this.currentUserSubject.next(session.usuario);

    return session;
  }

  isSessionValid(bufferMs = 5000): boolean {
    const session = this.getSession();
    if (!session) {
      return false;
    }
    return session.expires_at - bufferMs > Date.now();
  }

  clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    } catch (error) {
      // Ignorar errores de almacenamiento
    }

    // Notificar que el usuario ha cerrado sesión
    this.currentUserSubject.next(null);
  }
}
