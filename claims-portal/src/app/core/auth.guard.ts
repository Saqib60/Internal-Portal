import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isSignedIn() ? true : inject(Router).createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isSignedIn() ? inject(Router).createUrlTree(['/dashboard']) : true;
};

/** The MFA screen is only reachable after a username/password (or reset) step. */
export const pendingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.pending ? true : inject(Router).createUrlTree(['/login']);
};
