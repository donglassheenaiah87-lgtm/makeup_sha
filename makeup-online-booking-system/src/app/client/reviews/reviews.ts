// client/reviews/reviews.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Review { name: string; quote: string; type: string; avatar: string; date: string; rating: number; }

@Component({
  selector: 'app-client-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.html',
  styleUrls: ['./reviews.css']
})
export class ClientReviewsComponent implements OnInit {
  activeFilter = 'All';
  toastVisible = false;
  toastTitle = '';
  toastMessage = '';
  toastIcon = 'fas fa-check-circle';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // Write a review form
  reviewForm = { name: '', service: '', rating: 5, comment: '' };
  showForm = false;

  filters = ['All', 'Bridal', 'Event', 'Natural', 'Editorial'];

  ratingBars = [
    { label: '5★', pct: 92, count: 92 },
    { label: '4★', pct: 6, count: 6 },
    { label: '3★', pct: 2, count: 2 },
  ];

  reviews: Review[] = [
    {
      name: 'Sarah L.', type: 'Bridal', date: 'March 2026', rating: 5,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      quote: 'Super nice and long-lasting makeup! I felt like a princess on my wedding day. Absolutely worth every peso!'
    },
    {
      name: 'Jessica M.', type: 'Event', date: 'February 2026', rating: 5,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      quote: 'Amazing work! My makeup was perfect for my debut. So many compliments! Will definitely rebook Lumière.'
    },
    {
      name: 'Anne R.', type: 'Editorial', date: 'January 2026', rating: 5,
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
      quote: 'Very professional & so talented. The photoshoot look was flawless on camera. Highly recommended!'
    },
    {
      name: 'Camille D.', type: 'Bridal', date: 'December 2025', rating: 5,
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face',
      quote: 'I cried when I saw myself in the mirror — in the best way! Anika is incredibly talented. Thank you Lumière!'
    },
    {
      name: 'Trisha V.', type: 'Natural', date: 'November 2025', rating: 5,
      avatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=100&h=100&fit=crop&crop=face',
      quote: 'Mia understood exactly what I wanted — natural and glowing. My skin has never looked better! Will come back monthly.'
    },
    {
      name: 'Dana O.', type: 'Event', date: 'October 2025', rating: 4,
      avatar: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=100&h=100&fit=crop&crop=face',
      quote: 'Great experience overall! The glam look lasted all night at the gala. Booking was super easy too.'
    },
    {
      name: 'Bea C.', type: 'Editorial', date: 'September 2025', rating: 5,
      avatar: 'https://images.unsplash.com/photo-1491349174775-aaaefdd81942?w=100&h=100&fit=crop&crop=face',
      quote: 'Sofia is an ARTIST. The editorial look she created for my portfolio shoot was beyond what I imagined. 10/10!'
    },
    {
      name: 'Yna P.', type: 'Bridal', date: 'August 2025', rating: 5,
      avatar: 'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=100&h=100&fit=crop&crop=face',
      quote: 'From the trial to the big day, everything was perfect. The airbrushed foundation lasted 14 hours in the heat! Amazing!'
    },
  ];

  get filtered(): Review[] {
    return this.activeFilter === 'All' ? this.reviews : this.reviews.filter(r => r.type === this.activeFilter);
  }

  constructor(private router: Router) {}

  ngOnInit(): void { window.scrollTo(0, 0); }

  setFilter(f: string): void { this.activeFilter = f; }

  starsArray(n: number): number[] { return Array(n).fill(0); }

  submitReview(): void {
    if (!this.reviewForm.name || !this.reviewForm.comment) {
      this.showToast('Missing Info', 'Please fill in your name and review.', 'fas fa-exclamation-circle', 'error');
      return;
    }
    this.showToast('Review Submitted! 💕', 'Thank you for sharing your experience!', 'fas fa-heart', 'success');
    this.reviewForm = { name: '', service: '', rating: 5, comment: '' };
    this.showForm = false;
  }

  showToast(title: string, msg: string, icon = 'fas fa-check-circle', type: 'success' | 'error' = 'success'): void {
    this.toastTitle = title; this.toastMessage = msg; this.toastIcon = icon; this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3500);
  }

  goBack(): void { this.router.navigate(['/client/dashboard']); }

  onImgError(e: Event): void {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
  }
}
