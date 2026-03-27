import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged } from 'firebase/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth   = inject(Auth);
  const router = inject(Router);

  // ── Allow guest access to client dashboard only ──
  const isGuest = sessionStorage.getItem('guestMode') === 'true';
  if (isGuest && state.url.startsWith('/client/dashboard')) {
    return true;
  }

  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(true);
      } else {
        // Redirect to the unified login page
        router.navigate(['/login']);
        resolve(false);
      }
    });
  });
};