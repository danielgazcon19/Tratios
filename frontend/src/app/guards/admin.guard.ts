import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { ApiService } from '../services/api.service';
import { catchError, map, of } from 'rxjs';

export const adminGuard: CanActivateFn = (route, state) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);
  const api = inject(ApiService);

  const redirectToLogin = (): UrlTree => {
    authSession.clearSession();
    if (typeof window !== 'undefined' && (window as any).Swal) {
      (window as any).Swal.fire({
        icon: 'warning',
        title: 'Acceso restringido',
        text: 'Debes iniciar sesión para acceder al panel de administración.',
        confirmButtonText: 'Ir al login',
        timer: 3000,
        timerProgressBar: true
      });
    }
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  };

  const redirectToHome = (): UrlTree => {
    if (typeof window !== 'undefined' && (window as any).Swal) {
      (window as any).Swal.fire({
        icon: 'error',
        title: 'Acceso denegado',
        text: 'No tienes permisos de administrador para acceder a esta sección.',
        confirmButtonText: 'Entendido',
        timer: 3000,
        timerProgressBar: true
      });
    }
    return router.createUrlTree(['/']);
  };

  // Obtener sesión directamente del localStorage (no del BehaviorSubject)
  // Esto es crucial para cuando se refresca la página con F5
  const session = authSession.getSession();

  if (!session) {
    return redirectToLogin();
  }

  // Refrescar token si está por expirar (buffer de 30 segundos)
  const needsRefresh = !authSession.isSessionValid(30000);
  
  if (needsRefresh && session.refresh_token) {
    (window as any).__token_refresh_in_progress__ = true;
    
    return api.refreshAccessToken(session.refresh_token).pipe(
      map((response) => {
        authSession.storeSession(response);
        (window as any).__token_refresh_in_progress__ = false;
        const user = response.usuario;
        return (user && user.rol === 'admin') ? true : redirectToHome();
      }),
      catchError(() => {
        (window as any).__token_refresh_in_progress__ = false;
        return of(redirectToLogin());
      })
    );
  }

  // Token válido, verificar rol
  const user = session.usuario;
  if (user && user.rol === 'admin') {
    authSession.ensureSynchronized();
    return true;
  }

  // Usuario autenticado pero no es admin
  if (user) {
    return redirectToHome();
  }

  return redirectToLogin();
};
