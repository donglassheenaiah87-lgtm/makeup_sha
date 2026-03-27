// reviews.ts — Enhanced with sidebar, slide panel, helpful votes, sort
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface Review {
  name: string; quote: string; type: string; avatar: string;
  date: string; rating: number; helpful: number; voted?: boolean;
}

@Component({
  selector: 'app-client-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.css']
})
export class ClientReviewsComponent implements OnInit {
  sidebarCollapsed = false;
  activeFilter = 'All'; sortBy = 'recent'; panelOpen = false;
  toastVisible = false; toastTitle = ''; toastMessage = '';
  toastIcon = 'fas fa-check-circle'; toastType: 'success'|'error' = 'success';
  private toastTimer: any;

  reviewForm = { name: '', service: '', rating: 5, comment: '' };
  filters = ['All', 'Bridal', 'Event', 'Natural', 'Editorial'];
  serviceOptions = ['Bridal Makeup', 'Event Glam', 'Natural Glow', 'Photoshoot Look', 'Debut Glam', 'Korean Soft Look'];

  ratingBars = [
    { label: '5 Stars', pct: 92 },
    { label: '4 Stars', pct: 6 },
    { label: '3 Stars', pct: 2 },
  ];

  reviews: Review[] = [
    { name: 'Sarah L.', type: 'Bridal', date: 'March 2026', rating: 5, helpful: 24, voted: false, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', quote: 'Super nice and long-lasting makeup! I felt like a princess on my wedding day. Absolutely worth every peso!' },
    { name: 'Jessica M.', type: 'Event', date: 'February 2026', rating: 5, helpful: 18, voted: false, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', quote: 'Amazing work! My makeup was perfect for my debut. So many compliments! Will definitely rebook Lumière.' },
    { name: 'Anne R.', type: 'Editorial', date: 'January 2026', rating: 5, helpful: 15, voted: false, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', quote: 'Very professional & so talented. The photoshoot look was flawless on camera. Highly recommended!' },
    { name: 'Camille D.', type: 'Bridal', date: 'December 2025', rating: 5, helpful: 31, voted: false, avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face', quote: 'I cried when I saw myself in the mirror — in the best way! Anika is incredibly talented. Thank you Lumière!' },
    { name: 'Trisha V.', type: 'Natural', date: 'November 2025', rating: 5, helpful: 12, voted: false, avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=100&h=100&fit=crop&crop=face', quote: 'Mia understood exactly what I wanted — natural and glowing. My skin has never looked better! Will come back monthly.' },
    { name: 'Dana O.', type: 'Event', date: 'October 2025', rating: 4, helpful: 9, voted: false, avatar: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=100&h=100&fit=crop&crop=face', quote: 'Great experience overall! The glam look lasted all night at the gala. Booking was super easy too.' },
    { name: 'Bea C.', type: 'Editorial', date: 'September 2025', rating: 5, helpful: 22, voted: false, avatar: 'https://images.unsplash.com/photo-1491349174775-aaaefdd81942?w=100&h=100&fit=crop&crop=face', quote: 'Sofia is an ARTIST. The editorial look she created for my portfolio shoot was beyond what I imagined. 10/10!' },
    { name: 'Yna P.', type: 'Bridal', date: 'August 2025', rating: 5, helpful: 17, voted: false, avatar: 'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=100&h=100&fit=crop&crop=face', quote: 'From the trial to the big day, everything was perfect. The airbrushed foundation lasted 14 hours in the heat! Amazing!' },
  ];

  get filtered(): Review[] {
    let list = this.activeFilter === 'All' ? this.reviews : this.reviews.filter(r => r.type === this.activeFilter);
    if (this.sortBy === 'rating') return [...list].sort((a, b) => b.rating - a.rating);
    if (this.sortBy === 'helpful') return [...list].sort((a, b) => b.helpful - a.helpful);
    return list; // recent
  }

  constructor(private router: Router) {}
  ngOnInit() { window.scrollTo(0, 0); }

  setFilter(f: string) { this.activeFilter = f; }
  starsArray(n: number) { return Array(n).fill(0); }

  voteHelpful(r: Review) {
    if (r.voted) { r.helpful--; r.voted = false; }
    else { r.helpful++; r.voted = true; }
  }

  submitReview() {
    if (!this.reviewForm.name || !this.reviewForm.comment) {
      this.showToast('Missing Info', 'Please fill in your name and review.', 'fas fa-exclamation-circle', 'error');
      return;
    }
    const newReview: Review = {
      name: this.reviewForm.name, type: this.reviewForm.service || 'General',
      rating: this.reviewForm.rating, helpful: 0, voted: false,
      quote: this.reviewForm.comment, date: 'March 2026',
      avatar: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=100&h=100&fit=crop&crop=face'
    };
    this.reviews.unshift(newReview);
    this.showToast('Review Submitted! 💕', 'Thank you for sharing your experience!', 'fas fa-heart', 'success');
    this.reviewForm = { name: '', service: '', rating: 5, comment: '' };
    this.panelOpen = false;
  }

  showToast(title: string, msg: string, icon = 'fas fa-check-circle', type: 'success'|'error' = 'success') {
    this.toastTitle = title; this.toastMessage = msg; this.toastIcon = icon; this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3500);
  }

  goBack() { this.router.navigate(['/client/dashboard']); }
  goToDashboard(section: string) { this.router.navigate(['/client/dashboard'], { queryParams: { section } }); }
  goToBook() { this.router.navigate(['/client/dashboard'], { queryParams: { section: 'book' } }); }

  onImgError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
  }
}
