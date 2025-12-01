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

  // Si hay sesión válida, verificar rol
  if (session && authSession.isSessionValid()) {
    const user = session.usuario;
    if (user && user.rol === 'admin') {
      // Asegurar que el BehaviorSubject esté sincronizado
      authSession.ensureSynchronized();
      return true;
    }
    // Usuario autenticado pero no es admin
    return redirectToHome();
  }

  // Si hay refresh token, intentar renovar
  const refreshToken = session?.refresh_token;
  if (refreshToken) {
    return api.refreshAccessToken(refreshToken).pipe(
      map((response) => {
        authSession.storeSession(response);
        const user = response.usuario;
        if (user && user.rol === 'admin') {
          return true;
        }
        return redirectToHome();
      }),
      catchError(() => of(redirectToLogin()))
    );
  }

  // No hay sesión válida ni refresh token
  return redirectToLogin();
};
