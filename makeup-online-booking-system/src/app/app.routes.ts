import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'client/login', pathMatch: 'full' },

  // ── Client ──
  {
    path: 'client/login',
    loadComponent: () =>
      import('./client/login/login').then(m => m.ClientLoginComponent)
  },
  {
    path: 'client/register',
    loadComponent: () =>
      import('./client/clientregister/clientregister').then(m => m.ClientRegisterComponent)
  },
  {
    path: 'client/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./client/dashboard/dashboard').then(m => m.ClientDashboardComponent)
  },
  {
    path: 'client/services',
    loadComponent: () =>
      import('./client/services/services').then(m => m.ClientServicesComponent)
  },
  {
    path: 'client/artists',
    loadComponent: () =>
      import('./client/artists/artists').then(m => m.ClientArtistsComponent)
  },
  {
    path: 'client/portfolio',
    loadComponent: () =>
      import('./client/portfolio/portfolio').then(m => m.ClientPortfolioComponent)
  },
  {
    path: 'client/reviews',
    loadComponent: () =>
      import('./client/reviews/reviews').then(m => m.ClientReviewsComponent)
  },
  {
    path: 'client/my-bookings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./client/my-bookings/my-bookings').then(m => m.ClientMyBookingsComponent)
  },

  // ── Artist ──
  {
    path: 'artist/login',
    loadComponent: () =>
      import('./artist/login/login').then(m => m.ArtistLoginComponent)
  },
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
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/login/login').then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin/dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./admin/admindashboard/admindashboard').then(m => m.AdminDashboardComponent)
  },
];