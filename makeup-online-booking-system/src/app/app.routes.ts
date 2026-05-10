import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'client/homepage', pathMatch: 'full' },

  // ── Shared Login ──
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login').then(m => m.LoginComponent)
  },

  // ── Client ──
  {
    path: 'client/homepage',
    loadComponent: () =>
      import('./client/homepage/homepage').then(m => m.HomepageComponent)
  },
  {
    path: 'client/register',
    loadComponent: () =>
      import('./client/clientregister/clientregister').then(m => m.ClientRegisterComponent)
  },

  {
    path: 'client/services',
    loadComponent: () =>
      import('./client/services/services').then(m => m.Services)
  },
  {
    path: 'client/artists',
    loadComponent: () =>
      import('./client/artists/artists').then(m => m.Artists)
  },
  {
    path: 'client/portfolio',
    loadComponent: () =>
      import('./client/portfolio/portfolio').then(m => m.Portfolio)
  },
  // {
  //   path: 'client/reviews',
  //   loadComponent: () =>
  //     import('./client/reviews/reviews').then(m => m.ClientReviewsComponent)
  // },
  // {
  //   path: 'client/my-bookings',
  //   canActivate: [authGuard],
  //   loadComponent: () =>
  //     import('./client/my-bookings/my-bookings').then(m => m.ClientMyBookingsComponent)
  // },
  {
    path: 'client/profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./client/profile/profile').then(m => m.Profile)
  },

  // ── Artist ──
  {
    path: 'artist/register',
    loadComponent: () =>
      import('./artist/artistregister/artistregister').then(m => m.ArtistRegisterComponent)
  },
  {
    path: 'artist/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./artist/dashboard/dashboard').then(m => m.ArtistDashboardComponent)
  },

  // ── Admin ──
  {
    path: 'admin/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/admindashboard/admindashboard').then(m => m.AdminDashboardComponent)
  },
];