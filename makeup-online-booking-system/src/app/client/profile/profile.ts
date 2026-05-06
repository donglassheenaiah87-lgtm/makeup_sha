// profile.ts — Client Profile Component
// CHANGED: Added tab system (Profile Info, My Reviews, Community Reviews)
// CHANGED: Added Reviews feature — reads from Firebase 'reviews' collection
// CHANGED: Added Favorites feature — reads/writes from Firebase 'users' collection
// ACID Strategy: All writes use try/catch. UI only updates after Firebase confirms success.
// Every write is a single-document atomic Firestore operation.

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { UserService, UserData } from '../../core/user.service';
import { BookingService } from '../../core/booking.service';
// NEW: Import ReviewService and Review interface for the Reviews tabs
import { ReviewService, Review } from '../../core/review.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  // ── IMPORTANT: User Data Object ──
  // Reads from: Firebase 'users' collection via AuthService + UserService
  currentUser: UserData | null = null;

  // ── UI State ──
  isEditing = false;
  isSaving = false;

  // NEW: Tab system — controls which tab is currently visible
  // Tabs: 'info' | 'my-reviews' | 'community'
  activeTab: 'info' | 'my-reviews' | 'community' = 'info';

  // ── Profile Form Data ──
  // ACID - Isolated: We copy data into editData so the live currentUser object
  // is NOT mutated until the user explicitly saves (prevents dirty reads).
  editData: any = {};

  // ── Booking Summary ──
  // Reads from: Firebase 'bookings' collection, filtered by clientId
  totalBookings = 0;
  upcomingBooking: any = null;
  lastService: any = null;

  // ── Inspiration Board ──
  // Stored in: Firebase 'users/{uid}.inspirations' as base64 strings
  inspirations: string[] = [];

  // ── NEW: Reviews ──
  // myReviews: Reviews THIS client has written — reads from Firebase 'reviews' collection
  // allReviews: All platform reviews — reads from Firebase 'reviews' collection
  myReviews: Review[] = [];
  allReviews: Review[] = [];
  reviewsLoading = true;

  // ── NEW: Favorites ──
  // Reads/Writes: Firebase 'users/{uid}.favoriteArtists' and 'users/{uid}.favoriteServices'
  // Using arrayUnion/arrayRemove for atomic, ACID-safe array operations
  favoriteArtists: string[] = [];
  favoriteServices: string[] = [];

  // NEW: Input fields for adding new favorites
  newFavoriteArtist = '';
  newFavoriteService = '';

  // ── Subscription Handlers ──
  // Why: Prevents memory leaks by tracking all real-time Firebase subscriptions
  private authSub?: Subscription;
  private bookingsSub?: Subscription;
  private myReviewsSub?: Subscription;    // NEW: Subscription for client's own reviews
  private allReviewsSub?: Subscription;   // NEW: Subscription for all community reviews

  // ── Toast / Alert State ──
  toastVisible = false;
  toastTitle = '';
  toastMessage = '';
  toastIcon = 'fas fa-check-circle';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private bookingService: BookingService,
    private reviewService: ReviewService,  // NEW: Injected ReviewService
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // ── IMPORTANT: Authentication Sync ──
    // Why: We need to know who is logged in before fetching their profile data.
    // How: AuthService emits the current user on every login/logout event.
    this.authSub = this.authService.currentUser$.subscribe(async (user) => {
      if (user) {
        // Fetch fresh profile data from Firestore
        const data = await this.userService.getUser(user.uid);
        if (data && data.role === 'client') {
          this.currentUser = data;

          // Load inspiration board images from the user's Firestore doc
          this.inspirations = (this.currentUser as any).inspirations || [];

          // NEW: Load favorites from Firebase user doc
          // Reads from: Firebase 'users/{uid}.favoriteArtists' and 'favoriteServices'
          this.favoriteArtists = this.currentUser.favoriteArtists || [];
          this.favoriteServices = this.currentUser.favoriteServices || [];

          // Load bookings summary
          this.loadBookings(user.uid, data.name || '');

          // NEW: Load this client's reviews from Firebase 'reviews' collection
          this.loadMyReviews(user.uid);

          // NEW: Load all community reviews from Firebase 'reviews' collection
          this.loadAllReviews();

          this.cdr.detectChanges();
        } else {
          this.router.navigate(['/login']);
        }
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    // ── IMPORTANT: Cleanup all subscriptions ──
    // Why: Prevents memory leaks when navigating away from this component.
    if (this.authSub) this.authSub.unsubscribe();
    if (this.bookingsSub) this.bookingsSub.unsubscribe();
    if (this.myReviewsSub) this.myReviewsSub.unsubscribe();    // NEW
    if (this.allReviewsSub) this.allReviewsSub.unsubscribe();  // NEW
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  // ── Tab Navigation ──
  // NEW: Switches the active tab. Simple UI state — no Firebase call needed.
  setTab(tab: 'info' | 'my-reviews' | 'community'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // ── Load Bookings ──
  // Reads from: Firebase 'bookings' collection, filtered by clientId
  // Real-time subscription so booking count updates immediately
  loadBookings(uid: string, clientName: string): void {
    this.bookingsSub = this.bookingService.getBookingsByClientRealtime(clientName, uid).subscribe(bookings => {
      this.totalBookings = bookings.length;
      bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (bookings.length > 0) this.lastService = bookings[0];
      this.upcomingBooking = bookings.find(b => b.status === 'pending' || b.status === 'confirmed');
      this.cdr.detectChanges();
    });
  }

  // ── NEW: Load My Reviews ──
  // Reads from: Firebase 'reviews' collection, filtered by clientId == currentUser.uid
  // ACID - Isolated: Query only returns this client's reviews, no other client's data leaks.
  loadMyReviews(uid: string): void {
    this.myReviewsSub = this.reviewService.getReviewsByClientRealtime(uid).subscribe(reviews => {
      this.myReviews = reviews;
      this.reviewsLoading = false;
      this.cdr.detectChanges();
    });
  }

  // ── NEW: Load All Community Reviews ──
  // Reads from: Firebase 'reviews' collection (all documents, public)
  // Why: Clients can see what others are saying before booking an artist.
  loadAllReviews(): void {
    this.allReviewsSub = this.reviewService.getAllReviewsRealtime().subscribe(reviews => {
      this.allReviews = reviews;
      this.cdr.detectChanges();
    });
  }

  // ── Profile Edit Mode ──
  enableEditMode(): void {
    this.isEditing = true;
    // ACID - Isolated: Copy current data into editData. The live currentUser object
    // is NOT touched until the user clicks Save and Firebase confirms the write.
    this.editData = {
      name: this.currentUser?.name || '',
      phone: this.currentUser?.phone || '',
      location: this.currentUser?.location || '',
      favoriteService: this.currentUser?.favoriteService || '',
      skinType: (this.currentUser as any).skinType || '',
      allergies: (this.currentUser as any).allergies || '',
      preferredArtist: (this.currentUser as any).preferredArtist || '',
      preferredSchedule: (this.currentUser as any).preferredSchedule || ''
    };
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editData = {};
  }

  // ── Save Profile ──
  // Writes to: Firebase 'users/{uid}' document
  // ACID - Atomic: Single document write, either fully succeeds or fails.
  // ACID - Consistent: UI only reflects changes after Firestore confirms success.
  // ACID - Durable: Firestore guarantees data persistence on success.
  async saveProfile(): Promise<void> {
    if (!this.currentUser) return;
    this.isSaving = true;
    try {
      await this.userService.updateUser(this.currentUser.uid, this.editData);
      // ACID - Consistent: Update local state ONLY after Firebase confirms success
      this.currentUser = { ...this.currentUser, ...this.editData };
      this.isEditing = false;
      this.showToast('Saved! ✨', 'Your profile has been updated.', 'fas fa-check-circle', 'success');
    } catch (err: any) {
      this.showToast('Error', 'Failed to update profile: ' + err.message, 'fas fa-exclamation-triangle', 'error');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  // ── NEW: Add Favorite Artist ──
  // Writes to: Firebase 'users/{uid}.favoriteArtists' using arrayUnion (atomic, no duplicates)
  // ACID - Atomic: arrayUnion is a single atomic Firestore operation.
  async addFavoriteArtist(): Promise<void> {
    const val = this.newFavoriteArtist.trim();
    if (!val || !this.currentUser) return;
    if (this.favoriteArtists.includes(val)) {
      this.showToast('Already Added', `${val} is already in your favorites.`, 'fas fa-info-circle', 'error');
      return;
    }
    try {
      await this.userService.addToFavorites(this.currentUser.uid, 'favoriteArtists', val);
      // ACID - Consistent: Only update local array after Firebase confirms
      this.favoriteArtists = [...this.favoriteArtists, val];
      this.newFavoriteArtist = '';
      this.showToast('Artist Added! 💕', `${val} added to favorites.`, 'fas fa-heart', 'success');
    } catch {
      this.showToast('Error', 'Could not add to favorites.', 'fas fa-times', 'error');
    }
    this.cdr.detectChanges();
  }

  // ── NEW: Remove Favorite Artist ──
  // Writes to: Firebase 'users/{uid}.favoriteArtists' using arrayRemove (atomic)
  async removeFavoriteArtist(artist: string): Promise<void> {
    if (!this.currentUser) return;
    try {
      await this.userService.removeFromFavorites(this.currentUser.uid, 'favoriteArtists', artist);
      // ACID - Consistent: Only update local array after Firebase confirms removal
      this.favoriteArtists = this.favoriteArtists.filter(a => a !== artist);
      this.showToast('Removed', `${artist} removed from favorites.`, 'fas fa-trash', 'success');
    } catch {
      this.showToast('Error', 'Could not remove from favorites.', 'fas fa-times', 'error');
    }
    this.cdr.detectChanges();
  }

  // ── NEW: Add Favorite Service ──
  // Writes to: Firebase 'users/{uid}.favoriteServices' using arrayUnion
  async addFavoriteService(): Promise<void> {
    const val = this.newFavoriteService.trim();
    if (!val || !this.currentUser) return;
    if (this.favoriteServices.includes(val)) {
      this.showToast('Already Added', `${val} is already saved.`, 'fas fa-info-circle', 'error');
      return;
    }
    try {
      await this.userService.addToFavorites(this.currentUser.uid, 'favoriteServices', val);
      this.favoriteServices = [...this.favoriteServices, val];
      this.newFavoriteService = '';
      this.showToast('Service Saved! ✨', `${val} added to favorites.`, 'fas fa-star', 'success');
    } catch {
      this.showToast('Error', 'Could not add to favorites.', 'fas fa-times', 'error');
    }
    this.cdr.detectChanges();
  }

  // ── NEW: Remove Favorite Service ──
  // Writes to: Firebase 'users/{uid}.favoriteServices' using arrayRemove
  async removeFavoriteService(svc: string): Promise<void> {
    if (!this.currentUser) return;
    try {
      await this.userService.removeFromFavorites(this.currentUser.uid, 'favoriteServices', svc);
      this.favoriteServices = this.favoriteServices.filter(s => s !== svc);
      this.showToast('Removed', `${svc} removed from favorites.`, 'fas fa-trash', 'success');
    } catch {
      this.showToast('Error', 'Could not remove.', 'fas fa-times', 'error');
    }
    this.cdr.detectChanges();
  }

  // ── Image Upload (Base64) ──
  // Writes to: Firebase 'users/{uid}.profilePicture' or 'users/{uid}.inspirations'
  // ACID - Atomic: Each image is stored as a base64 string in a single doc field.
  onFileSelected(event: any, type: 'avatar' | 'inspiration'): void {
    const file: File = event.target.files[0];
    if (!file || !this.currentUser) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      try {
        if (type === 'avatar') {
          // Writes to: Firebase 'users/{uid}.profilePicture'
          await this.userService.updateUser(this.currentUser!.uid, { profilePicture: base64String });
          this.currentUser!.profilePicture = base64String;
          this.showToast('Photo Updated!', 'Your profile picture has been changed.', 'fas fa-camera', 'success');
        } else {
          // Writes to: Firebase 'users/{uid}.inspirations' array
          this.inspirations.push(base64String);
          await this.userService.updateUser(this.currentUser!.uid, { inspirations: this.inspirations });
          this.showToast('Added!', 'Inspiration image uploaded.', 'fas fa-image', 'success');
        }
        this.cdr.detectChanges();
      } catch {
        this.showToast('Error', 'Failed to upload image.', 'fas fa-times', 'error');
      }
    };
    reader.readAsDataURL(file);
  }

  // ── Remove Inspiration Image ──
  // Writes to: Firebase 'users/{uid}.inspirations' (updated array)
  removeInspiration(index: number): void {
    if (!this.currentUser) return;
    this.inspirations.splice(index, 1);
    this.userService.updateUser(this.currentUser.uid, { inspirations: this.inspirations })
      .then(() => {
        this.showToast('Removed', 'Inspiration image deleted.', 'fas fa-trash', 'success');
        this.cdr.detectChanges();
      });
  }

  // ── Helper: Render star rating ──
  // NEW: Returns an array for *ngFor star rendering [1,2,3,4,5]
  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  // ── Navigation Helpers ──
  goToBookings(): void { this.router.navigate(['/client/my-bookings']); }
  goToDashboard(): void { this.router.navigate(['/client/dashboard']); }

  // ── Toast Notification ──
  showToast(title: string, msg: string, icon = 'fas fa-check-circle', type: 'success' | 'error' = 'success'): void {
    this.toastTitle = title;
    this.toastMessage = msg;
    this.toastIcon = icon;
    this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastVisible = false), 3800);
    this.cdr.detectChanges();
  }
}
