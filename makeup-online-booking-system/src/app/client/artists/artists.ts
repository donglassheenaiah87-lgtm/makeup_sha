// artists.ts — Enhanced with sidebar, artist modal, sort, filter icons
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../../core/user.service';
import { Subscription } from 'rxjs';

interface Artist {
  name: string; firstName: string; role: string; image: string;
  rating: string; exp: string; clients: number; specialties: string[];
  bio: string; instagram: string; bookings: number; available?: boolean;
}

@Component({
  selector: 'app-client-artists',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './artists.html',
  styleUrls: ['./artists.css']
})
export class ClientArtistsComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  searchQuery = ''; activeFilter = 'All'; sortBy = 'default';
  modalOpen = false; selectedArtist: Artist | null = null;
  toastVisible = false; toastTitle = ''; toastMessage = '';
  toastIcon = 'fas fa-check-circle'; toastType: 'success'|'error' = 'success';
  private toastTimer: any;

  filters = ['All', 'Bridal', 'Glam', 'Natural', 'Editorial', 'SFX'];
  filterIcons: Record<string, string> = {
    'All': 'fas fa-th', 'Bridal': 'fas fa-ring', 'Glam': 'fas fa-star',
    'Natural': 'fas fa-leaf', 'Editorial': 'fas fa-camera', 'SFX': 'fas fa-magic'
  };

  private artistSub?: Subscription;
  allArtists: Artist[] = [];

  sortedArtists: Artist[] = [];

  get displayed(): Artist[] {
    const q = this.searchQuery.toLowerCase();
    return this.sortedArtists.filter(a => {
      const matchFilter = this.activeFilter === 'All' || a.specialties.includes(this.activeFilter);
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.specialties.some(s => s.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }

  constructor(private router: Router, private userService: UserService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.artistSub = this.userService.getAllUsersRealtime().subscribe({
      next: (allUsers) => {
        console.log('Artists Page Data - Total Users:', allUsers.length);
        const artistUsers = allUsers.filter(u => u.role?.toLowerCase() === 'artist');
        console.log('Artists Page Data - Found Artists:', artistUsers.length);
        this.allArtists = artistUsers.map(u => {
        let sp = Array.isArray(u.services) ? u.services.map((s:any) => s.name).filter((n:any) => !!n) : [];
        if (sp.length === 0) sp = [u.specialty || 'General'];
        
        return {
          name: u.name || 'Artist',
          firstName: u.firstName || u.name?.split(' ')[0] || 'Artist',
          role: u.specialty || 'Professional Makeup Artist',
          image: u.profilePicture || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=460&fit=crop&crop=face',
          rating: Number(u.rating || 0).toFixed(1),
          exp: '5 yrs',
          clients: Number(u.ratingCount || 0),
          specialties: sp,
          bio: u.bio || 'Experienced makeup artist dedicated to making you look your best.',
          instagram: u.social || '',
          bookings: 0,
          available: true
        };
      });
      this.sortedArtists = [...this.allArtists];
      this.applySorting();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching artists:', error);
        this.showToast('Fetch Error', 'Could not load artists list.', 'fas fa-exclamation-triangle', 'error');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.artistSub) this.artistSub.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    document.body.style.overflow = '';
  }

  setFilter(f: string) { this.activeFilter = f; }

  applySorting() {
    this.sortedArtists = [...this.allArtists].sort((a, b) => {
      if (this.sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating);
      if (this.sortBy === 'exp') return parseInt(b.exp) - parseInt(a.exp);
      if (this.sortBy === 'bookings') return b.bookings - a.bookings;
      return 0;
    });
  }

  openModal(a: Artist) { this.selectedArtist = a; this.modalOpen = true; document.body.style.overflow = 'hidden'; }
  closeModal() { this.modalOpen = false; this.selectedArtist = null; document.body.style.overflow = ''; }

  showToast(title: string, msg: string, icon = 'fas fa-check-circle', type: 'success'|'error' = 'success') {
    this.toastTitle = title; this.toastMessage = msg; this.toastIcon = icon; this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3500);
  }

  goBack() { this.router.navigate(['/client/dashboard']); }
  goToBook() { this.router.navigate(['/client/dashboard'], { queryParams: { section: 'book' } }); }
  goToDashboard(section: string) { this.router.navigate(['/client/dashboard'], { queryParams: { section } }); }

  onImgError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
  }
}
