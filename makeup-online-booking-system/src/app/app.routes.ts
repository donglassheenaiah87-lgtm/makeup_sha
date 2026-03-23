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