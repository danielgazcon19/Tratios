import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authSession = inject(AuthSessionService);
  const router = inject(Router);
  
  const user = authSession.getCurrentUser();
  
  if (!user) {
    // No hay usuario autenticado, redirigir al login con mensaje
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
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  if (user.rol !== 'admin') {
    // Usuario no es admin, redirigir al inicio con mensaje
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
    router.navigate(['/']);
    return false;
  }
  
  return true;
};
