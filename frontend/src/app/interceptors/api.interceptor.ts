import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthSessionService } from '../services/auth-session.service';

let redirectingToLogin = false;

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authSession = inject(AuthSessionService);
  let token: string | null = null;
  
  // Prefijar base URL en producción si la request es relativa
  let transformedReq = req;
  if (req.url.startsWith('/') && environment.production && environment.apiUrl) {
    transformedReq = req.clone({ url: environment.apiUrl.replace(/\/$/, '') + req.url });
  }

  // Intentar obtener token del localStorage
  try {
    const storedAuth = localStorage.getItem('tratios.auth');
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      if (parsed && typeof parsed === 'object') {
        token = parsed.access_token || parsed.token || null;
        const expiresAt = parsed.expires_at;
        const expiresAtNumber = typeof expiresAt === 'number' ? expiresAt : Number(expiresAt);
        const isExpired =
          token && !Number.isNaN(expiresAtNumber) && expiresAtNumber > 0 && Date.now() > expiresAtNumber;
        if (isExpired) {
          token = null;
          authSession.clearSession();
          if (!redirectingToLogin && !router.url.startsWith('/login')) {
            redirectingToLogin = true;
            queueMicrotask(() => {
              router
                .navigate(['/login'], {
                  queryParams: { sessionExpired: '1' },
                  replaceUrl: true
                })
                .finally(() => {
                  redirectingToLogin = false;
                });
            });
          }
        }
      }
    }

    if (!token) {
      token = localStorage.getItem('access_token');
    }
  } catch (e) {
    // Ignorar si localStorage no está disponible
  }

  // Inyectar Authorization si hay token
  if (token) {
    console.log('🔐 [API Interceptor] Añadiendo token a la petición:', {
      url: req.url,
      method: req.method,
      token: token.substring(0, 20) + '...' // Solo mostrar primeros 20 caracteres
    });
    transformedReq = transformedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    console.warn('⚠️ [API Interceptor] NO HAY TOKEN para:', {
      url: req.url,
      method: req.method,
      storedAuth: !!localStorage.getItem('tratios.auth'),
      accessToken: !!localStorage.getItem('access_token')
    });
  }

  // Manejar errores globalmente
  return next(transformedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Detectar error 401 o respuesta con "Missing Authorization Header"
      const isMissingAuthHeader = error.error && 
        typeof error.error === 'object' && 
        error.error.msg === 'Missing Authorization Header';
      
      const isTokenExpired = error.error && 
        typeof error.error === 'object' && 
        (error.error.msg === 'Token has expired' || error.error.msg?.includes('expired'));

      if (error.status === 401 || isMissingAuthHeader || isTokenExpired) {
        authSession.clearSession();
        const requestUrl = typeof req.url === 'string' ? req.url : '';
        const isRefreshCall = requestUrl.includes('/auth/refresh');
        const isAuthFlowCall = requestUrl.includes('/auth/');
        const shouldSkipRedirect = isAuthFlowCall && !isRefreshCall;
        
        if (!redirectingToLogin && !shouldSkipRedirect && !router.url.startsWith('/login')) {
          redirectingToLogin = true;
          
          // Determinar el mensaje apropiado
          let message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          if (isMissingAuthHeader) {
            message = 'No hay una sesión activa. Por favor, inicia sesión.';
          } else if (isTokenExpired) {
            message = 'Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.';
          }
          
          // Mostrar alerta con SweetAlert2 si está disponible
          if (typeof window !== 'undefined' && (window as any).Swal) {
            (window as any).Swal.fire({
              icon: 'warning',
              title: 'Sesión expirada',
              text: message,
              confirmButtonText: 'Ir al login',
              allowOutsideClick: false,
              allowEscapeKey: false
            }).then(() => {
              router.navigate(['/login'], {
                queryParams: { sessionExpired: '1' },
                replaceUrl: true
              }).finally(() => {
                redirectingToLogin = false;
              });
            });
          } else {
            // Fallback sin SweetAlert2
            queueMicrotask(() => {
              router.navigate(['/login'], {
                queryParams: { sessionExpired: '1' },
                replaceUrl: true
              }).finally(() => {
                redirectingToLogin = false;
              });
            });
          }
        }
        console.error('🔒 Token inválido, expirado o ausente. Requiere re-autenticación.');
      } else if (error.status === 403) {
        console.error('⛔ Acceso denegado a este recurso.');
      } else if (error.status >= 500) {
        console.error('❌ Error del servidor:', error.message);
      }
      return throwError(() => error);
    })
  );
};