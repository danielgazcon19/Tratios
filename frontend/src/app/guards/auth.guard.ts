import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { ApiService } from '../services/api.service';
import { catchError, map, of, switchMap } from 'rxjs';

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

  if (session && authSession.isSessionValid()) {
    return true;
  }

  const refreshToken = session?.refresh_token;
  if (refreshToken) {
    return api.refreshAccessToken(refreshToken).pipe(
      map((response) => {
        authSession.storeSession(response);
        return true;
      }),
      catchError(() => of(redirectToLogin()))
    );
  }

  return redirectToLogin();
};
