// portfolio.ts — Enhanced with sidebar, favorites, keyboard lightbox
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

interface PortfolioImage { url: string; label: string; tag: string; artist: string; favorited?: boolean; }

@Component({
  selector: 'app-client-portfolio',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './portfolio.html',
  styleUrls: ['./portfolio.css']
})
export class ClientPortfolioComponent implements OnInit {
  sidebarCollapsed = false;
  activeTab = 'all'; lbOpen = false; lbIdx = 0;
  favoriteCount = 0;

  tabs = [
    { key: 'all', label: 'All', icon: 'fas fa-th' },
    { key: 'bridal', label: 'Bridal', icon: 'fas fa-ring' },
    { key: 'glam', label: 'Glam', icon: 'fas fa-star' },
    { key: 'natural', label: 'Natural', icon: 'fas fa-leaf' },
    { key: 'editorial', label: 'Editorial', icon: 'fas fa-camera' },
  ];

  allImages: PortfolioImage[] = [
    { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&h=600&fit=crop&crop=face', label: 'Bridal Glow', tag: 'bridal', artist: 'Anika Reyes' },
    { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&h=500&fit=crop&crop=face', label: 'Event Glam', tag: 'glam', artist: 'Leila Torres' },
    { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=600&fit=crop&crop=face', label: 'Natural Look', tag: 'natural', artist: 'Mia Santos' },
    { url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=500&h=500&fit=crop&crop=face', label: 'Editorial', tag: 'editorial', artist: 'Sofia Cruz' },
    { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&h=600&fit=crop&crop=face', label: 'Photoshoot', tag: 'editorial', artist: 'Cara Lim' },
    { url: 'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?w=500&h=500&fit=crop&crop=face', label: 'Bridal Party', tag: 'bridal', artist: 'Anika Reyes' },
    { url: 'https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=500&h=600&fit=crop&crop=face', label: 'Soft Glam', tag: 'natural', artist: 'Mia Santos' },
    { url: 'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=500&h=500&fit=crop&crop=face', label: 'Debut Look', tag: 'glam', artist: 'Leila Torres' },
    { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&h=600&fit=crop&crop=face', label: 'Glamour Shot', tag: 'glam', artist: 'Sofia Cruz' },
    { url: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=500&h=500&fit=crop&crop=face', label: 'Fashion Look', tag: 'editorial', artist: 'Sofia Cruz' },
    { url: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=500&h=600&fit=crop&crop=face', label: 'Fresh Bride', tag: 'bridal', artist: 'Anika Reyes' },
    { url: 'https://images.unsplash.com/photo-1491349174775-aaaefdd81942?w=500&h=500&fit=crop&crop=face', label: 'Nude Look', tag: 'natural', artist: 'Mia Santos' },
    { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&h=600&fit=crop&crop=face', label: 'Bold Glam', tag: 'glam', artist: 'Ria Mendoza' },
    { url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&h=500&fit=crop&crop=face', label: 'K-Beauty', tag: 'natural', artist: 'Cara Lim' },
    { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=600&fit=crop&crop=face', label: 'Bridal Glam', tag: 'bridal', artist: 'Leila Torres' },
    { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop&crop=face', label: 'Editorial Dark', tag: 'editorial', artist: 'Ria Mendoza' },
  ];

  get filtered(): PortfolioImage[] {
    return this.activeTab === 'all' ? this.allImages : this.allImages.filter(p => p.tag === this.activeTab);
  }
  get tabCount(): Record<string,number> {
    const c: Record<string,number> = { all: this.allImages.length };
    this.tabs.slice(1).forEach(t => c[t.key] = this.allImages.filter(p => p.tag === t.key).length);
    return c;
  }

  constructor(private router: Router) {}
  ngOnInit() { window.scrollTo(0, 0); }

  setTab(tab: string) { this.activeTab = tab; this.lbOpen = false; }

  toggleFavorite(p: PortfolioImage, e: Event) {
    e.stopPropagation();
    p.favorited = !p.favorited;
    this.favoriteCount = this.allImages.filter(x => x.favorited).length;
  }

  openLightbox(i: number) { this.lbIdx = i; this.lbOpen = true; document.body.style.overflow = 'hidden'; }
  closeLightbox() { this.lbOpen = false; document.body.style.overflow = ''; }
  prevLb() { this.lbIdx = (this.lbIdx - 1 + this.filtered.length) % this.filtered.length; }
  nextLb() { this.lbIdx = (this.lbIdx + 1) % this.filtered.length; }

  @HostListener('document:keydown.escape') onEsc() { this.closeLightbox(); }
  @HostListener('document:keydown.arrowleft') onLeft() { if (this.lbOpen) this.prevLb(); }
  @HostListener('document:keydown.arrowright') onRight() { if (this.lbOpen) this.nextLb(); }

  goBack() { this.router.navigate(['/client/dashboard']); }
  goToBook() { this.router.navigate(['/client/dashboard'], { queryParams: { section: 'book' } }); }
  goToDashboard(section: string) { this.router.navigate(['/client/dashboard'], { queryParams: { section } }); }

  onImgError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
  }
}
