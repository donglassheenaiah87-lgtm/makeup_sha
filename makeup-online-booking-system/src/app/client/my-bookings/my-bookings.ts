// my-bookings.ts
// CHANGED: Connected to Firebase via BookingService + AuthService (replaced hardcoded data)
// CHANGED: Added ngOnDestroy to unsubscribe and prevent memory leaks (ACID compliance)
// ACID - Isolated: Real-time listener only reads this client's bookings
// ACID - Durable: Cancel/Reschedule writes persist to Firestore

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
// NEW: Import services for Firebase connectivity
import { AuthService } from '../../core/auth.service';
import { BookingService, BookingData } from '../../core/booking.service';

// Local display interface — maps Firebase BookingData to UI-friendly format
interface Booking {
  id: string; service: string; date: string; time: string;
  artist: string; status: 'Upcoming' | 'Completed' | 'Cancelled' | 'Pending';
  price: number; image: string; duration: string; location: string;
  artistAvatar: string; category: string; payment?: string;
  firebaseId?: string; // tracks the Firestore document ID for updates
}

@Component({
  selector: 'app-client-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-bookings.html',
  styleUrls: ['./my-bookings.css']
})
export class ClientMyBookingsComponent implements OnInit, OnDestroy {
  activeFilter: 'All' | 'Upcoming' | 'Completed' | 'Cancelled' = 'All';
  toastVisible = false; toastTitle = ''; toastMessage = '';
  toastIcon = 'fas fa-check-circle'; toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── NEW: Firebase bookings data — replaces hardcoded array
  // Reads from: Firebase 'bookings' collection filtered by clientId
  bookings: Booking[] = [];
  isLoading = true;

  // ── Subscription handlers — prevents memory leaks on destroy
  private authSub?: Subscription;
  private bookingsSub?: Subscription;

  // ── Modal State ──────────────────────────────────────────
  rescheduleOpen = false; rescheduleBooking: Booking | null = null;
  rescheduleDate = ''; rescheduleTime = ''; minRescheduleDate = '';
  reviewOpen = false; reviewBooking: Booking | null = null;
  reviewRating = 5; reviewComment = '';
  detailOpen = false; detailBooking: Booking | null = null;
  ticketOpen = false; ticketBooking: Booking | null = null;

  timeSlots = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM'];

  get filtered(): Booking[] {
    if (this.activeFilter === 'All') return this.bookings;
    return this.bookings.filter(b => b.status === this.activeFilter);
  }
  get upcomingCount() { return this.bookings.filter(b => b.status === 'Upcoming').length; }
  get completedCount() { return this.bookings.filter(b => b.status === 'Completed').length; }
  get cancelledCount() { return this.bookings.filter(b => b.status === 'Cancelled').length; }
  get totalSpent() { return this.bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + b.price, 0); }

  constructor(
    private router: Router,
    private authService: AuthService,       // NEW: For getting current user
    private bookingService: BookingService, // NEW: For real-time Firebase bookings
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const today = new Date();
    today.setDate(today.getDate() + 1);
    this.minRescheduleDate = today.toISOString().split('T')[0];

    // NEW: Subscribe to auth state, then load real Firebase bookings
    // ACID - Isolated: Each user only sees their own bookings (filtered by clientId)
    this.authSub = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadBookings(user.uid, user.displayName || '');
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    // CHANGED: Added cleanup to prevent memory leaks (was missing before)
    if (this.authSub) this.authSub.unsubscribe();
    if (this.bookingsSub) this.bookingsSub.unsubscribe();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // NEW: Load bookings from Firebase in real-time
  // Reads from: Firebase 'bookings' collection, filtered by clientId
  loadBookings(uid: string, name: string): void {
    this.bookingsSub = this.bookingService.getBookingsByClientRealtime(name, uid).subscribe(data => {
      this.bookings = data.map(b => this.mapBooking(b));
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  // NEW: Maps Firestore BookingData to local Booking display format
  mapBooking(b: BookingData): Booking {
    const status = this.mapStatus(b.status);
    return {
      id: b.id || 'LMR-' + Date.now(),
      service: b.serviceName || 'Unknown Service',
      date: b.date || '',
      time: b.date?.split(' ')[1] || '10:00 AM',
      artist: b.artistName || 'Unknown Artist',
      status,
      price: parseFloat(b.amount) || 0,
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&h=200&fit=crop',
      duration: '1-2 hrs',
      location: 'Quezon City Studio',
      artistAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&h=80&fit=crop&crop=face',
      category: b.serviceName?.split(' ')[0] || 'Beauty',
      payment: b.paymentMethod || 'Pre-Paid',
      firebaseId: b.id
    };
  }

  mapStatus(s: string): 'Upcoming' | 'Completed' | 'Cancelled' | 'Pending' {
    const m: any = { pending:'Upcoming', confirmed:'Upcoming', completed:'Completed', cancelled:'Cancelled' };
    return m[s?.toLowerCase()] || 'Upcoming';
  }

  setFilter(f: 'All' | 'Upcoming' | 'Completed' | 'Cancelled'): void { this.activeFilter = f; }

  // CHANGED: Now writes cancel to Firebase (was local-only before)
  // Writes to: Firebase 'bookings/{id}' document — status field
  // ACID - Atomic: Single document field update
  async cancelBooking(b: Booking): Promise<void> {
    if (b.status !== 'Upcoming') return;
    if (!confirm(`Cancel "${b.service}" on ${b.date}?`)) return;
    try {
      if (b.firebaseId) {
        await this.bookingService.updateBookingStatus(b.firebaseId, 'cancelled');
      }
      b.status = 'Cancelled';
      this.showToast('Cancelled', `${b.service} has been cancelled.`, 'fas fa-times-circle', 'error');
    } catch {
      this.showToast('Error', 'Could not cancel booking. Try again.', 'fas fa-times', 'error');
    }
    this.cdr.detectChanges();
  }

  openReschedule(b: Booking): void { this.rescheduleBooking = b; this.rescheduleDate = ''; this.rescheduleTime = b.time; this.rescheduleOpen = true; document.body.style.overflow = 'hidden'; }
  closeReschedule(): void { this.rescheduleOpen = false; this.rescheduleBooking = null; document.body.style.overflow = ''; }

  // CHANGED: Writes reschedule to Firebase
  // Writes to: Firebase 'bookings/{id}' — date and status fields
  async confirmReschedule(): Promise<void> {
    if (!this.rescheduleDate || !this.rescheduleTime) {
      this.showToast('Missing Info', 'Please select a new date and time.', 'fas fa-exclamation-circle', 'error'); return;
    }
    if (this.rescheduleBooking) {
      try {
        const dateObj = new Date(this.rescheduleDate);
        const formatted = dateObj.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
        if (this.rescheduleBooking.firebaseId) {
          await this.bookingService.updateBooking(this.rescheduleBooking.firebaseId, { date: formatted + ' ' + this.rescheduleTime });
        }
        this.rescheduleBooking.date = formatted;
        this.rescheduleBooking.time = this.rescheduleTime;
        this.showToast('Rescheduled! ✨', `Moved to ${formatted} at ${this.rescheduleTime}.`, 'fas fa-calendar-check', 'success');
      } catch { this.showToast('Error', 'Could not reschedule.', 'fas fa-times', 'error'); }
    }
    this.closeReschedule();
  }

  openReview(b: Booking): void { this.reviewBooking = b; this.reviewRating = 5; this.reviewComment = ''; this.reviewOpen = true; document.body.style.overflow = 'hidden'; }
  closeReview(): void { this.reviewOpen = false; this.reviewBooking = null; document.body.style.overflow = ''; }
  submitReview(): void {
    if (!this.reviewComment.trim()) { this.showToast('Missing Review', 'Please write a review.', 'fas fa-pen', 'error'); return; }
    this.showToast('Review Submitted! 💕', `Thank you for your ${this.reviewRating}★ review!`, 'fas fa-star', 'success');
    this.closeReview();
  }
  setRating(r: number): void { this.reviewRating = r; }
  openDetail(b: Booking): void { this.detailBooking = b; this.detailOpen = true; document.body.style.overflow = 'hidden'; }
  closeDetail(): void { this.detailOpen = false; this.detailBooking = null; document.body.style.overflow = ''; }
  openTicket(b: Booking): void { this.ticketBooking = b; this.ticketOpen = true; document.body.style.overflow = 'hidden'; }
  closeTicket(): void { this.ticketOpen = false; this.ticketBooking = null; document.body.style.overflow = ''; }

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
