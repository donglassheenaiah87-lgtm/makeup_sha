// client/my-bookings/my-bookings.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Booking {
  id: string; service: string; date: string; time: string;
  artist: string; status: 'Upcoming' | 'Completed' | 'Cancelled';
  price: number; image: string; duration: string; location: string;
  artistAvatar: string; category: string; payment?: string;
}

@Component({
  selector: 'app-client-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-bookings.html',
  styleUrls: ['./my-bookings.css']
})
export class ClientMyBookingsComponent implements OnInit {
  activeFilter: 'All' | 'Upcoming' | 'Completed' | 'Cancelled' = 'All';
  toastVisible = false;
  toastTitle = '';
  toastMessage = '';
  toastIcon = 'fas fa-check-circle';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── Reschedule Modal ─────────────────────────────────────
  rescheduleOpen = false;
  rescheduleBooking: Booking | null = null;
  rescheduleDate = '';
  rescheduleTime = '';
  minRescheduleDate = '';

  // ── Review Modal ─────────────────────────────────────────
  reviewOpen = false;
  reviewBooking: Booking | null = null;
  reviewRating = 5;
  reviewComment = '';

  // ── View Details Modal ──────────────────────────────────
  detailOpen = false;
  detailBooking: Booking | null = null;
  
  // ── Digital Ticket Modal ────────────────────────────────
  ticketOpen = false;
  ticketBooking: Booking | null = null;

  timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  bookings: Booking[] = [
    {
      id: 'LMR-2026-001', service: 'Bridal Makeup', date: 'Mar 15, 2026', time: '9:00 AM',
      artist: 'Anika Reyes', status: 'Upcoming', price: 4500,
      duration: '2–3 hrs', location: 'Quezon City Studio', category: 'Bridal',
      artistAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&h=200&fit=crop&crop=face'
    },
    {
      id: 'LMR-2026-002', service: 'Event Glam', date: 'Feb 20, 2026', time: '2:00 PM',
      artist: 'Leila Torres', status: 'Completed', price: 2200,
      duration: '1–2 hrs', location: 'Quezon City Studio', category: 'Event',
      artistAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&h=200&fit=crop&crop=face'
    },
    {
      id: 'LMR-2025-089', service: 'Natural Glow', date: 'Nov 12, 2025', time: '11:00 AM',
      artist: 'Mia Santos', status: 'Completed', price: 1800,
      duration: '1 hr', location: 'Client Location', category: 'Natural',
      artistAvatar: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=80&h=80&fit=crop&crop=face',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop&crop=face'
    },
    {
      id: 'LMR-2025-065', service: 'Photoshoot Look', date: 'Sep 5, 2025', time: '1:00 PM',
      artist: 'Sofia Cruz', status: 'Cancelled', price: 2500,
      duration: '1.5–2 hrs', location: 'Quezon City Studio', category: 'Editorial',
      artistAvatar: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&h=80&fit=crop&crop=face',
      image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=200&h=200&fit=crop&crop=face'
    },
  ];

  get filtered(): Booking[] {
    return this.activeFilter === 'All' ? this.bookings : this.bookings.filter(b => b.status === this.activeFilter);
  }

  get upcomingCount(): number { return this.bookings.filter(b => b.status === 'Upcoming').length; }
  get completedCount(): number { return this.bookings.filter(b => b.status === 'Completed').length; }
  get cancelledCount(): number { return this.bookings.filter(b => b.status === 'Cancelled').length; }
  get totalSpent(): number { return this.bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + b.price, 0); }

  constructor(private router: Router) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const today = new Date();
    today.setDate(today.getDate() + 1);
    this.minRescheduleDate = today.toISOString().split('T')[0];
  }

  setFilter(f: 'All' | 'Upcoming' | 'Completed' | 'Cancelled'): void { this.activeFilter = f; }

  cancelBooking(b: Booking): void {
    if (b.status !== 'Upcoming') return;
    if (!confirm(`Cancel "${b.service}" on ${b.date}?`)) return;
    b.status = 'Cancelled';
    this.showToast('Booking Cancelled', `${b.service} on ${b.date} has been cancelled.`, 'fas fa-times-circle', 'error');
  }

  // ── Reschedule ─────────────────────────────────────────
  openReschedule(b: Booking): void {
    this.rescheduleBooking = b;
    this.rescheduleDate = '';
    this.rescheduleTime = b.time;
    this.rescheduleOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeReschedule(): void {
    this.rescheduleOpen = false;
    this.rescheduleBooking = null;
    document.body.style.overflow = '';
  }

  confirmReschedule(): void {
    if (!this.rescheduleDate || !this.rescheduleTime) {
      this.showToast('Missing Info', 'Please select a new date and time.', 'fas fa-exclamation-circle', 'error');
      return;
    }
    if (this.rescheduleBooking) {
      const dateObj = new Date(this.rescheduleDate);
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      this.rescheduleBooking.date = dateObj.toLocaleDateString('en-US', options);
      this.rescheduleBooking.time = this.rescheduleTime;
      this.showToast('Rescheduled! ✨', `${this.rescheduleBooking.service} moved to ${this.rescheduleBooking.date} at ${this.rescheduleBooking.time}.`, 'fas fa-calendar-check', 'success');
    }
    this.closeReschedule();
  }

  // ── Review ─────────────────────────────────────────────
  openReview(b: Booking): void {
    this.reviewBooking = b;
    this.reviewRating = 5;
    this.reviewComment = '';
    this.reviewOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeReview(): void {
    this.reviewOpen = false;
    this.reviewBooking = null;
    document.body.style.overflow = '';
  }

  submitReview(): void {
    if (!this.reviewComment.trim()) {
      this.showToast('Missing Review', 'Please write a short review.', 'fas fa-pen', 'error');
      return;
    }
    this.showToast('Review Submitted! 💕', `Thank you for your ${this.reviewRating}★ review!`, 'fas fa-star', 'success');
    this.closeReview();
  }

  setRating(r: number): void { this.reviewRating = r; }

  // ── View Details ────────────────────────────────────────
  openDetail(b: Booking): void {
    this.detailBooking = b;
    this.detailOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.detailBooking = null;
    document.body.style.overflow = '';
  }

  // ── Digital Ticket ────────────────────────────────────────
  openTicket(b: Booking): void {
    this.ticketBooking = b;
    this.ticketOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeTicket(): void {
    this.ticketOpen = false;
    this.ticketBooking = null;
    document.body.style.overflow = '';
  }

  showToast(title: string, msg: string, icon = 'fas fa-check-circle', type: 'success' | 'error' = 'success'): void {
    this.toastTitle = title; this.toastMessage = msg; this.toastIcon = icon; this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3500);
  }

  goBack(): void { this.router.navigate(['/client/dashboard']); }
  goToBook(): void { this.router.navigate(['/client/dashboard']); }

  onImgError(e: Event): void {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
  }
}
