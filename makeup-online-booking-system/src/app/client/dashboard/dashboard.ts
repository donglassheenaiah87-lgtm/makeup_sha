// dashboard.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  // ── UI state ───────────────────────────────────────────
  isScrolled = false;
  sidebarCollapsed = false;
  profilePanelOpen = false;
  activeSection = 'home';

  // ── Toast ──────────────────────────────────────────────
  toastVisible = false; toastTitle = ''; toastMessage = '';
  toastIcon = 'fas fa-check-circle'; toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  // ── Modals ─────────────────────────────────────────────
  svcModalOpen = false; activeSvc: Service | null = null;
  lbOpen = false; lbIdx = 0;

  // ── Book ───────────────────────────────────────────────
  bookDate = ''; bookService = ''; bookNotes = ''; minBookDate = '';

  // ── Search ─────────────────────────────────────────────
  searchQuery = ''; searchResults: any[] = [];

  // ── Wishlist ───────────────────────────────────────────
  wishlistCount = 0;

  // ── Portfolio ──────────────────────────────────────────
  portfolioTab = 'all'; filteredPortfolio: PortfolioImage[] = [];
  displayedCount = 8; displayedPortfolio: PortfolioImage[] = [];

  // ── User ───────────────────────────────────────────────
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
      name: 'Anika Reyes', firstName: 'Anika', role: 'Lead Bridal Artist', rating: '5.0', exp: '8 yrs', clients: 300,
      image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=460&fit=crop&crop=face',
      specialties: ['Bridal', 'Glam', 'Airbrush']
    },
    {
      name: 'Sofia Cruz', firstName: 'Sofia', role: 'Editorial Specialist', rating: '4.9', exp: '6 yrs', clients: 220,
      image: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&h=460&fit=crop&crop=face',
      specialties: ['Editorial', 'SFX', 'Event']
    },
    {
      name: 'Mia Santos', firstName: 'Mia', role: 'Natural Beauty Expert', rating: '4.8', exp: '5 yrs', clients: 180,
      image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=400&h=460&fit=crop&crop=face',
      specialties: ['Natural', 'Skincare', 'Glam']
    },
    {
      name: 'Leila Torres', firstName: 'Leila', role: 'Event & Debut Artist', rating: '4.9', exp: '7 yrs', clients: 260,
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
    { name: 'Sarah L.', type: 'Bride', date: 'March 2026', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', quote: 'Super nice and long-lasting makeup! I felt like a princess on my wedding day. Absolutely worth every peso!' },
    { name: 'Jessica M.', type: 'Debut Client', date: 'February 2026', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', quote: 'Amazing work! My makeup was perfect for my debut. So many compliments! Will definitely rebook Lumière.' },
    { name: 'Anne R.', type: 'Photoshoot', date: 'January 2026', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', quote: 'Very professional & so talented. The photoshoot look was flawless on camera. Highly recommended!' },
  ];

  ratingBars = [
    { label: '5★', pct: 92 }, { label: '4★', pct: 6 }, { label: '3★', pct: 2 }
  ];

  faqs: FAQ[] = [
    {
      // FIX: The word "You'll" contains a single quote. Since the string is also wrapped in single quotes, you must escape it with a backslash (\) like this: "You\'ll"
      // Otherwise, the IDE thinks the string has ended prematurely, causing "Unterminated string literal" and "ll does not exist" errors.
      question: 'How do I book an appointment?', answer: 'Click "Book Now", select your preferred date and service, and complete the form. You\'ll receive a confirmation within minutes.', open: false },
    { question: 'Do you offer a trial session before the wedding?', answer: 'Yes! Our Bridal package includes a pre-wedding trial so you can see your look and request adjustments.', open: false },
    { question: 'What products do you use?', answer: 'We use premium, dermatologist-tested brands safe for all skin types — long-lasting and photography-friendly.', open: false },
    { question: 'Can I reschedule or cancel my booking?', answer: 'Yes! Rescheduling is free up to 48 hours before your appointment. Cancellations within 24 hours may incur a small fee.', open: false },
    { question: 'Do you offer group bookings?', answer: 'Absolutely! We offer special group rates for bridal parties, debuts, and corporate events. Contact us for a custom quote.', open: false },
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

  constructor(private router: Router) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const stored = localStorage.getItem('lumiere_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        this.currentUser = {
          name: u.name || 'Guest User',
          email: u.email || '',
          phone: u.phone || '',
          avatar: u.avatar || '',
          memberTier: u.memberTier || 'Silver',
          bookingCount: u.bookingCount || 3,
          points: u.points || 450,
          reviews: u.reviews || 2,
          joinDate: u.joinDate || 'January 2025',
          recentBookings: u.recentBookings || [
            { service: 'Bridal Makeup', date: 'Mar 15, 2026', status: 'Upcoming' },
            { service: 'Event Glam', date: 'Feb 20, 2026', status: 'Completed' },
          ]
        };
      } catch { this.currentUser = null; }
    }
    const today = new Date();
    this.minBookDate = today.toISOString().split('T')[0];
    this.bookDate = this.minBookDate;
    this.filteredPortfolio = [...this.allPortfolio];
    this.updateDisplayed();
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
      if (el && el.getBoundingClientRect().top <= 140) { this.activeSection = id; break; }
    }
  }

  @HostListener('document:keydown.escape')
  onEsc(): void { this.closeServiceModal(); this.closeLightbox(); this.closeProfilePanel(); }

  // ── Toast ──────────────────────────────────────────────
  showToast(title: string, msg: string, icon = 'fas fa-check-circle', type: 'success' | 'error' = 'success'): void {
    this.toastTitle = title; this.toastMessage = msg;
    this.toastIcon = icon; this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3500);
  }

  // ── Navigation ─────────────────────────────────────────
  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeSection = id; this.searchQuery = '';
  }
  goToLogin(): void { this.router.navigate(['/login']); }
  goToSignup(): void { this.router.navigate(['/signup']); }
  goToBook(): void {
    const user = localStorage.getItem('lumiere_user');
    if (user) { this.router.navigate(['/book']); }
    else { this.showToast('Login Required', 'Please log in to book an appointment 💕', 'fas fa-lock', 'error'); setTimeout(() => this.router.navigate(['/login']), 1500); }
  }
  logout(): void {
    localStorage.removeItem('lumiere_user');
    this.currentUser = null;
    this.closeProfilePanel();
    this.showToast('Logged Out', 'You have been logged out successfully.', 'fas fa-sign-out-alt', 'success');
  }

  // ── Profile Panel ──────────────────────────────────────
  openProfilePanel(): void { this.profilePanelOpen = true; document.body.style.overflow = 'hidden'; }
  closeProfilePanel(): void { this.profilePanelOpen = false; document.body.style.overflow = ''; }

  // ── Service Modal ──────────────────────────────────────
  openServiceModal(s: Service): void { this.activeSvc = s; this.svcModalOpen = true; document.body.style.overflow = 'hidden'; }
  closeServiceModal(): void { this.svcModalOpen = false; this.activeSvc = null; document.body.style.overflow = ''; }

  // ── Wishlist ───────────────────────────────────────────
  toggleWish(s: Service): void {
    s.wishlisted = !s.wishlisted;
    this.wishlistCount = this.services.filter(x => x.wishlisted).length;
    this.showToast(s.wishlisted ? 'Saved!' : 'Removed', s.wishlisted ? `${s.name} added to wishlist 💕` : `${s.name} removed.`, s.wishlisted ? 'fas fa-heart' : 'fas fa-heart-broken', 'success');
  }
  showWishlistToast(): void {
    const saved = this.services.filter(x => x.wishlisted);
    if (!saved.length) this.showToast('Wishlist', 'Save services you love using the heart button!', 'fas fa-heart', 'success');
    else this.showToast('Wishlist', `You have ${saved.length} saved: ${saved.map(s => s.name).join(', ')}`, 'fas fa-heart', 'success');
  }

  // ── Portfolio ──────────────────────────────────────────
  filterPortfolio(tab: string): void {
    this.portfolioTab = tab;
    this.filteredPortfolio = tab === 'all' ? [...this.allPortfolio] : this.allPortfolio.filter(p => p.tag === tab);
    this.displayedCount = 8;
    this.updateDisplayed();
  }
  loadMore(): void { this.displayedCount = Math.min(this.displayedCount + 4, this.filteredPortfolio.length); this.updateDisplayed(); }
  updateDisplayed(): void { this.displayedPortfolio = this.filteredPortfolio.slice(0, this.displayedCount); }

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
      ...this.services.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
        .map(s => ({ name: s.name, category: s.category, icon: s.icon, section: 'services' })),
      ...this.artists.filter(a => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q))
        .map(a => ({ name: a.name, category: a.role, icon: 'fas fa-user-circle', section: 'artists' })),
    ].slice(0, 6);
  }
  clearSearchDelay(): void { setTimeout(() => { this.searchResults = []; }, 200); }

  // ── Book ───────────────────────────────────────────────
  getServicePrice(name: string): number { return this.services.find(s => s.name === name)?.price ?? 0; }
  handleBook(): void {
    if (!this.bookDate || !this.bookService) { this.showToast('Missing Info', 'Please select a date and service.', 'fas fa-exclamation-circle', 'error'); return; }
    this.goToBook();
  }

  // ── FAQ ────────────────────────────────────────────────
  toggleFaq(i: number): void { this.faqs = this.faqs.map((f, idx) => ({ ...f, open: idx === i ? !f.open : false })); }

  // ── Newsletter ─────────────────────────────────────────
  subscribe(): void {
    if (!this.newsletterEmail.includes('@')) { this.showToast('Invalid Email', 'Please enter a valid email.', 'fas fa-envelope', 'error'); return; }
    this.showToast('Subscribed!', 'Thank you for joining! ✨', 'fas fa-heart', 'success');
    this.newsletterEmail = '';
  }

  // ── Image fallback ─────────────────────────────────────
  onImgError(e: Event): void {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
  }
}