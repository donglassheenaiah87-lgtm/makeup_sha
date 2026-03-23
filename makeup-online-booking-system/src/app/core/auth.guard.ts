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
        // Redirect to the correct login page based on the route
        if (state.url.startsWith('/artist')) {
          router.navigate(['/artist/login']);
        } else if (state.url.startsWith('/admin')) {
          router.navigate(['/admin/login']);
        } else {
          router.navigate(['/client/login']);
        }
        resolve(false);
      }
    });
  });
};