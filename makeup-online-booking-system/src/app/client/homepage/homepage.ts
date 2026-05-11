import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { AuthService } from '../../core/auth.service';
import { UserService, UserData } from '../../core/user.service';
import { ServiceItemService } from '../../core/service-item.service';
import { ArtistAvailabilityService } from '../../core/artist-availability.service';
import { Subscription } from 'rxjs';
import { ChatService, Conversation, Message } from '../../core/chat.service';
@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './homepage.html',
  styleUrl: './homepage.css'
})
export class HomepageComponent implements OnInit, OnDestroy {

  isDarkMode = true;
  isNavbarScrolled = false;
  isMobileMenuOpen = false;
  isProfileDropdownOpen = false;
  currentAnnouncement = 0;
  openFaqIndex: number | null = null;
  bookingSubmitted = false;
  isBookingLoading = false;

  // ── Quick Booking (Logged-in Users) ──
  isQuickBookingModalOpen = false;
  quickBookingStep: 'service' | 'artist' = 'service';
  selectedService: any = null;
  selectedArtist: any = null;
  quickBookingForm = {
    date: '',
    time: '',
    specialty: '',
    email: '',
    fullName: '',
    uid: ''
  };
  isQuickBookingLoading = false;
  quickBookingSuccess = false;

  // ── My Bookings Modal ──
  isMyBookingsModalOpen = false;
  
  // ── Messages Modal ──
  isMessagesModalOpen = false;
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  chatMessages: Message[] = [];
  newMessageText = '';
  private convSub?: Subscription;
  private msgSub?: Subscription;

  isLoggedIn = false;
  currentUser: UserData | null = null;
  private authSub?: Subscription;
  private artistsSub?: Subscription;

  greeting = '';
  bookings: any[] = [];

  private announcementInterval: any;
  private revealObserver: IntersectionObserver | null = null;

  announcements = [
    'Limited Bridal Slots for 2026 — Book Now ✦',
    'Free Bridal Trial — Exclusively for 2026 Brides ✦',
    'Davao City · Nationwide Home Service Available ✦'
  ];



  bookingForm = {
    // Step 1: Personal
    firstName: '', lastName: '', fullName: '', contactNumber: '', email: '', venue: '', age: null as number | null, gender: '',
    // Step 2: Service
    service: '', eventType: '', preferredArtist: '', message: '',
    allergies: '', skinSensitivity: '', medicalConcerns: '', eventDate: '',
    time: '', package: '',
    // Step 3: Payment
    paymentMethod: '', bookingRef: '', amount: 'TBD'
  };
  currentBookingStep = 1;
  bookingRef = '';

  services: any[] = [];
  isServicesLoading = false;
  hasServicesError = false;
  private servicesSub?: Subscription;

  artists: any[] = [];
  isArtistsLoading = false;
  hasArtistsError = false;

  testimonials = [
    { quote: 'Sophia made me feel like an absolute queen on my wedding day. The airbrush foundation lasted 12 hours through happy tears and dancing. Worth every peso!', name: 'Maria Santos', event: 'Wedding · March 2025', rating: 5, initials: 'MS' },
    { quote: 'Isabelle understood my editorial vision perfectly and executed it beautifully. The photos came out stunning. Will definitely book again!', name: 'Carla Mendez', event: 'Editorial Shoot · January 2025', rating: 5, initials: 'CM' },
    { quote: 'Camille is an angel! She did my debut makeup and I received so many compliments. She also did my lashes beautifully. 100% recommended!', name: 'Angela Reyes', event: 'Debut · December 2024', rating: 5, initials: 'AR' }
  ];

  faqs = [
    { q: 'How far in advance should I book?', a: 'We recommend booking at least 2–3 months in advance for bridal services, and 2–4 weeks for other events. Peak season (December–April) fills up quickly!' },
    { q: 'Do you offer free trials for brides?', a: 'Yes! All brides receive one complimentary bridal trial session. This ensures your look is perfected before the big day.' },
    { q: 'What areas do you service?', a: 'Our studio is based in Davao City, but we offer nationwide home service for special events. Travel fees may apply outside Davao.' },
    { q: 'What products do you use?', a: 'We use premium luxury brands including MAC, NARS, Charlotte Tilbury, and Airbase — all dermatologist-tested and long-lasting.' },
    { q: 'Can I request a specific artist?', a: 'Absolutely! You may request your preferred artist during booking, subject to availability. We recommend booking early to secure your top choice.' },
    { q: 'What is your cancellation policy?', a: 'Cancellations 7+ days before the event receive a full refund. Within 7 days, 50% is retained. Same-day cancellations are non-refundable.' }
  ];

  pricing = [
    { name: 'Essentials', price: '₱1,800', badge: null, features: ['1 Makeup Service', 'Natural Glam Look', 'Professional Products', 'Touch-up Kit', '1 Hour Session'] },
    { name: 'Signature', price: '₱4,000', badge: 'Best Value', features: ['Full Glam Makeup', 'Airbrush Foundation', 'Lash Application', 'Hairstyling Included', 'Touch-up Kit', '2–3 Hour Session'] },
    { name: 'Luxury Bridal', price: '₱8,500', badge: null, features: ['Bridal Makeup', 'Free Trial Session', 'Airbrush Finish', 'Bridal Lashes', 'Hairstyling', 'On-site Touch-ups', 'All Day Coverage'] }
  ];

  navLinks = [
    { label: 'Home', id: 'hero' }, { label: 'Services', id: 'services' },
    { label: 'Artists', id: 'artists' }, { label: 'Our Team', id: 'team' },
    { label: 'Process', id: 'process' }, { label: 'Gallery', id: 'gallery' },
    { label: 'Pricing', id: 'pricing' }, { label: 'Reviews', id: 'reviews' },
    { label: 'FAQ', id: 'faq' }, { label: 'Contact', id: 'contact' }
  ];

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private authService: AuthService,
    private userService: UserService,
    private serviceItemService: ServiceItemService,
    private artistAvailabilityService: ArtistAvailabilityService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private elRef: ElementRef
  ) {}

  async ngOnInit() {
    document.documentElement.setAttribute('data-theme', 'dark');
    this.startAnnouncementRotation();
    this.setupScrollReveal();
    this.setGreeting();

    const loadFallbackServices = () => {
      this.services = [
        { num: '01', name: 'Bridal Elegance', desc: 'Timeless bridal looks crafted for your perfect day with premium luxury products.', price: '₱8,500', duration: '4–6 hrs', popular: true, image: 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?q=80&w=800&auto=format&fit=crop' },
        { num: '02', name: 'Glam & Party', desc: 'Head-turning glam for events, parties, and every special celebration.', price: '₱3,200', duration: '2–3 hrs', popular: false, image: 'https://images.unsplash.com/photo-1512496115851-a1c8f1307e5e?q=80&w=800&auto=format&fit=crop' },
        { num: '03', name: 'Editorial & Shoots', desc: 'High-fashion editorial looks for photo shoots and creative projects.', price: '₱4,000', duration: '3–4 hrs', popular: false, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop' },
        { num: '04', name: 'Airbrush Finish', desc: 'Flawless long-lasting airbrushed foundation for a camera-ready finish.', price: '₱2,800', duration: '1.5–2 hrs', popular: false, image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=800&auto=format&fit=crop' },
        { num: '05', name: 'Everyday Glam', desc: 'Natural, polished everyday looks for work, dates, or casual outings.', price: '₱1,800', duration: '1–1.5 hrs', popular: false, image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=800&auto=format&fit=crop' },
        { num: '06', name: 'VIP Home Service', desc: 'Full luxury studio experience brought right to your doorstep.', price: '₱5,500', duration: '3–5 hrs', popular: false, image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop' }
      ];
    };

    this.isServicesLoading = true;
    this.hasServicesError = false;
    this.servicesSub = this.serviceItemService.getAllServicesRealtime().subscribe({
      next: (dbServices) => {
        console.log('[DEBUG] Firebase fetched services:', dbServices);
        const activeServices = dbServices.filter(s => s.status !== 'inactive');
        if (activeServices.length > 0) {
          this.services = activeServices.map((s, index) => ({
            num: String(index + 1).padStart(2, '0'),
            name: s.name || 'Signature Service',
            desc: s.desc || 'A premium luxury service.',
            price: s.price || 'Price varies',
            duration: s.duration || 'TBD',
            popular: s.bookings > 10,
            image: s.imageUrl || 'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?q=80&w=800&auto=format&fit=crop'
          }));
        } else {
          loadFallbackServices();
        }
        this.isServicesLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          document.querySelectorAll('.services-grid .reveal').forEach(el => this.revealObserver?.observe(el));
        }, 100);
      },
      error: (e) => {
        console.error('[DEBUG] Firebase Error fetching services:', e);
        this.isServicesLoading = false;
        this.hasServicesError = true;
        this.services = [];
        this.cdr.detectChanges();
      }
    });

    const loadFallbackArtists = () => {
      this.artists = [
        { name: 'Sophia Reyes', specialty: 'Lead Artist', years: '8+', ratingCount: '300+', rating: 5.0, services: ['Bridal', 'Airbrush', 'Luxury'], bio: 'With 8+ years of mastery, Sophia transforms every bride into a vision of timeless elegance.', profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop' },
        { name: 'Isabelle Cruz', specialty: 'Editorial Specialist', years: '5+', ratingCount: '180+', rating: 4.9, services: ['Editorial', 'SFX', 'Runway'], bio: 'Isabelle blends artistry and avant-garde vision to create striking editorial looks.', profilePicture: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800&auto=format&fit=crop' },
        { name: 'Camille Torres', specialty: 'Glam & Party Specialist', years: '4+', ratingCount: '120+', rating: 5.0, services: ['Debuts', 'Lash Work', 'Glam'], bio: 'Camille brings joy and radiant glamour to every client.', profilePicture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop' }
      ];
    };

    this.isArtistsLoading = true;
    this.hasArtistsError = false;
    this.artistsSub = this.userService.getUsersByRoleRealtime('artist').subscribe({
      next: (dbArtists) => {
        console.log('[DEBUG] Firebase fetched artists from users collection:', dbArtists);
        
        if (dbArtists && dbArtists.length > 0) {
          this.artists = dbArtists.map(a => ({
            ...a,
            specialty: a.specialty || 'Professional Artist',
            bio: a.bio || 'A talented artist dedicated to making you look your best.',
            years: (a as any)['years'] || '3+',
            ratingCount: a.ratingCount || '50+',
            rating: a.rating || 5.0,
            profilePicture: a.profilePicture || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
            services: a.services && a.services.length > 0 ? a.services : ['Bridal', 'Airbrush', 'Luxury']
          }));
          console.log('[DEBUG] Mapped artists array:', this.artists);
        } else {
          console.warn('[DEBUG] Firebase returned an empty array after filtering. Using fallback artists to maintain design.');
          loadFallbackArtists();
        }
        this.isArtistsLoading = false;
        this.cdr.detectChanges(); // Force Angular to render the new state
        
        // FIX: The newly rendered .reveal elements must be observed, otherwise they stay at opacity: 0
        setTimeout(() => {
          document.querySelectorAll('.artists-grid .reveal').forEach(el => this.revealObserver?.observe(el));
        }, 100);
      },
      error: (e) => {
        console.error('[DEBUG] Firebase Error fetching artists:', e);
        this.isArtistsLoading = false;
        
        // Let's show the actual Error UI instead of masking it with fallback data
        // This will help us know if Firebase is denying permissions!
        this.hasArtistsError = true; 
        this.artists = [];
        this.cdr.detectChanges(); // Force Angular to render the error state
      }
    });

    this.authSub = this.authService.currentUser$.subscribe(async (user) => {
      if (user) {
        this.isLoggedIn = true;
        this.currentUser = await this.userService.getUser(user.uid);
        this.bookings = await this.bookingService.getBookingsByClient(user.uid) || [];
        
        // Pre-fill full booking form for registered users
        if (this.currentUser) {
          this.bookingForm.firstName = this.currentUser.firstName || this.currentUser.name?.split(' ')[0] || '';
          this.bookingForm.lastName = this.currentUser.lastName || this.currentUser.name?.split(' ').slice(1).join(' ') || '';
          this.bookingForm.email = this.currentUser.email || '';
          this.bookingForm.contactNumber = this.currentUser.phone || '';
        }

        // Subscribe to conversations
        if (this.convSub) this.convSub.unsubscribe();
        this.convSub = this.chatService.getConversationsForClient(user.uid).subscribe(convs => {
          this.conversations = convs;
          this.cdr.detectChanges();
        });
      } else {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.bookings = [];
        this.conversations = [];
        if (this.convSub) this.convSub.unsubscribe();
        if (this.msgSub) this.msgSub.unsubscribe();
        // Reset form for guests
        this.bookingForm = {
          firstName: '', lastName: '', fullName: '', contactNumber: '', email: '', venue: '', age: null, gender: '',
          service: '', eventType: '', preferredArtist: '', message: '',
          allergies: '', skinSensitivity: '', medicalConcerns: '', eventDate: '',
          time: '', package: '',
          paymentMethod: '', bookingRef: '', amount: 'TBD'
        };
      }
    });
  }

  ngOnDestroy() {
    if (this.announcementInterval) clearInterval(this.announcementInterval);
    if (this.revealObserver) this.revealObserver.disconnect();
    if (this.authSub) this.authSub.unsubscribe();
    if (this.artistsSub) this.artistsSub.unsubscribe();
    if (this.servicesSub) this.servicesSub.unsubscribe();
    if (this.convSub) this.convSub.unsubscribe();
    if (this.msgSub) this.msgSub.unsubscribe();
  }

  startAnnouncementRotation() {
    this.announcementInterval = setInterval(() => {
      this.currentAnnouncement = (this.currentAnnouncement + 1) % this.announcements.length;
    }, 3500);
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleFaq(i: number) { this.openFaqIndex = this.openFaqIndex === i ? null : i; }
  toggleMobileMenu() { this.isMobileMenuOpen = !this.isMobileMenuOpen; }
  toggleProfileDropdown() { this.isProfileDropdownOpen = !this.isProfileDropdownOpen; }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const profileWrap = this.elRef.nativeElement.querySelector('.profile-wrap');
    if (profileWrap && !profileWrap.contains(event.target as Node)) {
      this.isProfileDropdownOpen = false;
    }
  }

  setGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 18) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }

  async logout() {
    await this.authService.logout();
    this.isProfileDropdownOpen = false;
    this.router.navigate(['/login']);
  }

  get firstName() {
    const name = this.currentUser?.firstName || (this.currentUser?.name ? this.currentUser.name.split(' ')[0] : '');
    if (name === 'Client' || name === 'User' || !name) return 'Beautiful';
    return name;
  }

  get userInitial() {
    return this.currentUser?.firstName?.[0] || this.currentUser?.name?.[0] || 'U';
  }

  getServiceName(sp: any): string {
    if (!sp) return '';
    return typeof sp === 'string' ? sp : (sp.name || 'Service');
  }

  getArtistFirstName(a: any): string {
    if (!a) return 'Artist';
    return a.firstName || (a.name ? a.name.split(' ')[0] : 'Artist');
  }

  get upcomingBookings() {
    const now = new Date();
    return this.bookings.filter(b => {
      const d = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(b.eventDate);
      return d >= now && b.status !== 'cancelled';
    }).slice(0, 3);
  }

  get pastBookings() {
    const now = new Date();
    return this.bookings.filter(b => {
      const d = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(b.eventDate);
      return d < now;
    }).slice(0, 3);
  }

  formatDate(raw: any): string {
    if (!raw) return '—';
    const d = raw.toDate ? raw.toDate() : new Date(raw);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      confirmed: '#2ecc71', pending: '#f1c40f',
      cancelled: '#e74c3c', completed: '#C6A35D'
    };
    return map[status] || '#8a7060';
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.isMobileMenuOpen = false;
  }

  // ── New Modal Handlers ──
  openMyBookings() {
    if (!this.isLoggedIn) return;
    this.isMyBookingsModalOpen = true;
    this.isProfileDropdownOpen = false;
  }

  closeMyBookings() {
    this.isMyBookingsModalOpen = false;
  }

  openMessages() {
    if (!this.isLoggedIn) return;
    this.isMessagesModalOpen = true;
    this.isProfileDropdownOpen = false;
    if (this.conversations.length > 0) {
      if (!this.selectedConversation) {
        this.selectConversation(this.conversations[0]);
      } else {
        // Refresh selected conversation data and RESTORE subscription
        const updated = this.conversations.find(c => c.id === this.selectedConversation?.id);
        if (updated) {
          this.selectConversation(updated);
        } else {
          this.selectConversation(this.conversations[0]);
        }
      }
    }
  }

  closeMessages() {
    this.isMessagesModalOpen = false;
    if (this.msgSub) this.msgSub.unsubscribe();
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    if (this.msgSub) this.msgSub.unsubscribe();
    this.msgSub = this.chatService.getMessages(conv.id).subscribe(msgs => {
      this.chatMessages = msgs;
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
    this.chatService.markAsRead(conv.id, 'client');
  }

  async sendChatMessage() {
    if (!this.selectedConversation || !this.currentUser) return;
    const text = this.newMessageText.trim();
    if (!text) return;

    const metadata = {
      artistId: this.selectedConversation.artistId,
      clientId: this.currentUser.uid,
      artistName: this.selectedConversation.artistName,
      clientName: this.currentUser.name || this.currentUser.email || 'Valued Client',
      artistImage: this.selectedConversation.artistImage || '',
      clientImage: this.currentUser.profilePicture || ''
    };

    try {
      await this.chatService.sendMessage(
        this.selectedConversation.id,
        this.currentUser.uid,
        this.selectedConversation.artistId,
        text,
        'client',
        metadata
      );
      this.newMessageText = '';
      this.cdr.detectChanges();
      this.scrollToBottom();
    } catch (e) {
      console.error("Error sending message:", e);
    }
  }

  async startChat(artist: any) {
    if (!this.isLoggedIn || !this.currentUser) {
      this.scrollTo('booking');
      return;
    }

    const conversationId = `${artist.uid}_${this.currentUser.uid}`;
    const metadata = {
      artistId: artist.uid,
      clientId: this.currentUser.uid,
      artistName: artist.name,
      clientName: this.currentUser.name || this.currentUser.email || 'Valued Client',
      artistImage: artist.profilePicture || '',
      clientImage: this.currentUser.profilePicture || '',
      unreadArtist: 0,
      unreadClient: 0,
      lastMessage: 'Chat started',
      lastTime: null,
      participants: [artist.uid, this.currentUser.uid],
      createdAt: null
    };

    await this.chatService.initializeConversation(conversationId, metadata);
    this.openMessages();
    
    // Find or wait for the conversation to appear in the list
    setTimeout(() => {
      const conv = this.conversations.find(c => c.id === conversationId);
      if (conv) {
        this.selectConversation(conv);
      } else {
        // Fallback: manually set it if listener is slow
        this.selectConversation({ ...metadata, id: conversationId } as any);
      }
    }, 500);
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  }



  // ═══════════════════════════════════════
  // ── QUICK BOOKING METHODS ──
  // ═══════════════════════════════════════

  openQuickServiceBooking(service: any) {
    if (!this.isLoggedIn) {
      this.scrollTo('booking');
      return;
    }
    this.selectedService = service;
    this.selectedArtist = null;
    this.quickBookingStep = 'service';
    this.quickBookingForm.specialty = service.name;
    this.prepareQuickForm();
    this.isQuickBookingModalOpen = true;
  }

  openQuickArtistBooking(artist: any) {
    if (!this.isLoggedIn) {
      this.scrollTo('booking');
      return;
    }
    this.selectedArtist = artist;
    this.selectedService = null;
    this.quickBookingStep = 'artist';
    this.quickBookingForm.specialty = ''; // User must choose from list
    this.prepareQuickForm();
    this.isQuickBookingModalOpen = true;
  }

  openQuickBooking() {
    if (!this.isLoggedIn) {
      this.scrollTo('booking');
      return;
    }
    this.selectedService = null;
    this.selectedArtist = null;
    this.quickBookingStep = 'service';
    this.prepareQuickForm();
    this.isQuickBookingModalOpen = true;
  }

  onMobileBookClick() {
    if (this.isLoggedIn) {
      this.openQuickBooking();
    } else {
      this.scrollTo('booking');
    }
    this.toggleMobileMenu();
  }

  private prepareQuickForm() {
    if (this.currentUser) {
      let name = this.currentUser.name || `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim();
      if (!name || name === 'Client User' || name === 'User') {
        name = this.currentUser.email ? this.currentUser.email.split('@')[0] : 'Valued Client';
      }
      this.quickBookingForm.fullName = name;
      this.quickBookingForm.email = this.currentUser.email || '';
      this.quickBookingForm.uid = this.currentUser.uid;
    }
    this.quickBookingForm.date = '';
    this.quickBookingForm.time = '';
    this.quickBookingSuccess = false;
  }

  closeQuickBooking() {
    this.isQuickBookingModalOpen = false;
  }

  async confirmQuickBooking() {
    if (!this.isLoggedIn || !this.currentUser) return;
    if (!this.quickBookingForm.date || !this.quickBookingForm.time || !this.quickBookingForm.specialty) {
      alert('Please complete all fields.');
      return;
    }

    this.isQuickBookingLoading = true;
    try {
      const artistId = this.selectedArtist ? this.selectedArtist.uid : null;
      if (artistId) {
        const isAvail = await this.artistAvailabilityService.isArtistAvailable(artistId, this.quickBookingForm.date, this.quickBookingForm.time);
        if (!isAvail) {
          alert('Sorry, this artist is not available at the selected date and time.');
          this.isQuickBookingLoading = false;
          return;
        }
      }

      const artistName = this.selectedArtist ? this.selectedArtist.name : (this.selectedService?.preferredArtist || 'No Preference');
      // artistId is already declared at 410
      const serviceName = this.quickBookingForm.specialty;
      const amount = this.selectedService ? this.selectedService.price : 'TBD';

      await this.bookingService.addBooking({
        clientId: this.currentUser.uid,
        clientName: this.quickBookingForm.fullName,
        email: this.quickBookingForm.email,
        serviceName: serviceName,
        artistName: artistName,
        artistId: artistId || '',
        date: this.quickBookingForm.date,
        time: this.quickBookingForm.time,
        amount: amount,
        status: 'pending',
        createdAt: new Date()
      } as any);

      this.quickBookingSuccess = true;
      setTimeout(() => {
        this.closeQuickBooking();
      }, 2500);
    } catch (error) {
      console.error('Quick booking error:', error);
      alert('Failed to save booking. Please try again.');
    } finally {
      this.isQuickBookingLoading = false;
    }
  }



  // ── GUEST WIZARD METHODS ──
  nextStep() {
    if (this.validateStep(this.currentBookingStep)) {
      this.currentBookingStep++;
      if (this.currentBookingStep === 3) {
        this.calculateAmount();
      }
      this.scrollTo('booking');
    }
  }

  prevStep() {
    if (this.currentBookingStep > 1) {
      this.currentBookingStep--;
      this.scrollTo('booking');
    }
  }

  validateStep(step: number): boolean {
    const f = this.bookingForm;
    if (step === 1) {
      if (!f.firstName || !f.lastName || !f.contactNumber || !f.email || !f.venue) {
        alert('Please fill in all required fields.'); return false;
      }
      if (!f.email.includes('@')) { alert('Please enter a valid email.'); return false; }
      return true;
    }
    if (step === 2) {
      if (!f.service || !f.eventDate) {
        alert('Please select a service and date.'); return false;
      }
      return true;
    }
    if (step === 3) {
      if (!f.paymentMethod) {
        alert('Please select a payment method.'); return false;
      }
      return true;
    }
    return true;
  }

  calculateAmount() {
    const selected = this.services.find(s => s.name === this.bookingForm.service);
    this.bookingForm.amount = selected ? selected.price : 'TBD';
  }

  generateBookingRef() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = 'LUM-';
    for (let i = 0; i < 6; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    this.bookingRef = res;
    this.bookingForm.bookingRef = res;
  }

  async submitBooking() {
    this.isBookingLoading = true;
    this.generateBookingRef();
    
    // Find artist object to get the ID (Foreign Key)
    const selectedArtistObj = this.artists.find(a => a.name === this.bookingForm.preferredArtist);
    const artistId = selectedArtistObj ? selectedArtistObj.uid : '';

    try {
      if (artistId) {
        const isAvail = await this.artistAvailabilityService.isArtistAvailable(artistId, this.bookingForm.eventDate, this.bookingForm.time);
        if (!isAvail) {
          alert('Sorry, the selected artist is not available for this date/time. Please choose another slot or artist.');
          this.isBookingLoading = false;
          return;
        }
      }

      await this.bookingService.addBooking({
        clientId: this.currentUser?.uid || '', // Key fix: associate with user if logged in
        firstName: this.bookingForm.firstName,
        lastName: this.bookingForm.lastName,
        clientName: `${this.bookingForm.firstName} ${this.bookingForm.lastName}`,
        email: this.bookingForm.email,
        phone: this.bookingForm.contactNumber,
        venue: this.bookingForm.venue,
        age: this.bookingForm.age as any,
        gender: this.bookingForm.gender,

        serviceName: this.bookingForm.service,
        artistName: this.bookingForm.preferredArtist || 'No Preference',
        artistId: artistId,
        date: this.bookingForm.eventDate,
        time: this.bookingForm.time,
        package: this.bookingForm.package,
        amount: this.bookingForm.amount,
        
        notes: this.bookingForm.message,
        allergies: this.bookingForm.allergies,
        skinSensitivity: this.bookingForm.skinSensitivity,
        medicalConcerns: this.bookingForm.medicalConcerns,

        paymentMethod: this.bookingForm.paymentMethod,
        bookingRef: this.bookingRef,
        status: 'pending',
        createdAt: new Date()
      } as any);
      
      this.currentBookingStep = 4; // Move to Success Step
      this.bookingSubmitted = true;
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('There was an error saving your booking. Please try again.');
    } finally {
      this.isBookingLoading = false;
    }
  }

  getTime(): string { return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
  getStars(n: number): number[] { return Array(n).fill(0); }

  @HostListener('window:scroll')
  onScroll() { this.isNavbarScrolled = window.scrollY > 60; }

  setupScrollReveal() {
    if (typeof window === 'undefined') return;
    this.revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
    }, { threshold: 0.08 });
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => this.revealObserver?.observe(el));
    }, 200);
  }

}
