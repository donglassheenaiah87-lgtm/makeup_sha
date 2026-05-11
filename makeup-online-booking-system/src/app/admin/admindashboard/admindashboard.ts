import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { UserService, UserData } from '../../core/user.service';
import { BookingService, BookingData } from '../../core/booking.service';
import { ServiceItemService, ServiceData } from '../../core/service-item.service';
import { PaymentService } from '../../core/payment.service';
import { ReviewService, Review as ReviewData } from '../../core/review.service';
import { ReportService, IncidentReport } from '../../core/report.service';
import { EmergencyService, ArtistExcuse } from '../../core/emergency.service';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

interface Booking {
  id: string | number;
  client: string;
  service: string;
  artist: string;
  date: string;
  amount: string;
  paymentMethod?: string;
  paymentAccount?: string;
  status: string;
  phone?: string;
  notes?: string;
  bookingDate?: string;
  bookingTime?: string;
}

interface Addon {
  name: string;
  desc: string;
  price: string;
  selected: boolean;
}

interface Client {
  uid?: string;
  name: string;
  email: string;
  phone: string;
  bookings: number;
  joined: string;
  status: string;
  totalSpent: string;
  lastVisit?: string;
  favoriteService?: string;
}

interface Artist {
  uid?: string;
  name: string;
  initials: string;
  specialty: string;
  email: string;
  bookings: number;
  rating: number;
  status: string;
  revenue: string;
  availability: string;
  phone?: string;
  joinedDate?: string;
  completionRate?: number;
}

interface Service {
  id?: string;
  icon?: string;
  imageUrl?: string;
  name: string;
  desc: string;
  price: string;
  duration: string;
  bookings: number;
  status: string;
}

interface Notification {
  id: number;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

interface CalendarDay {
  day: number;
  bookings: Booking[];
  isToday: boolean;
  isEmpty: boolean;
}

interface Review {
  id: string;
  client: string;
  artist: string;
  service: string;
  rating: number;
  comment: string;
  date: string;
  status: 'published' | 'pending' | 'flagged';
  reply?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './admindashboard.html',
  styleUrls: ['./admindashboard.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  sidebarCollapsed = false;
  activeTab = 'overview';
  searchQuery = '';
  bookingFilter = 'all';
  bookingView = 'table'; 
  showNotifPanel = false;
  showModal = false;
  modalType = '';
  showConfirmDialog = false;
  confirmAction = '';
  confirmTarget: Record<string, unknown> | null = null;
  isSaving = false;
  toastMessage = '';
  toastType = 'success';
  toastVisible = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  currentTime = '';
  currentDate = '';
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private subs: Subscription[] = [];

  // Detail view
  selectedBooking: Booking | null = null;
  selectedClient: Client | null = null;
  selectedArtist: Artist | null = null;

  // Calendar
  calendarMonth = 'March 2026';
  calendarDays: CalendarDay[] = [];
  selectedCalDay: CalendarDay | null = null;

  // Export
  exportFormat = 'csv';

  // ── Form Models ──
  newBooking: Partial<Booking> = {};
  newClient: Partial<Client> = {};
  newArtist: Partial<Artist> = {};
  newService: Partial<Service> = {};
  imagePreview: string | ArrayBuffer | null = null;

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  get pageTitle(): string {
    const titles: Record<string, string> = {
      overview: 'Dashboard Overview', bookings: 'Bookings',
      clients: 'Clients', artists: 'Artists', services: 'Services',
      reports: 'Reports', notifications: 'Notifications',
      reviews: 'Client Reviews', support: 'Support & Emergencies',
      settings: 'Settings',
    };
    return titles[this.activeTab] || 'Dashboard';
  }

  get pageSubtitle(): string {
    const subs: Record<string, string> = {
      overview: "Welcome back, Admin! Here's what's happening today.",
      bookings: 'Manage and track all bookings.',
      clients: 'View and manage your client base.',
      artists: 'Manage your makeup artists.',
      services: 'Configure your service offerings.',
      reports: 'Analytics and revenue overview.',
      notifications: 'Stay on top of all alerts and updates.',
      reviews: 'Manage client feedback and artist ratings.',
      support: 'Monitor incident reports and artist emergencies.',
      settings: 'Configure your system preferences.',
    };
    return subs[this.activeTab] || '';
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.showNotifPanel = false;
  }

  // ── Stats ──
  stats = [
    { icon: '📋', label: 'Total Bookings',  value: '0',    change: '0 pending',   positive: true  },
    { icon: '👤', label: 'Total Clients',   value: '0',      change: 'Across all time',    positive: true  },
    { icon: '🎨', label: 'Active Artists',  value: '0',       change: '0 active',  positive: true  },
    { icon: '💰', label: 'Admin Earnings (10%)',   value: '₱0', change: '₱0 avg/booking', positive: true },
  ];

  // ── Notifications ──
  notifications: Notification[] = [
    { id: 1, type: 'system', message: 'System connected to Firebase successfully', time: 'Just now', read: false }
  ];

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }
  markAllRead(): void { this.notifications.forEach(n => n.read = true); this.showToast('All notifications marked as read', 'success'); }
  markRead(n: Notification): void { n.read = true; }

  // ── Dynamic Data ──
  recentBookings: Booking[] = [];
  allBookings: Booking[] = [];
  clients: Client[] = [];
  artistsList: Artist[] = [];
  services: Service[] = [];

  incidentReports: IncidentReport[] = [];
  excuseRequests: ArtistExcuse[] = [];
  payoutRequests: any[] = [];

  isLoading = true;
  dataLoadedCount = 0;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private userService: UserService,
    private bookingService: BookingService,
    private serviceItemService: ServiceItemService,
    private paymentService: PaymentService,
    private reviewService: ReviewService,
    private reportService: ReportService,
    private emergencyService: EmergencyService,
    private firestore: Firestore,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    
    // Fetch data from Firebase
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    // Fallback just in case Firebase takes too long or silently fails
    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 3000);
    // 1. Clients Real-time
    this.subs.push(this.userService.getUsersByRoleRealtime('client').subscribe({
      next: (data) => {
        this.clients = data.map(c => {
          return {
            uid: c.uid,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            bookings: 0,
            joined: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'New',
            status: 'active',
            totalSpent: '0',
            favoriteService: '—'
          };
        });
        this.recalculateAggregates();
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Clients sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));

    // 2. Artists Real-time
    this.subs.push(this.userService.getUsersByRoleRealtime('artist').subscribe({
      next: (data) => {
        this.artistsList = data.map(a => {
          const initials = a.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
          return {
            uid: a.uid,
            name: a.name,
            initials,
            specialty: a.specialty || 'General',
            email: a.email,
            bookings: 0,
            rating: a.rating || 0,
            status: a.status || 'pending',
            revenue: '0',
            availability: 'Available',
            phone: a.phone || '',
            joinedDate: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'New',
            completionRate: 100
          };
        });
        this.recalculateAggregates();
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Artists sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));

    // 3. Services Real-time
    this.subs.push(this.serviceItemService.getAllServicesRealtime().subscribe({
      next: (data) => {
        this.services = data.map(s => ({
          id: s.id,
          icon: s.icon || '',
          imageUrl: s.imageUrl || '',
          name: s.name,
          desc: s.desc || '',
          price: s.price,
          duration: s.duration || '1 hr',
          bookings: s.bookings || 0,
          status: s.status || 'active'
        }));
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Services sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));

    // 4. Bookings Real-time
    this.subs.push(this.bookingService.getAllBookingsRealtime().subscribe({
      next: (data) => {
        this.allBookings = data.map(b => ({
          id: b.id,
          client: b.clientName,
          service: b.serviceName,
          artist: b.artistName,
          date: b.date,
          amount: b.amount,
          paymentMethod: b.paymentMethod || 'Pay Onsite',
          paymentAccount: b.paymentAccount || '',
          status: b.status,
          phone: b.phone || '',
          notes: b.notes || ''
        }));
        this.stats[0].value = this.allBookings.length.toString();
        this.recentBookings = [...this.allBookings].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }).slice(0, 5);
        if (this.recentBookings.length === 0) this.recentBookings = [...this.allBookings].reverse().slice(0, 5);
        
        this.buildCalendar();
        this.recalculateAggregates();
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Bookings sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));

    // 5. Reviews Real-time
    this.subs.push(this.reviewService.getAllReviewsRealtime().subscribe({
      next: (data) => {
        this.reviews = data.map(r => ({
          id: r.reviewId,
          client: r.clientName || 'Anonymous',
          artist: r.artistName || 'Unknown Artist',
          service: r.service || 'General Service',
          rating: r.starRating,
          comment: r.reviewMessage,
          date: r.date || 'Today',
          status: (r as any).status || 'published',
          reply: (r as any).reply || ''
        }));
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Reviews sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));

    // 6. Incident Reports Real-time
    this.subs.push(this.reportService.getAllReportsRealtime().subscribe({
      next: (data) => {
        this.incidentReports = data;
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Reports sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));

    // 7. Excuse Requests Real-time
    this.subs.push(this.emergencyService.getAllEmergenciesRealtime().subscribe({
      next: (data) => {
        this.excuseRequests = data;
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Excuses sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));

    // 8. Payout Requests Real-time
    this.subs.push(this.paymentService.getAllPayoutRequestsRealtime().subscribe({
      next: (data) => {
        this.payoutRequests = data;
        this.checkIfLoaded();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Payouts sync error:', err);
        this.checkIfLoaded();
        this.cdr.detectChanges();
      }
    }));
  }

  checkIfLoaded() {
    if (this.isLoading) {
      this.dataLoadedCount++;
      if (this.dataLoadedCount >= 8) {
        this.isLoading = false;
      }
    }
  }

  countByStatus(status: string): number {
    return this.allBookings.filter(b => b.status === status).length;
  }

  get filteredBookings(): Booking[] {
    let list = this.allBookings;
    if (this.bookingFilter !== 'all') list = list.filter(b => b.status === this.bookingFilter);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(b =>
        b.client.toLowerCase().includes(q) ||
        b.service.toLowerCase().includes(q) ||
        b.artist.toLowerCase().includes(q) ||
        String(b.id).includes(q)
      );
    }
    return list;
  }

  async updateBookingStatus(booking: Booking, status: string) {
    if (typeof booking.id === 'string' && booking.id.length > 5) {
      // It's a Firestore booking
      await this.bookingService.updateBookingStatus(booking.id.toString(), status);
    }
    booking.status = status;
    this.showToast(`Booking #${booking.id} marked as ${status}`, 'success');
  }

  deleteBooking(booking: Booking): void {
    this.confirmTarget = booking as unknown as Record<string, unknown>;
    this.confirmAction = 'deleteBooking';
    this.showConfirmDialog = true;
  }

  viewBookingDetail(booking: Booking): void {
    this.selectedBooking = booking;
    this.modalType = 'viewBooking';
    this.showModal = true;
  }

  get filteredClients(): Client[] {
    if (!this.searchQuery.trim()) return this.clients;
    const q = this.searchQuery.toLowerCase();
    return this.clients.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  }

  deleteClient(client: Client): void {
    this.confirmTarget = client as unknown as Record<string, unknown>;
    this.confirmAction = 'deleteClient';
    this.showConfirmDialog = true;
  }

  viewClientDetail(client: Client): void {
    this.selectedClient = client;
    this.modalType = 'viewClient';
    this.showModal = true;
  }

  getClientBookings(clientName: string): Booking[] {
    return this.allBookings.filter(b => b.client === clientName);
  }

  // ── Top Artists ──
  topArtists: any[] = [];

  get filteredArtists(): Artist[] {
    if (!this.searchQuery.trim()) return this.artistsList;
    const q = this.searchQuery.toLowerCase();
    return this.artistsList.filter(a => a.name.toLowerCase().includes(q) || a.specialty.toLowerCase().includes(q));
  }

  deleteArtist(artist: Artist): void {
    this.confirmTarget = artist as unknown as Record<string, unknown>;
    this.confirmAction = 'deleteArtist';
    this.showConfirmDialog = true;
  }

  async approveArtist(artist: Artist) {
    if (artist.uid) {
      await this.userService.updateUser(artist.uid, { status: 'approved' });
      // Also update the dedicated 'artists' collection if it exists
      try {
        const artistRef = doc(this.firestore, `artists/${artist.uid}`);
        await updateDoc(artistRef, { status: 'approved' });
      } catch (e) {}
    }
    artist.status = 'approved';
    this.showToast(`${artist.name} approved!`, 'success');
  }

  async rejectArtist(artist: Artist) {
    if (artist.uid) {
      await this.userService.updateUser(artist.uid, { status: 'rejected' });
      try {
        const artistRef = doc(this.firestore, `artists/${artist.uid}`);
        await updateDoc(artistRef, { status: 'rejected' });
      } catch (e) {}
    }
    artist.status = 'rejected';
    this.showToast(`${artist.name} application rejected.`, 'error');
  }

  async toggleArtistStatus(artist: Artist) {
    const newStatus = artist.status === 'approved' ? 'inactive' : 'approved';
    if (artist.uid) {
      await this.userService.updateUser(artist.uid, { status: newStatus });
      try {
        const artistRef = doc(this.firestore, `artists/${artist.uid}`);
        await updateDoc(artistRef, { status: newStatus });
      } catch (e) {}
    }
    artist.status = newStatus;
    this.showToast(`${artist.name} status updated to ${newStatus}`, 'success');
  }

  viewArtistDetail(artist: Artist): void {
    this.selectedArtist = artist;
    this.modalType = 'viewArtist';
    this.showModal = true;
  }

  getArtistBookings(artistName: string): Booking[] {
    return this.allBookings.filter(b => b.artist === artistName);
  }

  getRatingStars(rating: number): string[] {
    return Array.from({ length: 5 }, (_, i) => i < Math.floor(rating) ? '★' : '☆');
  }

  deleteService(service: Service): void {
    this.confirmTarget = service as unknown as Record<string, unknown>;
    this.confirmAction = 'deleteService';
    this.showConfirmDialog = true;
  }

  editService(service: Service): void {
    this.modalType = 'editService';
    this.newService = { ...service };
    this.imagePreview = service.imageUrl || null;
    this.showModal = true;
  }

  async toggleServiceStatus(service: Service) {
    const newStatus = service.status === 'active' ? 'inactive' : 'active';
    if (service.id) {
       await this.serviceItemService.updateServiceStatus(service.id, newStatus);
    }
    service.status = newStatus;
    this.showToast(`${service.name} status updated`, 'success');
  }

  // ── Reports ──
  reportPeriod = 'monthly';
  monthlyData: any[] = [];
  serviceBreakdown: any[] = [];
  reportKpis: any[] = [
    { label: 'Best Month',      value: 'None',  sub: '₱0 revenue', icon: '🏆' },
    { label: 'Top Artist',      value: 'N/A',  sub: '0 bookings • 0⭐', icon: '🎨' },
    { label: 'Avg per Booking', value: '₱0',  sub: 'Across all services', icon: '💵' },
    { label: 'Total Clients',   value: '0',  sub: 'Active in database', icon: '👤' },
  ];

  get maxRevenue(): number { return this.monthlyData.length > 0 ? Math.max(...this.monthlyData.map(m => m.revenue), 1) : 1; }
  get totalRevenueYTD(): number { return this.monthlyData.reduce((s, m) => s + m.revenue, 0); }
  get totalBookingsYTD(): number { return this.monthlyData.reduce((s, m) => s + m.bookings, 0); }

  private recalculateAggregates(): void {
    // Consider both 'confirmed' and 'completed' bookings for revenue and ranking metrics
    const validBookings = this.allBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');

    // Update Clients
    this.clients.forEach(c => {
      const cb = validBookings.filter(b => b.client === c.name);
      c.bookings = cb.length;
      c.totalSpent = cb.reduce((sum, b) => sum + (parseInt(String(b.amount).replace(/[^0-9]/g, '')) || 0), 0).toLocaleString();
    });

    // Update Artists
    this.artistsList.forEach(a => {
      const ab = validBookings.filter(b => b.artist === a.name);
      a.bookings = ab.length;
      a.revenue = ab.reduce((sum, b) => sum + ((parseInt(String(b.amount).replace(/[^0-9]/g, '')) || 0) * 0.9), 0).toLocaleString();
    });

    // Update Top Artists Array based on valid bookings
    this.topArtists = [...this.artistsList].sort((a, b) => b.bookings - a.bookings).slice(0, 4);
    
    this.calculateReports(validBookings);
  }

  private calculateReports(validBookings: Booking[]): void {
    // 1. ALWAYS UPDATE OVERVIEW STATS (Counts & basic lists)
    this.stats[0].value = this.allBookings.length.toString();
    this.stats[0].change = `${this.allBookings.filter(b => b.status === 'pending').length} pending`;
    this.stats[1].value = this.clients.length.toString();
    this.stats[1].change = `Across all time`;
    this.stats[2].value = this.artistsList.length.toString();
    this.stats[2].change = `${this.artistsList.filter(a => a.status === 'active').length} active`;

    const topArtist = [...this.artistsList].sort((a, b) => b.bookings - a.bookings)[0];

    // If no bookings, we update what we can and stop before calculating revenue
    if (this.allBookings.length === 0) {
      this.stats[3].value = `₱0`;
      this.stats[3].change = `₱0 avg/booking`;
      this.reportKpis = [
        { label: 'Best Month', value: 'None', sub: '₱0 admin earnings', icon: '🏆' },
        { label: 'Top Artist', value: topArtist?.name || 'N/A', sub: `${topArtist?.bookings || 0} confirmed bookings • ${topArtist?.rating || 0}⭐`, icon: '🎨' },
        { label: 'Avg per Booking', value: '₱0', sub: 'Across confirmed bookings (Admin Cut)', icon: '💵' },
        { label: 'Total Clients', value: this.clients.length.toString(), sub: 'Active in database', icon: '👤' },
      ];
      return;
    }

    // 1. Monthly Revenue & Bookings (based on valid bookings)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = new Map<string, { revenue: number, bookings: number }>();
    
    months.forEach(m => monthlyMap.set(m, { revenue: 0, bookings: 0 }));

    validBookings.forEach(b => {
      let d = new Date(b.date);
      if (isNaN(d.getTime())) {
        d = new Date(); // Fallback to today if date is missing or 'TBD'
      }
      const monthName = months[d.getMonth()];
      const current = monthlyMap.get(monthName)!;
      const amount = (parseInt(String(b.amount).replace(/[^0-9]/g, '')) || 0) * 0.1; // Admin gets 10%
      monthlyMap.set(monthName, {
        revenue: current.revenue + amount,
        bookings: current.bookings + 1
      });
    });

    this.monthlyData = months.map(m => ({
      month: m,
      revenue: monthlyMap.get(m)!.revenue,
      bookings: monthlyMap.get(m)!.bookings
    })).filter(m => m.revenue > 0 || m.bookings > 0);

    // 2. Service Breakdown (based on valid bookings)
    const serviceCounts = new Map<string, number>();
    validBookings.forEach(b => {
      serviceCounts.set(b.service, (serviceCounts.get(b.service) || 0) + 1);
    });

    const colors = ['#c9a84c', '#60c080', '#6090d0', '#c060a0', '#5a7a9a', '#e09040', '#40b0a0'];
    let idx = 0;
    const totalValid = validBookings.length || 1;
    this.serviceBreakdown = Array.from(serviceCounts.entries()).map(([name, count]) => ({
      name,
      percent: Math.round((count / totalValid) * 100),
      color: colors[idx++ % colors.length]
    })).sort((a, b) => b.percent - a.percent);

    // 3. KPIs
    const totalRev = this.monthlyData.reduce((s, m) => s + m.revenue, 0);
    const avg = validBookings.length > 0 ? Math.round(totalRev / validBookings.length) : 0;
    
    let bestMonthName = 'None';
    let maxMonthRev = -1;
    this.monthlyData.forEach(m => {
      if (m.revenue > maxMonthRev) {
        maxMonthRev = m.revenue;
        bestMonthName = m.month;
      }
    });

    this.reportKpis = [
      { label: 'Best Month', value: bestMonthName, sub: `₱${maxMonthRev.toLocaleString()} admin earnings`, icon: '🏆' },
      { label: 'Top Artist', value: topArtist?.name || 'N/A', sub: `${topArtist?.bookings || 0} confirmed bookings • ${topArtist?.rating || 0}⭐`, icon: '🎨' },
      { label: 'Avg per Booking', value: `₱${avg.toLocaleString()}`, sub: 'Across confirmed bookings (Admin Cut)', icon: '💵' },
      { label: 'Total Clients', value: this.clients.length.toString(), sub: 'Active in database', icon: '👤' },
    ];

    // Update Overview Stats for Revenue
    this.stats[3].value = `₱${totalRev.toLocaleString()}`;
    this.stats[3].change = `₱${avg.toLocaleString()} avg/booking`;
  }

  // ── Calendar ──
  buildCalendar(): void {
    const daysInMonth = 31;
    const startDay = 0; 
    this.calendarDays = [];

    for (let i = 0; i < startDay; i++) {
      this.calendarDays.push({ day: 0, bookings: [], isToday: false, isEmpty: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayBookings = this.allBookings.filter(b => {
        const parts = b.date.split(' ');
        return parts[1] && parseInt(parts[1]) === d;
      });
      this.calendarDays.push({ day: d, bookings: dayBookings, isToday: d === 16, isEmpty: false });
    }
  }

  selectCalDay(day: CalendarDay): void {
    if (day.isEmpty) return;
    this.selectedCalDay = this.selectedCalDay?.day === day.day ? null : day;
  }

  // ── Export ──
  exportBookings(): void {
    const headers = ['ID', 'Client', 'Service', 'Artist', 'Date', 'Amount', 'Status', 'Phone'];
    const rows = this.filteredBookings.map(b =>
      [b.id, b.client, b.service, b.artist, b.date, '₱' + b.amount, b.status, b.phone || ''].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'glowbook-bookings.csv'; a.click();
    URL.revokeObjectURL(url);
    this.showToast('Bookings exported as CSV!', 'success');
  }

  exportClients(): void {
    const headers = ['Name', 'Email', 'Phone', 'Bookings', 'Total Spent', 'Status', 'Joined'];
    const rows = this.clients.map(c =>
      [c.name, c.email, c.phone, c.bookings, '₱' + c.totalSpent, c.status, c.joined].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'glowbook-clients.csv'; a.click();
    URL.revokeObjectURL(url);
    this.showToast('Clients exported as CSV!', 'success');
  }

  // ── Settings ──
  settings = {
    adminName: 'Super Admin',
    email: 'admin@glowbook.com',
    password: '',
    businessName: 'GlowBook',
    leadTime: 24,
    currency: 'PHP',
    emailNotifs: true,
    smsNotifs: false,
    autoConfirm: false,
    darkMode: true,
    maintenanceMode: false,
  };

  saveSettings(): void { this.showToast('Settings saved successfully!', 'success'); }

  // Auto-suggest artists when service is selected
  suggestedArtists: Artist[] = [];
  otherArtists: Artist[] = [];
  autoAssignedArtist = false;

  bookingAddons: Addon[] = [];

  get selectedAddons(): Addon[] {
    return this.bookingAddons.filter(a => a.selected);
  }

  toggleAddon(addon: Addon): void { addon.selected = !addon.selected; }

  getBasePrice(): string {
    if (!this.newBooking.service) return '0';
    const svc = this.services.find(s => s.name === this.newBooking.service);
    return svc ? svc.price : '0';
  }

  getTotalPrice(): string {
    const baseStr = String(this.getBasePrice());
    const base = parseInt(baseStr.replace(/[^0-9]/g, '')) || 0;
    const addonsTotal = this.selectedAddons.reduce((sum, a) => sum + (parseInt(String(a.price).replace(/[^0-9]/g, '')) || 0), 0);
    const total = base + addonsTotal;
    return total.toLocaleString();
  }

  onServiceChange(): void {
    const service = this.newBooking.service;
    if (!service) {
      this.suggestedArtists = [];
      this.otherArtists = this.artistsList.filter(a => a.status === 'active');
      this.newBooking.artist = '';
      this.autoAssignedArtist = false;
      return;
    }
    const activeArtists = this.artistsList.filter(a => a.status === 'active');
    this.suggestedArtists = activeArtists.filter(a => a.specialty.includes(service.split(' ')[0]));
    this.otherArtists = activeArtists.filter(a => !a.specialty.includes(service.split(' ')[0]));

    if (this.suggestedArtists.length > 0) {
      const best = this.suggestedArtists.reduce((prev, cur) => cur.rating > prev.rating ? cur : prev);
      this.newBooking.artist = best.name;
      this.autoAssignedArtist = true;
      const svc = this.services.find(s => s.name === service);
      if (svc) this.newBooking.amount = svc.price;
    } else {
      this.newBooking.artist = '';
      this.autoAssignedArtist = false;
    }
  }

  getArtistForBooking(name: string): Artist | undefined {
    return this.artistsList.find(a => a.name === name);
  }

  // ── Reviews ──
  reviews: Review[] = [];
  reviewFilter = 'all'; 
  reviewReplyText = '';
  selectedReview: Review | null = null;

  get filteredReviews(): Review[] {
    let list = this.reviews;
    if (this.reviewFilter !== 'all') list = list.filter(r => r.status === this.reviewFilter);
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r => r.client.toLowerCase().includes(q) || r.artist.toLowerCase().includes(q) || r.service.toLowerCase().includes(q));
    }
    return list;
  }

  get avgRating(): string {
    if (this.reviews.length === 0) return '0.0';
    const sum = this.reviews.reduce((s, r) => s + r.rating, 0);
    return (sum / this.reviews.length).toFixed(1);
  }

  getReviewCountByRating(star: number): number {
    return this.reviews.filter(r => r.rating === star).length;
  }

  getRatingPercent(star: number): number {
    if (this.reviews.length === 0) return 0;
    return Math.round((this.getReviewCountByRating(star) / this.reviews.length) * 100);
  }

  openReviewReply(review: Review): void {
    this.selectedReview = review;
    this.reviewReplyText = review.reply || '';
    this.modalType = 'replyReview';
    this.showModal = true;
  }

  async saveReviewReply() {
    if (this.selectedReview) {
      this.selectedReview.reply = this.reviewReplyText;
      await this.reviewService.updateReviewReply(this.selectedReview.id, this.reviewReplyText);
      this.showToast('Reply saved to Firebase!', 'success');
    }
    this.closeModal();
  }

  async updateReviewStatus(review: Review, status: 'published' | 'pending' | 'flagged') {
    review.status = status;
    await this.reviewService.updateReviewStatus(review.id, status);
    this.showToast(`Review ${status} in Firebase`, 'success');
  }

  deleteReview(review: Review): void {
    this.confirmTarget = review as unknown as Record<string, unknown>;
    this.confirmAction = 'deleteReview';
    this.showConfirmDialog = true;
  }

  getRatingStarsArray(rating: number): boolean[] {
    return Array.from({ length: 5 }, (_, i) => i < rating);
  }

  getReviewCountByStatus(status: string): number {
    return this.reviews.filter(r => r.status === status).length;
  }

  // ── Modal ──
  openModal(type: string): void {
    this.modalType = type;
    if (type === 'addBooking') {
      this.newBooking = {};
      this.suggestedArtists = [];
      this.otherArtists = this.artistsList.filter(a => a.status === 'active');
      this.autoAssignedArtist = false;
      this.bookingAddons.forEach(a => a.selected = false);
    }
    if (type === 'addClient') this.newClient = {};
    if (type === 'addArtist') this.newArtist = {};
    if (type === 'addService') { this.newService = {}; this.imagePreview = null; }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedBooking = null;
    this.selectedClient = null;
    this.selectedArtist = null;
  }

  async saveModal() {
    if (this.isSaving) return;
    this.isSaving = true;
    try {
    if (this.modalType === 'addBooking') {
      const b = this.newBooking;
      if (!b.client || !b.service || !b.artist) { this.showToast('Please fill all required fields', 'error'); return; }
      const dateStr = b.bookingDate && b.bookingTime
        ? `${b.bookingDate} ${b.bookingTime}`
        : b.bookingDate || b.bookingTime || new Date().toLocaleString();

      // If admin books, automatically add client to database if they don't exist
      const existingClient = this.clients.find(c => c.name.toLowerCase() === b.client!.toLowerCase());
      if (!existingClient) {
        const fakeUid = 'client-' + Math.random().toString(36).substring(7);
        await this.userService.createUser(fakeUid, {
          name: b.client,
          email: b.client!.replace(/\s+/g, '').toLowerCase() + '@walkin.com',
          phone: b.phone || '',
          role: 'client',
          status: 'active'
        });
      }
      
      await this.bookingService.addBooking({
        clientName: b.client!, 
        serviceName: b.service!, 
        artistName: b.artist!,
        date: dateStr, 
        amount: this.getTotalPrice(),
        paymentMethod: 'Pay Onsite',
        paymentAccount: 'Cash',
        status: 'confirmed', // Admin bookings are considered instant/face-to-face payments
        phone: b.phone || '',
        notes: b.notes || '',
        createdAt: new Date()
      });
      
      await this.paymentService.addPayment({
        clientName: b.client!,
        amount: this.getTotalPrice(),
        paymentMethod: 'Pay Onsite',
        paymentAccount: 'Cash',
        status: 'completed',
        createdAt: new Date()
      });
      this.showToast('Walk-in booking added & confirmed successfully!', 'success');
    }
    if (this.modalType === 'addClient') {
      const c = this.newClient;
      if (!c.name || !c.email) { this.showToast('Please fill all required fields', 'error'); return; }
      
      // Usually users are created via Auth, but Admin can create a record directly for now if needed.
      // Easiest is to generate a random UID if we bypass Auth, but let's assume `userService` creates a document.
      const fakeUid = 'client-' + Math.random().toString(36).substring(7);
      await this.userService.createUser(fakeUid, {
        name: c.name!, email: c.email!, phone: c.phone || '', role: 'client', createdAt: new Date()
      });
      this.showToast('Client added to Firebase successfully!', 'success');
    }
    if (this.modalType === 'addArtist') {
      const a = this.newArtist;
      if (!a.name || !a.email) { this.showToast('Please fill all required fields', 'error'); return; }
      const fakeUid = 'artist-' + Math.random().toString(36).substring(7);
      await this.userService.createUser(fakeUid, {
        name: a.name!, email: a.email!, phone: a.phone || '', specialty: a.specialty || 'General', role: 'artist', rating: 0, ratingCount: 0, createdAt: new Date()
      });
      this.showToast('Artist added to Firebase successfully!', 'success');
    }
    if (this.modalType === 'addService') {
      const s = this.newService;
      if (!s.name || !s.price) { this.showToast('Please fill all required fields', 'error'); return; }
      await this.serviceItemService.addService({
        icon: s.icon || '', 
        imageUrl: this.imagePreview as string || '',
        name: s.name!, 
        desc: s.desc || '', 
        price: s.price!, 
        duration: s.duration || '1 hr', 
        bookings: 0, 
        status: 'active',
        createdAt: new Date()
      });
      this.showToast('Service added to Firebase successfully!', 'success');
    }
    if (this.modalType === 'editService') {
      const s = this.newService;
      if (!s.name || !s.price) { this.showToast('Please fill all required fields', 'error'); return; }
      if (s.id) {
        await this.serviceItemService.updateService(s.id, {
          imageUrl: this.imagePreview as string || '',
          name: s.name,
          desc: s.desc || '',
          price: s.price,
          duration: s.duration || '1 hr'
        });
        this.showToast('Service updated successfully!', 'success');
      }
    }
    this.closeModal();
    } catch (error) {
      console.error('Error saving modal:', error);
      this.showToast('Error saving data. Please try again.', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  // ── Confirm Dialog ──
  async confirmDialogAction() {
    try {
      if (this.confirmAction === 'deleteBooking' && this.confirmTarget) {
        const target = this.confirmTarget as unknown as Booking;
        if (target.id) await this.bookingService.deleteBooking(target.id.toString());
        this.showToast('Booking deleted from Firebase', 'success');
      }
      if (this.confirmAction === 'deleteClient' && this.confirmTarget) {
        const target = this.confirmTarget as unknown as Client;
        if (target.uid) await this.userService.deleteUser(target.uid);
        this.showToast('Client removed from Firebase', 'success');
      }
      if (this.confirmAction === 'deleteArtist' && this.confirmTarget) {
        const target = this.confirmTarget as unknown as Artist;
        if (target.uid) await this.userService.deleteUser(target.uid);
        this.showToast('Artist removed from Firebase', 'success');
      }
      if (this.confirmAction === 'deleteService' && this.confirmTarget) {
        const target = this.confirmTarget as unknown as Service;
        if (target.id) await this.serviceItemService.deleteService(target.id.toString());
        this.showToast('Service deleted from Firebase', 'success');
      }
      if (this.confirmAction === 'deleteReview' && this.confirmTarget) {
        const target = this.confirmTarget as unknown as Review;
        if (target.id) await this.reviewService.deleteReview(target.id);
        this.showToast('Review deleted from Firebase', 'success');
      }
    } catch (e) {
      this.showToast('Error deleting item', 'error');
    }
    this.cancelConfirm();
  }

  cancelConfirm(): void { this.showConfirmDialog = false; this.confirmTarget = null; this.confirmAction = ''; }

  // ── Toast ──
  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toastMessage = message; this.toastType = type; this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, 3000);
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    this.currentDate = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // ── Support & Emergencies ──
  async updateReportStatus(report: IncidentReport, status: 'open' | 'investigating' | 'resolved' | 'closed') {
    report.status = status;
    await this.reportService.updateReportStatus(report.id, status);
    this.showToast(`Report #${report.id.slice(0, 6)} marked as ${status}`, 'success');
  }

  async resolveExcuse(excuse: ArtistExcuse) {
    excuse.status = 'resolved';
    await this.emergencyService.resolveEmergency(excuse.id);
    this.showToast(`Emergency for ${excuse.artistName} resolved`, 'success');
  }

  async processPayout(payout: any, status: 'approved' | 'rejected' | 'processed') {
    payout.status = status;
    await this.paymentService.updatePayoutStatus(payout.id, status);
    this.showToast(`Payout for ${payout.artistName} ${status}`, 'success');
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}