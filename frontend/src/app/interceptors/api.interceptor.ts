import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError, delay, retryWhen, take } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthSessionService } from '../services/auth-session.service';

let redirectingToLogin = false;
let tokenRefreshInProgress = false;

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authSession = inject(AuthSessionService);
  let token: string | null = null;
  
  // Si hay un refresh en progreso y esta request requiere auth, esperar
  const requiresAuth = req.url.includes('/admin') || 
                       req.url.includes('/account') ||
                       req.url.includes('/api');
  
  const refreshInProgress = (window as any).__token_refresh_in_progress__;
  if (refreshInProgress && requiresAuth && !req.url.includes('/auth/refresh')) {
    // Esperar activamente hasta que el refresh termine (máximo 5 segundos)
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 50 * 100ms = 5 segundos máximo
      const checkInterval = setInterval(() => {
        attempts++;
        if (!(window as any).__token_refresh_in_progress__ || attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve(apiInterceptor(req, next));
        }
      }, 100);
    }) as any;
  }
  
  // Prefijar base URL en producción si la request es relativa
  let transformedReq = req;
  if (req.url.startsWith('/') && environment.production && environment.apiUrl) {
    transformedReq = req.clone({ url: environment.apiUrl.replace(/\/$/, '') + req.url });
  }

  // Intentar obtener token del localStorage y verificar validez
  try {
    const storedAuth = localStorage.getItem('tratios.auth');
    
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      if (parsed && typeof parsed === 'object') {
        // Verificar que el token no haya expirado
        const expiresAt = parsed.expires_at;
        const isExpired = expiresAt && Date.now() > expiresAt;
        
        if (isExpired) {
          token = null;
        } else {
          token = parsed.access_token || parsed.token || null;
        }
      }
    }

    // Fallback a access_token directo
    if (!token) {
      token = localStorage.getItem('access_token');
    }
  } catch (e) {
    console.error('[Interceptor] Error al leer localStorage:', e);
  }

  // Inyectar Authorization si hay token
  if (token) {
    transformedReq = transformedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
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
        console.warn('[Interceptor] Error 401 detectado:', {
          status: error.status,
          isMissingAuthHeader,
          isTokenExpired,
          url: req.url
        });
        
        const requestUrl = typeof req.url === 'string' ? req.url : '';
        const isRefreshCall = requestUrl.includes('/auth/refresh');
        const isAuthFlowCall = requestUrl.includes('/auth/');
        const shouldSkipRedirect = isAuthFlowCall && !isRefreshCall;
        
        // NO limpiar la sesión inmediatamente - dejar que el guard maneje el refresh
        // Solo limpiar si es un refresh call que falló
        if (isRefreshCall) {
          console.error('[Interceptor] Refresh token falló, limpiando sesión');
          authSession.clearSession();
        }
        
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
      }
      return throwError(() => error);
    })
  );
};