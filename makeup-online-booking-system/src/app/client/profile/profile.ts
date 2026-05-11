import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Auth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from '@angular/fire/auth';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { AuthService } from '../../core/auth.service';
import { UserService, UserData } from '../../core/user.service';
import { BookingService, BookingData } from '../../core/booking.service';
import { ReviewService, Review } from '../../core/review.service';
import { ChatService, Conversation, Message } from '../../core/chat.service';

export type ProfileTab = 'bookings' | 'reviews' | 'messages' | 'preferences' | 'favorites' | 'loyalty' | 'photos' | 'settings' | 'report';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit, OnDestroy {

  // ── State ──
  activeTab: ProfileTab = 'bookings';
  isMobileMenuOpen = false;
  isLoading = true;
  isSaving = false;
  isEditModalOpen = false;
  isReviewModalOpen = false;
  saveMessage = '';
  saveError = '';
  userLoadError = '';

  // ── User ──
  currentUser: UserData | null = null;
  private authSub?: Subscription;
  private bookingsSub?: Subscription;
  private reviewsSub?: Subscription;

  // ── Bookings ──
  bookings: BookingData[] = [];
  isBookingsLoading = true;

  // ── Reviews ──
  myReviews: Review[] = [];
  isReviewsLoading = true;


  // ── Edit Modal ──
  editForm = { firstName: '', lastName: '', phone: '', notes: '' };

  // ── Messaging ──
  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;
  activeMessages: Message[] = [];
  newMessage = '';
  private convsSub?: Subscription;
  private msgsSub?: Subscription;

  // ── Preferences ──
  prefForm = {
    skinType: '', allergies: '', preferredArtist: '',
    preferredSchedule: '', favoriteService: '', inspirations: ''
  };

  // ── Loyalty Tiers ──
  tiers = [
    { name: 'Bronze', min: 0, max: 4, color: '#cd7f32', icon: '⭐' },
    { name: 'Silver', min: 5, max: 9, color: '#a8a8a8', icon: '🌟' },
    { name: 'Gold', min: 10, max: 999, color: '#C6A35D', icon: '✨' }
  ];

  skinTypeOptions = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'];
  scheduleOptions = ['Weekdays Only', 'Weekends Only', 'Mornings', 'Afternoons', 'Flexible'];

  // ═══════════════════════════════════════
  // ── PHOTO GALLERY ──
  // ═══════════════════════════════════════
  galleryPhotos: string[] = [];
  isUploadingPhoto = false;
  isUploadingProfilePic = false;
  readonly MAX_PHOTOS = 4;

  @ViewChild('galleryInput') galleryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('profilePicInput') profilePicInput!: ElementRef<HTMLInputElement>;

  // ═══════════════════════════════════════
  // ── SETTINGS ──
  // ═══════════════════════════════════════
  settingsForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notificationsEnabled: true
  };
  isChangingPassword = false;
  passwordMessage = '';
  passwordError = '';
  settingsSaveMessage = '';
  settingsSaveError = '';

  // ═══════════════════════════════════════
  // ── REPORT A PROBLEM ──
  // ═══════════════════════════════════════
  reportCategories = [
    { id: 'technical', label: '🛠️ Technical Issue', desc: 'App bugs, loading errors, crashes' },
    { id: 'booking', label: '📅 Booking Problem', desc: 'Wrong date, cancellation, confirmation issues' },
    { id: 'payment', label: '💳 Payment Issue', desc: 'Charges, refunds, billing questions' }
  ];
  selectedReportCategory: string = '';
  reportChatStarted = false;
  reportMessages: { text: string; isUser: boolean; time: string }[] = [];
  reportInput = '';
  isSubmittingReport = false;
  reportTicketId = '';
  reportSubmitted = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private bookingService: BookingService,
    private reviewService: ReviewService,
    private chatService: ChatService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private auth: Auth,
    private firestore: Firestore
  ) { }

  async ngOnInit() {
    this.authSub = this.authService.currentUser$.subscribe(async (user) => {
      try {
        if (!user) { this.router.navigate(['/login']); return; }

        let fetchedUser: any = null;
        try { fetchedUser = await this.userService.getUser(user.uid); } catch (e) {
          console.warn('Error fetching user from DB, creating fallback…', e);
        }

        if (fetchedUser) {
          this.currentUser = fetchedUser;
        } else {
          this.currentUser = {
            uid: user.uid,
            email: user?.email || '',
            name: user?.displayName || user?.email?.split('@')[0] || 'Lumière Client',
            firstName: user?.displayName?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'Client'),
            lastName: user?.displayName?.split(' ').slice(1).join(' ') || '',
            phone: user?.phoneNumber || '',
            role: 'client',
            createdAt: new Date(),
            loyaltyPoints: 0,
            profilePicture: user?.photoURL || ''
          };
          try { await this.userService.createUser(user.uid, fetchedUser); } catch (e) {
            console.warn('Failed to create fallback user in DB', e);
          }
        }



        // Load gallery photos
        this.galleryPhotos = this.currentUser?.galleryPhotos || [];

        // Load notification preference
        this.settingsForm.notificationsEnabled = this.currentUser?.notificationsEnabled ?? true;

        if (this.currentUser) {
          this.prefForm = {
            skinType: this.currentUser.skinType || '',
            allergies: this.currentUser.allergies || '',
            preferredArtist: this.currentUser.preferredArtist || '',
            preferredSchedule: this.currentUser.preferredSchedule || '',
            favoriteService: this.currentUser.favoriteService || '',
            inspirations: (this.currentUser.inspirations || []).join(', ')
          };

          this.bookingsSub = this.bookingService
            .getBookingsByClientRealtime('', user.uid)
            .subscribe({
              next: (b) => { this.bookings = b; this.isBookingsLoading = false; this.cdr.detectChanges(); },
              error: () => { this.isBookingsLoading = false; this.cdr.detectChanges(); }
            });

          this.reviewsSub = this.reviewService
            .getReviewsByClientRealtime(user.uid)
            .subscribe({
              next: (r) => { this.myReviews = r; this.isReviewsLoading = false; this.cdr.detectChanges(); },
              error: () => { this.isReviewsLoading = false; this.cdr.detectChanges(); }
            });

          this.convsSub = this.chatService.getConversationsForClient(user.uid).subscribe((convs: Conversation[]) => {
            this.conversations = convs;
            this.cdr.detectChanges();
          });
        }

      } catch (err: any) {
        this.userLoadError = err.message || 'An error occurred while loading your profile.';
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.bookingsSub?.unsubscribe();
    this.reviewsSub?.unsubscribe();
    this.convsSub?.unsubscribe();
    this.msgsSub?.unsubscribe();
  }

  // ── Computed ──
  get firstName() {
    return this.currentUser?.firstName || this.currentUser?.name?.split(' ')[0] || 'Guest';
  }

  get fullName() {
    return this.currentUser?.name ||
      `${this.currentUser?.firstName || ''} ${this.currentUser?.lastName || ''}`.trim() || 'Guest';
  }

  get userInitial() {
    return this.currentUser?.firstName?.[0] || this.currentUser?.name?.[0] || 'U';
  }

  get memberSince() {
    const d = this.currentUser?.createdAt;
    if (!d) return '—';
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long' });
  }

  get loyaltyPoints() { return this.currentUser?.loyaltyPoints || 0; }
  get unreadMessages() { return this.conversations.reduce((s, c) => s + (c.unreadClient || 0), 0); }

  get membershipYears(): number {
    const d = this.currentUser?.createdAt;
    if (!d) return 0;
    const joined = d.toDate ? d.toDate() : new Date(d);
    const now = new Date();
    let years = now.getFullYear() - joined.getFullYear();
    const m = now.getMonth() - joined.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < joined.getDate())) years--;
    return Math.max(0, years);
  }

  get currentTier() {
    return this.tiers.find(t =>
      this.membershipYears >= t.min && this.membershipYears <= t.max
    ) || this.tiers[0];
  }

  get nextTier() {
    const idx = this.tiers.indexOf(this.currentTier);
    return idx < this.tiers.length - 1 ? this.tiers[idx + 1] : null;
  }

  get tierProgress() {
    if (!this.nextTier) return 100;
    const range = (this.currentTier.max + 1) - this.currentTier.min;
    const progress = this.membershipYears - this.currentTier.min;
    return Math.min(100, Math.round((progress / range) * 100));
  }

  /** Gradient for tier progress bar */
  get tierGradient(): string {
    if (!this.nextTier) {
      return `linear-gradient(90deg,${this.currentTier.color},${this.currentTier.color})`;
    }
    return `linear-gradient(90deg,${this.currentTier.color},${this.nextTier.color})`;
  }

  get upcomingBookings() {
    const now = new Date();
    return this.bookings
      .filter(b => { const d = b.date ? new Date(b.date) : null; return d && d >= now && b.status !== 'cancelled'; })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  get pastBookings() {
    const now = new Date();
    return this.bookings
      .filter(b => { const d = b.date ? new Date(b.date) : null; return d && d < now; })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  get averageRating() {
    if (!this.myReviews.length) return '0.0';
    const sum = this.myReviews.reduce((acc, r) => acc + r.starRating, 0);
    return (sum / this.myReviews.length).toFixed(1);
  }

  get favoriteArtists() { return this.currentUser?.favoriteArtists || []; }
  get favoriteServices() { return this.currentUser?.favoriteServices || []; }

  hasReviewedBooking(booking: BookingData): boolean {
    return this.myReviews.some(r => r.bookingId === booking.id);
  }

  // ── Actions ──
  setTab(tab: ProfileTab) {
    this.activeTab = tab;
    this.isMobileMenuOpen = false;
    this.saveMessage = '';
    this.saveError = '';
  }

  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }

  // ── Messaging Methods ──
  selectConversation(conv: Conversation) {
    this.activeConversation = conv;
    this.chatService.markAsRead(conv.id, 'client');
    
    if (this.msgsSub) this.msgsSub.unsubscribe();
    this.msgsSub = this.chatService.getMessages(conv.id).subscribe((msgs: Message[]) => {
      this.activeMessages = msgs;
      this.cdr.detectChanges();
      setTimeout(() => this.scrollToChatBottom(), 100);
    });
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.activeConversation || !this.currentUser) return;
    const text = this.newMessage.trim();
    const convId = this.activeConversation.id;
    const receiverId = this.activeConversation.artistId;
    
    await this.chatService.sendMessage(convId, this.currentUser.uid, receiverId, text, 'client');
    this.newMessage = '';
    this.cdr.detectChanges();
  }

  private scrollToChatBottom() {
    const chatContainer = document.querySelector('.chat-messages-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  openChatWithArtist(booking: BookingData) {
    if (!booking.artistId || !this.currentUser) return;
    const convId = `${booking.artistId}_${this.currentUser.uid}`;
    
    this.chatService.initializeConversation(convId, {
      artistId: booking.artistId,
      clientId: this.currentUser.uid,
      artistName: booking.artistName,
      clientName: this.fullName,
      artistImage: (booking as any).artistImage || '',
      clientImage: this.currentUser.profilePicture || '',
      lastMessage: 'Conversation started',
      lastTime: serverTimestamp(),
      unreadArtist: 0,
      unreadClient: 0,
      participants: [booking.artistId!, this.currentUser.uid],
      createdAt: serverTimestamp()
    }).then(() => {
      this.setTab('messages');
      const conv = this.conversations.find(c => c.id === convId);
      if (conv) {
        this.selectConversation(conv);
      } else {
        // Fallback if subscription hasn't updated yet
        this.selectConversation({
          id: convId,
          artistId: booking.artistId!,
          clientId: this.currentUser!.uid,
          artistName: booking.artistName,
          clientName: this.fullName,
          lastMessage: 'Conversation started',
          lastTime: new Date(),
          unreadArtist: 0,
          unreadClient: 0,
          participants: [booking.artistId!, this.currentUser!.uid],
          createdAt: new Date()
        });
      }
    });
  }

  openEditModal() {
    this.editForm = {
      firstName: this.currentUser?.firstName || '',
      lastName: this.currentUser?.lastName || '',
      phone: this.currentUser?.phone || '',
      notes: this.currentUser?.notes || ''
    };
    this.saveMessage = '';
    this.saveError = '';
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.saveMessage = '';
    this.saveError = '';
  }

  async saveProfile() {
    if (!this.currentUser) return;
    this.isSaving = true;
    this.saveError = '';
    try {
      const fullName = `${this.editForm.firstName.trim()} ${this.editForm.lastName.trim()}`.trim();
      await this.userService.updateUser(this.currentUser.uid, {
        firstName: this.editForm.firstName.trim(),
        lastName: this.editForm.lastName.trim(),
        name: fullName,
        phone: this.editForm.phone.trim(),
        notes: this.editForm.notes.trim()
      });
      this.currentUser = await this.userService.getUser(this.currentUser.uid);
      this.saveMessage = 'Profile updated!';
      setTimeout(() => this.closeEditModal(), 1500);
    } catch {
      this.saveError = 'Failed to save. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }

  async savePreferences() {
    if (!this.currentUser) return;
    this.isSaving = true;
    this.saveError = '';
    try {
      const inspirationsArr = this.prefForm.inspirations
        .split(',').map(s => s.trim()).filter(Boolean);
      await this.userService.updateUser(this.currentUser.uid, {
        skinType: this.prefForm.skinType,
        allergies: this.prefForm.allergies,
        preferredArtist: this.prefForm.preferredArtist,
        preferredSchedule: this.prefForm.preferredSchedule,
        favoriteService: this.prefForm.favoriteService,
        inspirations: inspirationsArr
      });
      this.currentUser = await this.userService.getUser(this.currentUser.uid);
      this.saveMessage = 'Preferences saved!';
      setTimeout(() => { this.saveMessage = ''; }, 3000);
    } catch {
      this.saveError = 'Failed to save preferences.';
    } finally {
      this.isSaving = false;
    }
  }


  async removeFavoriteArtist(name: string) {
    if (!this.currentUser) return;
    await this.userService.removeFromFavorites(this.currentUser.uid, 'favoriteArtists', name);
    this.currentUser = await this.userService.getUser(this.currentUser.uid);
  }

  async removeFavoriteService(name: string) {
    if (!this.currentUser) return;
    await this.userService.removeFromFavorites(this.currentUser.uid, 'favoriteServices', name);
    this.currentUser = await this.userService.getUser(this.currentUser.uid);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatDate(raw: any): string {
    if (!raw) return '—';
    const d = raw.toDate ? raw.toDate() : new Date(raw);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      confirmed: '#2ecc71',
      pending: '#f1c40f',
      cancelled: '#e74c3c',
      completed: '#C6A35D'
    };
    return map[status] || '#6b5a4e';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      confirmed: '✓ Confirmed',
      pending: '⏳ Pending',
      cancelled: '✕ Cancelled',
      completed: '✦ Completed'
    };
    return map[status] || status;
  }

  getStars(n: number): number[] { return Array(Math.min(5, Math.round(n))).fill(0); }
  getEmptyStars(n: number): number[] { return Array(5 - Math.min(5, Math.round(n))).fill(0); }

  // ═══════════════════════════════════════
  // ── PHOTO GALLERY METHODS ──
  // ═══════════════════════════════════════

  triggerGalleryUpload() {
    this.galleryInput?.nativeElement?.click();
  }

  triggerProfilePicUpload() {
    this.profilePicInput?.nativeElement?.click();
  }

  async onGalleryFileSelected(event: Event) {
    if (!this.currentUser) return;
    if (this.galleryPhotos.length >= this.MAX_PHOTOS) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    this.isUploadingPhoto = true;
    this.cdr.detectChanges();

    try {
      const base64 = await this.resizeAndEncodeImage(file, 800);
      const updatedPhotos = [...this.galleryPhotos, base64];
      await this.userService.updateUser(this.currentUser.uid, { galleryPhotos: updatedPhotos });
      this.galleryPhotos = updatedPhotos;
      if (this.currentUser) this.currentUser.galleryPhotos = updatedPhotos;
    } catch (e) {
      console.error('Photo upload error:', e);
      alert('Failed to upload photo. Please try again.');
    } finally {
      this.isUploadingPhoto = false;
      input.value = '';
      this.cdr.detectChanges();
    }
  }

  async removeGalleryPhoto(index: number) {
    if (!this.currentUser) return;
    const updatedPhotos = this.galleryPhotos.filter((_, i) => i !== index);
    await this.userService.updateUser(this.currentUser.uid, { galleryPhotos: updatedPhotos });
    this.galleryPhotos = updatedPhotos;
    if (this.currentUser) this.currentUser.galleryPhotos = updatedPhotos;
    this.cdr.detectChanges();
  }

  async onProfilePicSelected(event: Event) {
    if (!this.currentUser) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    this.isUploadingProfilePic = true;
    this.cdr.detectChanges();

    try {
      const base64 = await this.resizeAndEncodeImage(file, 400);
      await this.userService.updateUser(this.currentUser.uid, { profilePicture: base64 });
      this.currentUser = { ...this.currentUser, profilePicture: base64 };
    } catch (e) {
      console.error('Profile pic upload error:', e);
      alert('Failed to update profile picture.');
    } finally {
      this.isUploadingProfilePic = false;
      input.value = '';
      this.cdr.detectChanges();
    }
  }

  /** Resize image via canvas, return base64 string */
  private resizeAndEncodeImage(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h && w > maxSize) { h = Math.round((h * maxSize) / w); w = maxSize; }
          else if (h > maxSize) { w = Math.round((w * maxSize) / h); h = maxSize; }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ═══════════════════════════════════════
  // ── SETTINGS METHODS ──
  // ═══════════════════════════════════════

  async changePassword() {
    this.passwordError = '';
    this.passwordMessage = '';

    if (!this.settingsForm.newPassword.trim()) {
      this.passwordError = 'Please enter a new password.'; return;
    }
    if (this.settingsForm.newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters.'; return;
    }
    if (this.settingsForm.newPassword !== this.settingsForm.confirmPassword) {
      this.passwordError = 'New passwords do not match.'; return;
    }
    if (!this.settingsForm.currentPassword.trim()) {
      this.passwordError = 'Please enter your current password.'; return;
    }

    this.isChangingPassword = true;
    try {
      const user = this.auth.currentUser;
      if (!user || !user.email) throw new Error('No authenticated user');

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, this.settingsForm.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, this.settingsForm.newPassword);

      this.passwordMessage = 'Password updated successfully! ✓';
      this.settingsForm.currentPassword = '';
      this.settingsForm.newPassword = '';
      this.settingsForm.confirmPassword = '';
      setTimeout(() => { this.passwordMessage = ''; }, 4000);
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        this.passwordError = 'Current password is incorrect.';
      } else if (e.code === 'auth/weak-password') {
        this.passwordError = 'Password is too weak. Please choose a stronger one.';
      } else {
        this.passwordError = e.message || 'Failed to change password.';
      }
    } finally {
      this.isChangingPassword = false;
    }
  }

  async saveNotificationPreference() {
    if (!this.currentUser) return;
    this.settingsSaveError = '';
    try {
      await this.userService.updateUser(this.currentUser.uid, {
        notificationsEnabled: this.settingsForm.notificationsEnabled
      });
      this.settingsSaveMessage = 'Preferences saved ✓';
      setTimeout(() => { this.settingsSaveMessage = ''; }, 3000);
    } catch {
      this.settingsSaveError = 'Failed to save. Please try again.';
    }
  }

  // ═══════════════════════════════════════
  // ── REVIEW METHODS ──
  // ═══════════════════════════════════════
  // isReviewModalOpen is already defined at the top
  reviewTargetBooking: any = null;
  hoverRating = 0;
  reviewForm = { rating: 5, comment: '' };
  isSubmittingReview = false;

  openReviewModal(booking: any) {
    if (booking.status !== 'completed') {
      alert('You can only review completed appointments.');
      return;
    }
    this.reviewTargetBooking = booking;
    this.reviewForm = { rating: 5, comment: '' };
    this.isReviewModalOpen = true;
    this.cdr.detectChanges();
  }

  closeReviewModal() {
    this.isReviewModalOpen = false;
    this.reviewTargetBooking = null;
    this.cdr.detectChanges();
  }

  async submitReview() {
    if (!this.reviewTargetBooking || !this.currentUser) return;
    if (!this.reviewForm.comment.trim()) return;

    this.isSubmittingReview = true;
    try {
      const reviewData: Omit<Review, 'reviewId'> = {
        artistId: this.reviewTargetBooking.assignedArtistId,
        artistName: this.reviewTargetBooking.artistName,
        clientUserId: this.currentUser.uid,
        clientName: this.currentUser.name,
        bookingId: this.reviewTargetBooking.id,
        service: this.reviewTargetBooking.serviceName,
        starRating: this.reviewForm.rating,
        reviewMessage: this.reviewForm.comment,
        date: new Date().toLocaleDateString('en-PH'),
        createdAt: serverTimestamp()
      };

      await this.reviewService.addReview(reviewData);
      
      // Update booking to show it's reviewed
      await this.bookingService.updateBookingStatus(this.reviewTargetBooking.id, 'completed');
      
      this.closeReviewModal();
      alert('Thank you for your feedback! ⭐');
    } catch (e) {
      console.error('Review Error:', e);
      alert('Failed to submit review. Please try again.');
    } finally {
      this.isSubmittingReview = false;
      this.cdr.detectChanges();
    }
  }

  // ═══════════════════════════════════════
  // ── REPORT METHODS ──
  // ═══════════════════════════════════════

  selectReportCategory(catId: string) {
    this.selectedReportCategory = catId;
    this.reportChatStarted = true;
    this.reportMessages = [];
    this.reportSubmitted = false;
    this.reportTicketId = '';

    const cat = this.reportCategories.find(c => c.id === catId);
    const botIntro = `You've selected "${cat?.label}". Please describe your issue in detail below. Our team will respond within 24 hours.`;

    this.reportMessages.push({
      text: botIntro,
      isUser: false,
      time: this.getTime()
    });
  }

  sendReportMessage() {
    if (!this.reportInput.trim() || this.reportSubmitted) return;
    const msg = this.reportInput.trim();
    this.reportMessages.push({ text: msg, isUser: true, time: this.getTime() });
    this.reportInput = '';
    this.cdr.detectChanges();

    setTimeout(() => {
      this.reportMessages.push({
        text: 'Thank you for your message. You can add more details, or click "Submit Report" when you\'re ready.',
        isUser: false,
        time: this.getTime()
      });
      this.cdr.detectChanges();
    }, 800);
  }

  async submitReport() {
    if (!this.currentUser) return;
    const userMessages = this.reportMessages.filter(m => m.isUser).map(m => m.text);
    if (userMessages.length === 0) {
      alert('Please describe your issue before submitting.');
      return;
    }

    this.isSubmittingReport = true;
    try {
      const reportsRef = collection(this.firestore, 'reports');
      const docRef = await addDoc(reportsRef, {
        uid: this.currentUser.uid,
        clientName: this.fullName,
        clientEmail: this.currentUser.email,
        category: this.selectedReportCategory,
        messages: userMessages,
        status: 'open',
        createdAt: serverTimestamp()
      });

      this.reportTicketId = docRef.id.slice(0, 8).toUpperCase();
      this.reportSubmitted = true;

      this.reportMessages.push({
        text: `✅ Your report has been submitted. Ticket ID: #${this.reportTicketId}. Our team will review this within 24 hours. Thank you for helping keep Lumière safe and professional.`,
        isUser: false,
        time: this.getTime()
      });
    } catch (e) {
      console.error('Report submission error:', e);
      this.reportMessages.push({
        text: '❌ Something went wrong. Please try again or email us directly.',
        isUser: false,
        time: this.getTime()
      });
    } finally {
      this.isSubmittingReport = false;
      this.cdr.detectChanges();
    }
  }

  resetReport() {
    this.selectedReportCategory = '';
    this.reportChatStarted = false;
    this.reportMessages = [];
    this.reportInput = '';
    this.reportSubmitted = false;
    this.reportTicketId = '';
  }

  getTime(): string {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}