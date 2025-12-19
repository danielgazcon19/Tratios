import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { of, delay } from 'rxjs';

/**
 * Resolver que asegura que la sesión esté completamente inicializada
 * antes de que el componente se active.
 * 
 * Esto resuelve el problema de F5 donde los componentes se cargan
 * antes de que el interceptor tenga acceso al token.
 */
export const authResolver: ResolveFn<boolean> = (route, state) => {
  const authSession = inject(AuthSessionService);
  
  // Forzar sincronización con localStorage
  authSession.ensureSynchronized();
  
  // Pequeño delay para asegurar que el interceptor esté listo
  return of(true).pipe(delay(50));
};
