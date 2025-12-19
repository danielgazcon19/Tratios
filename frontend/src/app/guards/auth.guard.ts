import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { ApiService } from '../services/api.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authSession = inject(AuthSessionService);
  const api = inject(ApiService);

  const redirectToLogin = (): UrlTree => {
    authSession.clearSession();
    return router.createUrlTree(['/login'], {
      queryParams: { redirectTo: router.getCurrentNavigation()?.extractedUrl?.toString() || '/cuenta' }
    });
  };

  const session = authSession.getSession();

  if (!session) {
    return redirectToLogin();
  }

  // SIEMPRE intentar refrescar si el token está por expirar o ya expiró
  // Usamos un buffer conservador (30 segundos) para refrescar proactivamente
  const needsRefresh = !authSession.isSessionValid(30000); // 30 segundos de buffer
  
  if (needsRefresh && session.refresh_token) {
    console.log('[Auth Guard] Token por expirar, refrescando antes de continuar...');
    // Marcar que hay un refresh en progreso
    (window as any).__token_refresh_in_progress__ = true;
    
    return api.refreshAccessToken(session.refresh_token).pipe(
      map((response) => {
        console.log('[Auth Guard] Token refrescado exitosamente');
        authSession.storeSession(response);
        (window as any).__token_refresh_in_progress__ = false;
        return true;
      }),
      catchError((error) => {
        console.error('[Auth Guard] Error al refrescar token:', error);
        (window as any).__token_refresh_in_progress__ = false;
        return of(redirectToLogin());
      })
    );
  }

  // Token válido
  authSession.ensureSynchronized();
  return true;
};
