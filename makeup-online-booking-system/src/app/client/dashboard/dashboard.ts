// dashboard.ts
import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';
import { BookingService } from '../../core/booking.service';
import { PaymentService } from '../../core/payment.service';
import { ServiceItemService } from '../../core/service-item.service';
import { ArtistPortfolioService } from '../../core/artist-portfolio.service';
import { ReviewService } from '../../core/review.service';
import { ChatService, Conversation } from '../../core/chat.service';
import { Subscription } from 'rxjs';

interface Service {
  name: string; desc: string; fullDesc: string; icon: string;
  price: number; image: string; duration: string; rating: string;
  ratingCount: number; bookings: number; category: string;
  includes: string[]; wishlisted: boolean;
}
interface Artist {
  uid?: string;
  name: string; firstName: string; role: string; image: string;
  rating: string; exp: string; clients: number; specialties: string[];
  bio?: string;
}
interface PortfolioImage { url: string; label: string; tag: string; }
interface Testimonial { name: string; quote: string; type: string; avatar: string; date: string; }
interface FAQ { question: string; answer: string; open: boolean; }
interface CurrentUser {
  uid: string;
  name: string; email: string; phone?: string; avatar?: string;
  memberTier: string; bookingCount: number; points: number;
  reviews: number; joinDate: string;
  recentBookings: { service: string; date: string; status: string }[];
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class ClientDashboardComponent implements OnInit, OnDestroy {

  // ── UI State ───────────────────────────────────────────
  isScrolled = false;
  sidebarCollapsed = false;
  profilePanelOpen = false;
  activeSection = 'home';

  // ── Toast ──────────────────────────────────────────────
  toastVisible = false;
  toastTitle = '';
  toastMessage = '';
  toastIcon = 'fas fa-check-circle';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── Modals ─────────────────────────────────────────────
  svcModalOpen = false;
  activeSvc: Service | null = null;
  lbOpen = false;
  lbIdx = 0;

  // ── Booking Form ───────────────────────────────────────
  bookDate = '';
  bookService = '';
  bookArtist: string | null = null;
  bookPayment = '';
  bookPaymentAccount = '';
  bookTime = '';
  bookNotes = '';
  minBookDate = '';
  bookTimeSlots = ['10:00 AM', '11:00 AM', '01:00 PM', '02:30 PM', '04:00 PM'];
  paymentOptions = [
    { id: 'gcash', label: 'GCash', icon: 'fas fa-mobile-alt' },
    { id: 'card', label: 'Credit/Debit Card', icon: 'fas fa-credit-card' },
    { id: 'cash', label: 'Pay Onsite', icon: 'fas fa-money-bill-wave' }
  ];
  filteredArtists: Artist[] = [];
  myTickets: any[] = [];
  generatedTicket: any = null;

  // ── Search ─────────────────────────────────────────────
  searchQuery = '';
  searchResults: any[] = [];
  private searchTimeout: any;

  // ── Chat Widget ────────────────────────────────────────
  chatOpen = false;
  chatView: 'inbox' | 'chat' = 'inbox';
  activeChat: any = null;
  chatInput = '';
  isArtistTyping = false;

  conversations: any[] = [];

  get totalUnreadMessages(): number {
    return this.conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  }

  // ── Dummy Data ───────────────────────────────────────────
  wishlistCount = 0;

  // ── Portfolio ──────────────────────────────────────────
  portfolioTab = 'all';
  filteredPortfolio: PortfolioImage[] = [];
  displayedCount = 8;
  displayedPortfolio: PortfolioImage[] = [];

  // ── Other ──────────────────────────────────────────────
  newsletterEmail = '';
  currentUser: CurrentUser | null = null;

  // ── Data ───────────────────────────────────────────────
  proofAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1491349174775-aaaefdd81942?w=60&h=60&fit=crop&crop=face',
  ];

  stats = [
    { icon: 'fas fa-users', value: '500+', label: 'Happy Clients' },
    { icon: 'fas fa-star', value: '4.9★', label: 'Avg Rating' },
    { icon: 'fas fa-magic', value: '4', label: 'Signature Services' },
    { icon: 'fas fa-calendar-check', value: '1,200+', label: 'Bookings Done' },
    { icon: 'fas fa-award', value: '5+', label: 'Years Experience' },
  ];

  services: Service[] = [];
  private serviceSub?: Subscription;
  artists: Artist[] = [];
  private artistSub?: Subscription;

  allPortfolio: PortfolioImage[] = [];
  private portfolioSub?: Subscription;

  testimonials: Testimonial[] = [];
  private reviewSub?: Subscription;
  private bookingSub?: Subscription;
  private chatSub?: Subscription;

  ratingBars = [
    { label: '5★', pct: 92 },
    { label: '4★', pct: 6 },
    { label: '3★', pct: 2 }
  ];

  faqs: FAQ[] = [
    {
      question: 'How do I book an appointment?',
      answer: 'Click "Book Now", select your preferred date and service, and complete the form. You\'ll receive a confirmation within minutes.',
      open: false
    },
    {
      question: 'Do you offer a trial session before the wedding?',
      answer: 'Yes! Our Bridal package includes a pre-wedding trial so you can see your look and request adjustments.',
      open: false
    },
    {
      question: 'What products do you use?',
      answer: 'We use premium, dermatologist-tested brands safe for all skin types — long-lasting and photography-friendly.',
      open: false
    },
    {
      question: 'Can I reschedule or cancel my booking?',
      answer: 'Yes! Rescheduling is free up to 48 hours before your appointment. Cancellations within 24 hours may incur a small fee.',
      open: false
    },
    {
      question: 'Do you offer group bookings?',
      answer: 'Absolutely! We offer special group rates for bridal parties, debuts, and corporate events. Contact us for a custom quote.',
      open: false
    },
  ];

  aboutPoints = [
    { icon: 'fas fa-certificate', title: 'Certified Artists', desc: 'All our MUAs are professionally certified and trained.' },
    { icon: 'fas fa-heart', title: 'Premium Products', desc: 'We use only dermatologist-tested, luxury-grade products.' },
    { icon: 'fas fa-calendar-check', title: 'Easy Booking', desc: 'Book online in minutes, anytime from anywhere.' },
  ];

  bookPerks = [
    { icon: 'fas fa-shield-alt', title: 'Secure Booking', desc: 'Encrypted & fully protected' },
    { icon: 'fas fa-redo', title: 'Free Rescheduling', desc: 'Up to 48 hours before' },
    { icon: 'fas fa-headset', title: '24/7 Support', desc: 'Always here to help you' },
    { icon: 'fas fa-certificate', title: 'Certified MUAs', desc: 'Only the best artists for you' },
  ];

  trustItems = [
    { icon: 'fas fa-star', title: '5-Star Rated', sub: '100+ verified reviews' },
    { icon: 'fas fa-shield-alt', title: 'Safe & Hygienic', sub: 'Sterilized tools always' },
    { icon: 'fas fa-certificate', title: 'Certified MUAs', sub: 'Professional artists only' },
    { icon: 'fas fa-calendar-check', title: 'Easy Booking', sub: 'Book in under 2 minutes' },
    { icon: 'fas fa-heart', title: 'Premium Products', sub: 'Luxury-grade cosmetics' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private bookingService: BookingService,
    private paymentService: PaymentService,
    private serviceItemService: ServiceItemService,
    private artistPortfolioService: ArtistPortfolioService,
    private reviewService: ReviewService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);

    // Fetch all users with role == 'artist' from Firestore via UserService
    this.artistSub = this.userService.getUsersByRoleRealtime('artist').subscribe({
      next: (artistUsers) => {
        console.log('Raw artist data fetched:', artistUsers);
        
        this.artists = artistUsers.map((u: any) => {
          let sp = Array.isArray(u.services) ? u.services.map((s:any) => s.name).filter((n:any) => !!n) : [];
          if (sp.length === 0) sp = [u.specialty || 'General'];
          return {
            uid: u.uid,
            name: u.name || 'Unknown Artist',
            firstName: u.firstName || (u.name ? u.name.split(' ')[0] : 'Artist'),
            role: u.specialty || 'Professional Makeup Artist',
            image: u.profilePicture || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=460&fit=crop&crop=face',
            bio: u.bio || 'Passionate makeup artist dedicated to bringing out your natural beauty and confidence.',
            rating: Number(u.rating || 0).toFixed(1),
            exp: '5 yrs',
            clients: Number(u.ratingCount || 0),
            specialties: sp
          };
        });
        console.log('Processed artists for UI:', this.artists);
        if (this.bookService) {
          const s = this.services.find(svc => svc.name === this.bookService);
          if (s) this.selectService(s);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Artist fetch error:', err);
      }
    });

    // Listen to Firebase Auth state
    this.authService.currentUser$.subscribe(async (user) => {
      if (user) {
        try {
          const userData = await this.userService.getUser(user.uid);
          if (userData && userData.role === 'client') {
            this.currentUser = {
              uid: user.uid,
              name: userData.name || 'Guest User',
              email: userData.email || '',
              phone: userData.phone || '',
              avatar: '',
              memberTier: 'Silver',
              bookingCount: 0,
              points: userData.loyaltyPoints || 0,
              reviews: 0,
              joinDate: userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'New Member',
              recentBookings: []
            };
            
            this.startUserSubscriptions(user.uid, userData.name || 'Guest User');
          } else {
            this.currentUser = null;
            this.clearUserSubscriptions();
          }
        } catch {
          this.currentUser = null;
          this.clearUserSubscriptions();
        }
      } else {
        this.currentUser = null;
        this.clearUserSubscriptions();
      }
      this.cdr.detectChanges();
    });

    const today = new Date();
    this.minBookDate = today.toISOString().split('T')[0];
    this.bookDate = this.minBookDate;

    this.serviceSub = this.serviceItemService.getAllServicesRealtime().subscribe({
      next: (svcs) => {
        this.services = svcs.filter(s => s.status !== 'inactive').map(s => ({
          name: s.name, category: 'General', icon: s.icon || 'fas fa-star',
          price: Number(s.price), duration: s.duration || '1 hr', rating: '5.0', ratingCount: 0,
          bookings: s.bookings || 0, wishlisted: false,
          image: s.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=380&fit=crop&crop=face',
          desc: s.desc,
          fullDesc: s.desc,
          includes: ['Consultation', 'Full face application']
        }));
        this.cdr.detectChanges();
      }
    });

    this.portfolioSub = this.artistPortfolioService.getAllPortfoliosRealtime().subscribe({
      next: (items: any[]) => {
        this.allPortfolio = items.map((item: any) => ({
          url: item.imageUrl,
          label: item.title,
          tag: item.serviceCategory?.toLowerCase() || 'general'
        }));
        this.filteredPortfolio = [...this.allPortfolio];
        this.updateDisplayed();
        this.cdr.detectChanges();
      }
    });

    this.reviewSub = this.reviewService.getAllReviewsRealtime().subscribe({
      next: (reviews) => {
        this.testimonials = reviews.map(r => ({
          name: r.clientName || 'Client',
          type: r.service || 'Service',
          date: r.date || new Date(r.createdAt).toLocaleDateString(),
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&face',
          quote: r.comment
        }));
        this.cdr.detectChanges();
      }
    });

    // Auto-collapse sidebar on small screens
    if (window.innerWidth <= 700) {
      this.sidebarCollapsed = true;
    }
  }

  startUserSubscriptions(uid: string, clientName: string): void {
    this.clearUserSubscriptions();
    
    this.bookingSub = this.bookingService.getBookingsByClientRealtime(clientName, uid).subscribe(bookings => {
      // Sort by date descending
      bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (this.currentUser) {
        this.currentUser.bookingCount = bookings.length;
        this.currentUser.recentBookings = bookings.slice(0, 3).map(b => ({
          service: b.serviceName,
          date: new Date(b.createdAt).toLocaleDateString(),
          status: b.status
        }));
      }

      this.myTickets = bookings.map(b => {
        let displayPayment = b.paymentMethod;
        if (b.paymentMethod !== 'Pay Onsite' && b.paymentAccount) {
          const acc = b.paymentAccount.trim();
          const masked = acc.length > 4 ? '*'.repeat(acc.length - 4) + acc.slice(-4) : acc;
          displayPayment += ` (${masked})`;
        }
        return {
          id: b.id,
          date: b.date ? b.date.split(' ')[0] : '',
          time: b.date && b.date.includes(' ') ? b.date.split(' ')[1] : 'TBD',
          serviceName: b.serviceName,
          artistName: b.artistName,
          payment: displayPayment,
          price: parseFloat(b.amount.replace(/,/g, '')),
          status: b.status.toUpperCase()
        };
      });
      this.cdr.detectChanges();
    });

    this.chatSub = this.chatService.getConversationsForClient(uid).subscribe(convs => {
      this.conversations = convs.map(c => ({
        ...c,
        unread: c.unreadClient || 0,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop', // default artist avatar
        online: true // Mock online status
      }));
      
      // Update active chat if open
      if (this.activeChat) {
        const updated = this.conversations.find(c => c.id === this.activeChat.id);
        if (updated) {
          this.activeChat = updated;
        }
      }
      this.cdr.detectChanges();
    });
  }

  clearUserSubscriptions(): void {
    if (this.bookingSub) this.bookingSub.unsubscribe();
    if (this.chatSub) this.chatSub.unsubscribe();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.artistSub) this.artistSub.unsubscribe();
    if (this.serviceSub) this.serviceSub.unsubscribe();
    if (this.portfolioSub) this.portfolioSub.unsubscribe();
    if (this.reviewSub) this.reviewSub.unsubscribe();
    document.body.style.overflow = '';
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 50;
    const sections = ['contact', 'testimonials', 'book', 'portfolio', 'artists', 'services', 'home'];
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 140) {
        this.activeSection = id;
        break;
      }
    }
  }

  // FIX: TS2554: Expected 0 arguments, but got 1.
  // Reason: @HostListener was passing ['$event'] but onResize() took 0 arguments.
  // Solution: Removed ['$event'] from @HostListener since the event object is not used.
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth <= 700 && !this.sidebarCollapsed) {
      this.sidebarCollapsed = true;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closeServiceModal();
    this.closeLightbox();
    this.closeProfilePanel();
    // Also close sidebar on mobile when Escape is pressed
    if (window.innerWidth <= 700) {
      this.sidebarCollapsed = true;
    }
  }

  // ── Toast ──────────────────────────────────────────────
  showToast(
    title: string,
    msg: string,
    icon = 'fas fa-check-circle',
    type: 'success' | 'error' = 'success'
  ): void {
    this.toastTitle = title;
    this.toastMessage = msg;
    this.toastIcon = icon;
    this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toastVisible = false), 3800);
  }

  // ── Navigation ─────────────────────────────────────────
  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeSection = id;
    this.searchQuery = '';
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 700) this.sidebarCollapsed = true;
  }

  /**
   * Navigate to a dedicated sub-page.
   * Routes: 'services' | 'artists' | 'portfolio' | 'reviews' | 'bookings' | 'about'
   *
   * Each route corresponds to a separate page that shows the full content
   * for that section (e.g. all services, full portfolio gallery, all artists, etc.)
   */
  navigateTo(page: string): void {
    const routeMap: Record<string, string> = {
      services: '/client/services',
      artists: '/client/artists',
      portfolio: '/client/portfolio',
      reviews: '/client/reviews',
      bookings: '/client/my-bookings',
      about: '/client/services',
    };
    const route = routeMap[page];
    if (route) {
      this.router.navigate([route]);
    } else {
      this.showToast(
        'Coming Soon',
        `The ${page} page is launching soon! ✨`,
        'fas fa-sparkles',
        'success'
      );
    }
  }

  goToLogin(): void { this.router.navigate(['/login']); }
  goToSignup(): void { this.router.navigate(['/signup']); }

  goToBook(): void {
    if (this.currentUser) {
      this.scrollToSection('book');
    } else {
      this.showToast(
        'Login Required',
        'Please log in to book an appointment 💕',
        'fas fa-lock',
        'error'
      );
      setTimeout(() => this.router.navigate(['/login']), 1600);
    }
  }

  bookThisService(service: Service): void {
    if (!this.currentUser) {
      this.goToBook(); // Reuses the "Login Required" toast logic
      return;
    }
    this.selectService(service);
    this.scrollToSection('book');
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.currentUser = null;
      this.closeProfilePanel();
      this.showToast(
        'Logged Out',
        'You have been logged out successfully.',
        'fas fa-sign-out-alt',
        'success'
      );
    });
  }

  // ── Profile Panel ──────────────────────────────────────
  openProfilePanel(): void { this.profilePanelOpen = true; document.body.style.overflow = 'hidden'; }
  closeProfilePanel(): void { this.profilePanelOpen = false; document.body.style.overflow = ''; }

  // ── Service Modal ──────────────────────────────────────
  openServiceModal(s: Service): void {
    this.activeSvc = s;
    this.svcModalOpen = true;
    document.body.style.overflow = 'hidden';
  }
  closeServiceModal(): void {
    this.svcModalOpen = false;
    this.activeSvc = null;
    document.body.style.overflow = '';
  }

  // ── Wishlist ───────────────────────────────────────────
  toggleWish(s: Service): void {
    s.wishlisted = !s.wishlisted;
    this.wishlistCount = this.services.filter(x => x.wishlisted).length;
    this.showToast(
      s.wishlisted ? 'Saved!' : 'Removed',
      s.wishlisted ? `${s.name} added to wishlist 💕` : `${s.name} removed.`,
      s.wishlisted ? 'fas fa-heart' : 'fas fa-heart-broken',
      'success'
    );
  }

  showWishlistToast(): void {
    const saved = this.services.filter(x => x.wishlisted);
    if (!saved.length) {
      this.showToast('Wishlist', 'Save services you love using the heart button!', 'fas fa-heart', 'success');
    } else {
      this.showToast(
        'Wishlist',
        `You have ${saved.length} saved: ${saved.map(s => s.name).join(', ')}`,
        'fas fa-heart',
        'success'
      );
    }
  }

  // ── Portfolio ──────────────────────────────────────────
  filterPortfolio(tab: string): void {
    this.portfolioTab = tab;
    this.filteredPortfolio = tab === 'all'
      ? [...this.allPortfolio]
      : this.allPortfolio.filter(p => p.tag === tab);
    this.displayedCount = 8;
    this.updateDisplayed();
  }

  loadMore(): void {
    this.displayedCount = Math.min(
      this.displayedCount + 4,
      this.filteredPortfolio.length
    );
    this.updateDisplayed();
  }

  updateDisplayed(): void {
    this.displayedPortfolio = this.filteredPortfolio.slice(0, this.displayedCount);
  }

  // ── Lightbox ───────────────────────────────────────────
  openLightbox(i: number): void { this.lbIdx = i; this.lbOpen = true; document.body.style.overflow = 'hidden'; }
  closeLightbox(): void { this.lbOpen = false; document.body.style.overflow = ''; }
  prevLb(): void { this.lbIdx = (this.lbIdx - 1 + this.displayedPortfolio.length) % this.displayedPortfolio.length; }
  nextLb(): void { this.lbIdx = (this.lbIdx + 1) % this.displayedPortfolio.length; }

  // ── Search ─────────────────────────────────────────────
  onSearch(): void {
    if (!this.searchQuery.trim()) { this.searchResults = []; return; }
    const q = this.searchQuery.toLowerCase();
    this.searchResults = [
      ...this.services
        .filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
        .map(s => ({ name: s.name, category: s.category, icon: s.icon, section: 'services' })),
      ...this.artists
        .filter(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q))
        .map(a => ({ name: a.name, category: a.role, icon: 'fas fa-user-circle', section: 'artists' })),
    ].slice(0, 6);
  }

  clearSearchDelay(): void {
    setTimeout(() => { this.searchResults = []; }, 220);
  }

  // ── Booking Form Logic ─────────────────────────────────
  getServicePrice(name: string): number {
    return this.services.find(s => s.name === name)?.price ?? 0;
  }

  selectService(service: Service): void {
    this.bookService = service.name;
    this.bookArtist = null;
    this.bookTime = '';
    // Filter artists whose specialties include the service category
    this.filteredArtists = this.artists.filter(a => a.specialties.includes(service.category));
    if (this.filteredArtists.length === 0) {
      this.filteredArtists = this.artists;
    }
  }

  handleBook(): void {
    if (!this.bookDate || !this.bookService || !this.bookArtist || !this.bookPayment) {
      this.showToast('Missing Info', 'Please select Date, Service, Artist, and Payment.', 'fas fa-exclamation-circle', 'error');
      return;
    }
    
    if (this.bookPayment !== 'Pay Onsite' && !this.bookPaymentAccount.trim()) {
      this.showToast('Missing Info', 'Please provide your account or card number.', 'fas fa-exclamation-circle', 'error');
      return;
    }
    
    this.showToast('Processing', `Sending request to ${this.bookArtist}...`, 'fas fa-spinner fa-spin', 'success');

    setTimeout(async () => {
      const ticketId = 'BK-' + Math.floor(100000 + Math.random() * 900000);
      let displayPayment = this.bookPayment;
      if (this.bookPayment !== 'Pay Onsite') {
        const acc = this.bookPaymentAccount.trim();
        const masked = acc.length > 4 ? '*'.repeat(acc.length - 4) + acc.slice(-4) : acc;
        displayPayment += ` (${masked})`;
      }

      const bookingDateStr = `${this.bookDate} ${this.bookTime || 'TBD'}`;
      const amountStr = this.getServicePrice(this.bookService).toLocaleString();

      try {
        await this.bookingService.addBooking({
          clientName: this.currentUser?.name || 'Guest',
          clientId: this.currentUser?.uid,
          serviceName: this.bookService,
          artistName: this.bookArtist!,
          date: bookingDateStr,
          amount: amountStr,
          paymentMethod: this.bookPayment,
          paymentAccount: this.bookPaymentAccount,
          status: 'pending',
          createdAt: new Date()
        });

        // Also save explicitly to the payments collection
        await this.paymentService.addPayment({
          clientName: this.currentUser?.name || 'Guest',
          clientId: this.currentUser?.uid,
          amount: amountStr,
          paymentMethod: this.bookPayment,
          paymentAccount: this.bookPaymentAccount,
          status: 'pending',
          createdAt: new Date()
        });

        const ticket = {
          id: ticketId,
          date: this.bookDate,
          time: this.bookTime || 'TBD',
          serviceName: this.bookService,
          artistName: this.bookArtist,
          payment: displayPayment,
          price: this.getServicePrice(this.bookService),
          status: 'UPCOMING'
        };
        
        // myTickets will be updated automatically via the real-time subscription
        this.generatedTicket = ticket;
        
        this.bookDate = '';
        this.bookTime = '';
        this.bookService = '';
        this.bookArtist = null;
        this.bookPayment = '';
        this.bookPaymentAccount = '';
        this.bookNotes = '';
        this.filteredArtists = [];
      } catch (err) {
        this.showToast('Error', 'Failed to save booking. Please try again.', 'fas fa-exclamation-triangle', 'error');
        console.error(err);
      }
    }, 1500);
  }

  openTicket(ticket: any): void {
    this.generatedTicket = ticket;
  }
  
  closeTicket(): void {
    this.generatedTicket = null;
  }

  // ── FAQ ────────────────────────────────────────────────
  toggleFaq(i: number): void {
    this.faqs = this.faqs.map((f, idx) => ({ ...f, open: idx === i ? !f.open : false }));
  }

  // ── Newsletter ─────────────────────────────────────────
  subscribe(): void {
    if (!this.newsletterEmail.includes('@')) {
      this.showToast('Invalid Email', 'Please enter a valid email.', 'fas fa-envelope', 'error');
      return;
    }
    this.showToast('Subscribed! 💕', 'Thank you for joining Lumière! ✨', 'fas fa-heart', 'success');
    this.newsletterEmail = '';
  }

  // ── Sidebar Toggle ─────────────────────────────────────
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // ── Chat Widget ────────────────────────────────────────
  toggleChat(): void {
    this.chatOpen = !this.chatOpen;
    if (!this.chatOpen) {
      // Keep it wherever it was
    }
  }

  openChat(conv: any): void {
    this.activeChat = conv;
    this.chatView = 'chat';
    if (conv.unreadClient > 0) {
      this.chatService.markAsRead(conv.id, 'client');
    }
  }

  backToInbox(): void {
    this.chatView = 'inbox';
    this.activeChat = null;
  }

  async sendMessage(): Promise<void> {
    if (!this.activeChat || !this.currentUser) return;
    const text = this.chatInput.trim();
    if (!text) return;
    
    const newMsg = {
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'client' as 'client' | 'artist',
      timestamp: Date.now()
    };
    
    this.chatInput = '';
    
    await this.chatService.sendMessage(
      this.activeChat.id,
      newMsg,
      (this.activeChat.unreadArtist || 0) + 1,
      this.activeChat.unreadClient || 0,
      text,
      newMsg.time
    );
  }

  // ── Image Fallback ─────────────────────────────────────
  onImgError(e: Event): void {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) {
      img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
    }
  }
}