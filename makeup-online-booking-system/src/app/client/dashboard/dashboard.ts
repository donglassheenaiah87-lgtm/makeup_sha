// dashboard.ts
import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';

interface Service {
  name: string; desc: string; fullDesc: string; icon: string;
  price: number; image: string; duration: string; rating: string;
  ratingCount: number; bookings: number; category: string;
  includes: string[]; wishlisted: boolean;
}
interface Artist {
  name: string; firstName: string; role: string; image: string;
  rating: string; exp: string; clients: number; specialties: string[];
}
interface PortfolioImage { url: string; label: string; tag: string; }
interface Testimonial { name: string; quote: string; type: string; avatar: string; date: string; }
interface FAQ { question: string; answer: string; open: boolean; }
interface CurrentUser {
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
    { id: 'maya', label: 'PayMaya', icon: 'fas fa-wallet' },
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

  conversations = [
    {
      id: 1,
      artistName: 'Sarah M.',
      artistRole: 'Bridal Make-up',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      online: true,
      unread: 1,
      messages: [
        { text: 'Hi! Looking forward to your session on Saturday. Do you have any pegs?', time: '10:30 AM', sender: 'artist' }
      ]
    },
    {
      id: 2,
      artistName: 'Leo T.',
      artistRole: 'Hair Styling',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      online: false,
      unread: 0,
      messages: [
        { text: 'Thanks for booking! I saw your note about having dry scalps.', time: 'Yesterday', sender: 'artist' },
        { text: 'Yes, do I need to prepare anything before you arrive?', time: 'Yesterday', sender: 'me' },
        { text: 'Just wash it normally without heavy conditioner! See you!', time: 'Yesterday', sender: 'artist' }
      ]
    }
  ];

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

  services: Service[] = [
    {
      name: 'Bridal Makeup', category: 'Bridal', icon: 'fas fa-heart',
      price: 4500, duration: '2–3 hrs', rating: '5.0', ratingCount: 98,
      bookings: 120, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=500&h=380&fit=crop&crop=face',
      desc: 'A timeless, radiant look crafted for your most special day.',
      fullDesc: 'Our bridal makeup is designed to make you look absolutely flawless on your wedding day. Using premium long-lasting products tailored to your skin tone and theme, including a pre-wedding trial session.',
      includes: ['Pre-wedding consultation', 'Trial makeup session', 'Premium long-lasting products', 'Touch-up kit included', 'Hair pinning assistance']
    },
    {
      name: 'Event Glam', category: 'Event', icon: 'fas fa-star',
      price: 2200, duration: '1–2 hrs', rating: '4.9', ratingCount: 143,
      bookings: 200, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&h=380&fit=crop&crop=face',
      desc: 'Glamorous, long-lasting looks perfect for any celebration.',
      fullDesc: 'Look your absolute best at any event — debuts, galas, proms, or parties. Our event makeup is crafted to last the entire night while keeping you photo-ready and stunning.',
      includes: ['Custom look consultation', 'Full face application', 'Long-wear setting spray', 'Lash application', 'Color-matched foundation']
    },
    {
      name: 'Natural Glow', category: 'Natural', icon: 'fas fa-leaf',
      price: 1800, duration: '1 hr', rating: '4.8', ratingCount: 112,
      bookings: 180, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&h=380&fit=crop&crop=face',
      desc: 'Soft, effortless beauty that enhances your natural features.',
      fullDesc: 'Perfect for everyday occasions, dates, or casual events. Our natural glow service enhances your best features while keeping the look fresh, light, and authentically you.',
      includes: ['Skin prep & hydration', 'Natural-finish foundation', 'Subtle contouring', 'Tinted lip treatment', 'All-day setting spray']
    },
    {
      name: 'Photoshoot Look', category: 'Editorial', icon: 'fas fa-camera',
      price: 2500, duration: '1.5–2 hrs', rating: '4.9', ratingCount: 67,
      bookings: 90, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&h=380&fit=crop&crop=face',
      desc: 'Camera-ready, editorial-quality finish for your shoot.',
      fullDesc: 'Crafted specifically for HD photography and videography. We use camera-optimized products and techniques that translate beautifully on screen, for models, content creators, and portfolio shoots.',
      includes: ['HD-ready application', 'Color-correcting base', 'Contouring & highlighting', 'Waterproof eye makeup', 'On-set touch-up support']
    }
  ];

  artists: Artist[] = [
    {
      name: 'Anika Reyes', firstName: 'Anika', role: 'Lead Bridal Artist',
      rating: '5.0', exp: '8 yrs', clients: 300,
      image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=460&fit=crop&crop=face',
      specialties: ['Bridal', 'Glam', 'Airbrush']
    },
    {
      name: 'Sofia Cruz', firstName: 'Sofia', role: 'Editorial Specialist',
      rating: '4.9', exp: '6 yrs', clients: 220,
      image: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=460&fit=crop&crop=face',
      specialties: ['Editorial', 'SFX', 'Event']
    },
    {
      name: 'Mia Santos', firstName: 'Mia', role: 'Natural Beauty Expert',
      rating: '4.8', exp: '5 yrs', clients: 180,
      image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&h=460&fit=crop&crop=face',
      specialties: ['Natural', 'Skincare', 'Glam']
    },
    {
      name: 'Leila Torres', firstName: 'Leila', role: 'Event & Debut Artist',
      rating: '4.9', exp: '7 yrs', clients: 260,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=460&fit=crop&crop=face',
      specialties: ['Debut', 'Event', 'Korean']
    }
  ];

  allPortfolio: PortfolioImage[] = [
    { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=500&fit=crop&crop=face', label: 'Bridal Glow', tag: 'bridal' },
    { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=400&fit=crop&crop=face', label: 'Event Glam', tag: 'glam' },
    { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=500&fit=crop&crop=face', label: 'Natural Look', tag: 'natural' },
    { url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&h=400&fit=crop&crop=face', label: 'Editorial', tag: 'editorial' },
    { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=500&fit=crop&crop=face', label: 'Photoshoot', tag: 'editorial' },
    { url: 'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?w=400&h=400&fit=crop&crop=face', label: 'Bridal Party', tag: 'bridal' },
    { url: 'https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=400&h=500&fit=crop&crop=face', label: 'Soft Glam', tag: 'natural' },
    { url: 'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=400&h=400&fit=crop&crop=face', label: 'Debut Look', tag: 'glam' },
    { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop&crop=face', label: 'Glamour Shot', tag: 'glam' },
    { url: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=400&fit=crop&crop=face', label: 'Fashion Look', tag: 'editorial' },
    { url: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&h=500&fit=crop&crop=face', label: 'Fresh Bride', tag: 'bridal' },
    { url: 'https://images.unsplash.com/photo-1491349174775-aaaefdd81942?w=400&h=400&fit=crop&crop=face', label: 'Nude Look', tag: 'natural' },
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Sarah L.', type: 'Bride', date: 'March 2026',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      quote: 'Super nice and long-lasting makeup! I felt like a princess on my wedding day. Absolutely worth every peso!'
    },
    {
      name: 'Jessica M.', type: 'Debut Client', date: 'February 2026',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      quote: 'Amazing work! My makeup was perfect for my debut. So many compliments! Will definitely rebook Lumière.'
    },
    {
      name: 'Anne R.', type: 'Photoshoot', date: 'January 2026',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
      quote: 'Very professional & so talented. The photoshoot look was flawless on camera. Highly recommended!'
    },
  ];

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
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);

    // Listen to Firebase Auth state
    this.authService.currentUser$.subscribe(async (user) => {
      if (user) {
        try {
          const userData = await this.userService.getUser(user.uid);
          if (userData && userData.role === 'client') {
            this.currentUser = {
              name: userData.name || 'Guest User',
              email: userData.email || '',
              phone: userData.phone || '',
              avatar: '',
              memberTier: 'Silver',
              bookingCount: 3,
              points: userData.loyaltyPoints || 450,
              reviews: 2,
              joinDate: 'January 2025',
              recentBookings: [
                { service: 'Bridal Makeup', date: 'Mar 15, 2026', status: 'Upcoming' },
                { service: 'Event Glam', date: 'Feb 20, 2026', status: 'Completed' },
              ]
            };
          } else {
            this.currentUser = null;
          }
        } catch {
          this.currentUser = null;
        }
      } else {
        this.currentUser = null;
      }
      this.cdr.detectChanges();
    });

    const today = new Date();
    this.minBookDate = today.toISOString().split('T')[0];
    this.bookDate = this.minBookDate;

    this.filteredPortfolio = [...this.allPortfolio];
    this.updateDisplayed();

    // Auto-collapse sidebar on small screens
    if (window.innerWidth <= 700) {
      this.sidebarCollapsed = true;
    }
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
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

    setTimeout(() => {
      const ticketId = 'BK-' + Math.floor(100000 + Math.random() * 900000);
      let displayPayment = this.bookPayment;
      if (this.bookPayment !== 'Pay Onsite') {
        const acc = this.bookPaymentAccount.trim();
        const masked = acc.length > 4 ? '*'.repeat(acc.length - 4) + acc.slice(-4) : acc;
        displayPayment += ` (${masked})`;
      }

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
      
      this.myTickets.unshift(ticket);
      this.generatedTicket = ticket;
      
      this.bookDate = '';
      this.bookTime = '';
      this.bookService = '';
      this.bookArtist = null;
      this.bookPayment = '';
      this.bookPaymentAccount = '';
      this.bookNotes = '';
      this.filteredArtists = [];
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
    conv.unread = 0; // mark as read
  }

  backToInbox(): void {
    this.chatView = 'inbox';
    this.activeChat = null;
  }

  sendMessage(): void {
    if (!this.activeChat) return;
    const text = this.chatInput.trim();
    if (!text) return;
    
    // Add user message
    this.activeChat.messages.push({
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me'
    });
    this.chatInput = '';

    // Mock artist reply after delay
    this.isArtistTyping = true;
    setTimeout(() => {
      this.isArtistTyping = false;
      this.activeChat.messages.push({
        text: 'Got it! I will prep exactly what you need. See you soon! 💕',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sender: 'artist'
      });
      if (!this.chatOpen || this.chatView === 'inbox' || this.activeChat.id !== this.activeChat.id) {
         this.activeChat.unread = (this.activeChat.unread || 0) + 1;
      }
      this.cdr.detectChanges();
    }, 2500);
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