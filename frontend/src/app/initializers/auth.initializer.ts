import { AuthSessionService } from '../services/auth-session.service';
import { ApiService } from '../services/api.service';
import { firstValueFrom } from 'rxjs';

/**
 * Inicializador de autenticación que se ejecuta ANTES de que Angular arranque la aplicación.
 * Verifica si hay una sesión activa y si el token está por expirar, lo refresca proactivamente.
 * Esto previene race conditions donde los componentes cargan antes de que el token sea refrescado.
 */
export function initializeAuth(authSession: AuthSessionService, api: ApiService) {
  return async (): Promise<void> => {
    try {
      const session = authSession.getSession();
      
      // Si no hay sesión, no hacemos nada
      if (!session) {
        return;
      }

      // Si la sesión es válida con un buffer de 60 segundos, no hacemos nada
      if (authSession.isSessionValid(60000)) {
        authSession.ensureSynchronized();
        return;
      }

      // Si tenemos refresh token, intentamos refrescar
      const refreshToken = session.refresh_token;
      if (refreshToken) {
        console.log('[Auth Initializer] Token por expirar, refrescando...');
        try {
          const response = await firstValueFrom(api.refreshAccessToken(refreshToken));
          authSession.storeSession(response);
          console.log('[Auth Initializer] Token refrescado exitosamente');
        } catch (error) {
          console.warn('[Auth Initializer] Error al refrescar token, limpiando sesión:', error);
          authSession.clearSession();
        }
      } else {
        // No hay refresh token, limpiar sesión
        console.warn('[Auth Initializer] Sesión expirada sin refresh token');
        authSession.clearSession();
      }
    } catch (error) {
      console.error('[Auth Initializer] Error en inicialización:', error);
    }
  };
}
