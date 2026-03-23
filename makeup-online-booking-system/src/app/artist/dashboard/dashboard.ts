import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { UserService } from '../../core/user.service';
import { AuthService } from '../../core/auth.service';

export interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  clientId: string;
  service: string;
  date: string;
  time: string;
  location: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

export interface PortfolioItem {
  url: string;
  caption: string;
}

export interface WeekDay {
  name: string;
  available: boolean;
  start: string;
  end: string;
}

export interface Review {
  clientName: string;
  clientId: string;
  rating: number;
  comment: string;
  date: string;
  service: string;
}

export interface Service {
  name: string;
  emoji: string;
  description: string;
  price: number;
  duration: string;
}

export interface Message {
  sender: 'artist' | 'client';
  text: string;
  time: string;
}

export interface Conversation {
  clientId: string;
  clientName: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
}

@Component({
  selector: 'app-artist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class ArtistDashboardComponent implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('chatBox') chatBox!: ElementRef<HTMLDivElement>;

  Math = Math;

  // ── UI State ──
  activeTab = 'overview';
  sidebarCollapsed = false;
  showNotifPanel = false;
  bookingFilter = 'all';
  profileSaved = false;
  scheduleSaved = false;
  messageSearch = '';
  newMessage = '';
  showServiceModal = false;
  editingServiceIndex = -1;
  showPayoutSuccess = false;
  showReportModal = false;

  // ── In-app Toast/Modal (replaces browser alert) ──
  toast: { show: boolean; type: 'success' | 'error' | 'info'; title: string; message: string } = {
    show: false, type: 'success', title: '', message: ''
  };
  showEmgSuccessModal = false;
  emgSuccessData: { affectedCount: number; reason: string } = { affectedCount: 0, reason: '' };

  showToast(type: 'success' | 'error' | 'info', title: string, message: string) {
    this.toast = { show: true, type, title, message };
    setTimeout(() => this.toast.show = false, 4000);
  }
  isPayoutLoading = false;
  payoutError = '';

  // ── Payout ──
  payoutForm = { amount: 0, method: '', accountNumber: '', accountName: '' };

  // ── Emergency ──
  activeEmergency: any = null;
  emergencyError = '';
  artistSearch = '';
  artistSpecialtyFilter = '';
  showHandoffModal = false;
  showHandoffSuccess = false;
  selectedArtist: any = null;
  handoffRequests: any[] = [];
  handoffWizardStep = 0;
  emergencyHistory: any[] = [];

  emergencyForm = { reason: '', details: '', affectedBookingIds: [] as string[], leaveStart: null as Date | null, leaveEnd: null as Date | null };
  handoffForm = { bookingId: '', message: '' };

  emergencyReasons = [
    { emoji: '🏥', label: 'Medical Emergency' },
    { emoji: '👨‍👩‍👧', label: 'Family Emergency' },
    { emoji: '🚗', label: 'Travel/Transport Issue' },
    { emoji: '🤒', label: 'Sudden Illness' },
    { emoji: '⚡', label: 'Natural Disaster' },
    { emoji: '❓', label: 'Other Emergency' },
  ];

  availableArtists: any[] = [
    { id: 'a1', name: 'Jessa Villanueva', specialty: 'Bridal, Glam', location: 'Makati City', rating: 4.9, totalJobs: 142, rateFrom: 1500 },
    { id: 'a2', name: 'Kaye Dela Cruz', specialty: 'Natural, SFX', location: 'Quezon City', rating: 4.7, totalJobs: 98, rateFrom: 1200 },
    { id: 'a3', name: 'Trisha Santos', specialty: 'Bridal, Debut', location: 'BGC, Taguig', rating: 4.8, totalJobs: 210, rateFrom: 2000 },
    { id: 'a4', name: 'Rina Aquino', specialty: 'Glam, Editorial', location: 'Pasig City', rating: 4.6, totalJobs: 75, rateFrom: 1800 },
    { id: 'a5', name: 'Mia Bautista', specialty: 'SFX, Editorial', location: 'Mandaluyong', rating: 4.9, totalJobs: 130, rateFrom: 2200 },
  ];

  lastPayout: any = null;
  reportForm = { type: '', description: '' };
  payoutHistory: any[] = [
    { method: 'gcash', accountNumber: '09171234567', accountName: 'Maria A.', amount: 1200, status: 'completed', requestedDate: 'Mar 18, 2026', expectedDate: 'Mar 19, 2026' },
    { method: 'maya', accountNumber: '09281234567', accountName: 'Maria A.', amount: 2500, status: 'processing', requestedDate: 'Mar 22, 2026', expectedDate: 'Mar 24, 2026' },
  ];

  // ── Artist Info ──
  artistName = 'Artist';
  artistInitials = 'A';
  artistSpecialty = 'Makeup Artist';

  // ── Stats ──
  stats = {
    totalBookings: 0,
    pending: 0,
    completed: 0,
    earnings: 0,
    totalEarnings: 0,
    avgRating: '0.0',
    avgEarning: 0,
    totalMessages: 0,
    availableBalance: 0
  };

  // ── Sample Bookings (replace with Firestore later) ──
  bookings: Booking[] = [
    { id: '1', clientId: 'c1', clientName: 'Maria Santos', clientPhone: '09171234567', service: 'Bridal Makeup', date: 'Mar 25, 2026', time: '9:00 AM', location: 'Makati City', amount: 3500, status: 'pending', notes: 'Wants natural dewy look' },
    { id: '2', clientId: 'c2', clientName: 'Ana Reyes', clientPhone: '09281234567', service: 'Glam Makeup', date: 'Mar 27, 2026', time: '2:00 PM', location: 'BGC, Taguig', amount: 1800, status: 'confirmed' },
    { id: '3', clientId: 'c3', clientName: 'Sofia Cruz', clientPhone: '09091234567', service: 'SFX Makeup', date: 'Mar 22, 2026', time: '10:00 AM', location: 'Quezon City', amount: 2500, status: 'completed' },
    { id: '4', clientId: 'c4', clientName: 'Liza Mendoza', clientPhone: '09151234567', service: 'Natural Makeup', date: 'Mar 20, 2026', time: '1:00 PM', location: 'Mandaluyong', amount: 1200, status: 'completed' },
    { id: '5', clientId: 'c5', clientName: 'Rose Aquino', clientPhone: '09321234567', service: 'Editorial Look', date: 'Mar 29, 2026', time: '3:00 PM', location: 'Pasig City', amount: 2200, status: 'pending' },
    { id: '6', clientId: 'c6', clientName: 'Claire Bautista', clientPhone: '09201234567', service: 'Debut Makeup', date: 'Apr 2, 2026', time: '7:00 AM', location: 'Las Piñas', amount: 4000, status: 'confirmed' },
  ];

  // ── Portfolio ──
  portfolioItems: PortfolioItem[] = [];

  // ── Schedule ──
  weekDays: WeekDay[] = [
    { name: 'Mon', available: true, start: '08:00', end: '18:00' },
    { name: 'Tue', available: true, start: '08:00', end: '18:00' },
    { name: 'Wed', available: true, start: '08:00', end: '18:00' },
    { name: 'Thu', available: true, start: '08:00', end: '18:00' },
    { name: 'Fri', available: true, start: '08:00', end: '18:00' },
    { name: 'Sat', available: true, start: '09:00', end: '17:00' },
    { name: 'Sun', available: false, start: '09:00', end: '17:00' },
  ];

  blockedDates: string[] = [];

  // ── Calendar ──
  calViewYear = new Date().getFullYear();
  calViewMonth = new Date().getMonth();
  calendarCells: any[] = [];
  availRange: { start: Date | null; end: Date | null } = { start: null, end: null };
  savedRanges: { start: Date; end: Date }[] = [];
  selectedCalDay: any = null;

  // ── Emergency Mini Calendar ──
  emgCalViewYear = new Date().getFullYear();
  emgCalViewMonth = new Date().getMonth();
  emgCalendarCells: any[] = [];

  // ── Reviews ──
  reviews: Review[] = [
    { clientName: 'Maria Santos', clientId: 'c1', rating: 5, comment: 'Absolutely stunning! My bridal look was exactly what I dreamed of. So professional and talented!', date: 'Mar 22, 2026', service: 'Bridal Makeup' },
    { clientName: 'Sofia Cruz', clientId: 'c3', rating: 5, comment: 'The SFX work was incredible. Everyone was amazed at the event. Will definitely book again!', date: 'Mar 22, 2026', service: 'SFX Makeup' },
    { clientName: 'Liza Mendoza', clientId: 'c4', rating: 4, comment: 'Really nice natural look. Very accommodating and the makeup lasted all day!', date: 'Mar 20, 2026', service: 'Natural Makeup' },
    { clientName: 'Joy Dela Cruz', clientId: 'c7', rating: 5, comment: 'Super galing! Napaganda talaga ang aking look for the debut. Highly recommended!', date: 'Mar 15, 2026', service: 'Debut Makeup' },
    { clientName: 'Karen Villanueva', clientId: 'c8', rating: 4, comment: 'Very skilled and patient. Listened to what I wanted. Would book again for future events.', date: 'Mar 10, 2026', service: 'Glam Makeup' },
  ];

  // ── Services ──
  services: Service[] = [
    { name: 'Bridal Makeup', emoji: '👰', description: 'Complete bridal look with airbrush finish', price: 3500, duration: '3-4 hours' },
    { name: 'Glam Makeup', emoji: '💫', description: 'Full glam for events, parties & celebrations', price: 1800, duration: '1.5-2 hours' },
    { name: 'Natural Makeup', emoji: '🌸', description: 'Soft and dewy everyday natural look', price: 1200, duration: '1-1.5 hours' },
    { name: 'SFX Makeup', emoji: '🎭', description: 'Special effects for films, shoots & events', price: 2500, duration: '2-3 hours' },
    { name: 'Debut Makeup', emoji: '🎀', description: 'Elegant debut look for your special 18th', price: 4000, duration: '3-4 hours' },
    { name: 'Editorial Look', emoji: '📸', description: 'Fashion-forward looks for photoshoots', price: 2200, duration: '2-2.5 hours' },
  ];

  serviceForm: Service = { name: '', emoji: '💄', description: '', price: 0, duration: '' };

  // ── Messages / Conversations ──
  conversations: Conversation[] = [
    {
      clientId: 'c1', clientName: 'Maria Santos',
      lastMessage: 'Thank you! See you on the 25th 😊',
      lastTime: '10:30 AM', unread: 2,
      messages: [
        { sender: 'client', text: 'Hi! I booked a bridal makeup for March 25.', time: '9:00 AM' },
        { sender: 'artist', text: 'Hello Maria! Yes, I confirmed your booking. So excited for your big day! 💍', time: '9:15 AM' },
        { sender: 'client', text: 'Can I request a natural dewy look?', time: '9:30 AM' },
        { sender: 'artist', text: 'Of course! That would look gorgeous on you. I will prepare accordingly. 🌸', time: '9:45 AM' },
        { sender: 'client', text: 'Thank you! See you on the 25th 😊', time: '10:30 AM' },
      ]
    },
    {
      clientId: 'c2', clientName: 'Ana Reyes',
      lastMessage: 'What time should I arrive?',
      lastTime: 'Yesterday', unread: 1,
      messages: [
        { sender: 'client', text: 'Hi! I am Ana, I have a booking on March 27.', time: 'Yesterday 2:00 PM' },
        { sender: 'artist', text: 'Hi Ana! Yes, I have you for Glam Makeup at 2PM. ✨', time: 'Yesterday 2:10 PM' },
        { sender: 'client', text: 'What time should I arrive?', time: 'Yesterday 3:00 PM' },
      ]
    },
    {
      clientId: 'c5', clientName: 'Rose Aquino',
      lastMessage: 'Looking forward to it!',
      lastTime: 'Mar 22', unread: 0,
      messages: [
        { sender: 'client', text: 'Hi! Just checking on my booking for the editorial shoot.', time: 'Mar 22 1:00 PM' },
        { sender: 'artist', text: 'Hi Rose! All set for March 29. Let me know if you have a specific mood board! 📸', time: 'Mar 22 1:30 PM' },
        { sender: 'client', text: 'Looking forward to it!', time: 'Mar 22 2:00 PM' },
      ]
    }
  ];

  activeConversation: Conversation | null = null;
  selectedBooking: Booking | null = null;

  // ── Blocked dates ──
  addBlockedDate() {
    const d = prompt('Enter date to block (e.g. Apr 5, 2026):');
    if (d) { this.blockedDates.push(d.trim()); this.buildCalendar(); }
  }

  constructor(
    private auth: Auth,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) { }

  async ngOnInit() {
    const user = this.auth.currentUser;
    if (!user) { this.router.navigate(['/artist/login']); return; }

    try {
      const data = await this.userService.getUser(user.uid);
      if (data) {
        this.artistName = data['name'] || 'Artist';
        this.artistSpecialty = data['specialty'] || 'Makeup Artist';
        this.artistInitials = this.artistName
          .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
        this.profileForm = {
          name: data['name'] || '',
          email: data['email'] || user.email || '',
          phone: data['phone'] || '',
          specialty: data['specialty'] || '',
          bio: data['bio'] || '',
          location: data['location'] || '',
          social: data['social'] || ''
        };
      }
    } catch { /* use defaults */ }

    this.computeStats();
    this.buildCalendar();
    this.emgBuildCalendar();
  }

  computeStats() {
    this.stats.totalBookings = this.bookings.length;
    this.stats.pending = this.bookings.filter(b => b.status === 'pending').length;
    this.stats.completed = this.bookings.filter(b => b.status === 'completed').length;
    this.stats.earnings = this.bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.amount, 0);
    this.stats.totalEarnings = this.stats.earnings;
    this.stats.avgEarning = this.stats.completed > 0 ? Math.round(this.stats.earnings / this.stats.completed) : 0;

    const totalRating = this.reviews.reduce((s, r) => s + r.rating, 0);
    this.stats.avgRating = this.reviews.length > 0 ? (totalRating / this.reviews.length).toFixed(1) : '0.0';

    this.stats.totalMessages = this.conversations.length;
    const totalPaidOut = this.payoutHistory
      .filter(p => p.status === 'completed' || p.status === 'processing')
      .reduce((s: number, p: any) => s + p.amount, 0);
    this.stats.availableBalance = Math.max(0, this.stats.earnings - totalPaidOut);
  }

  // ── Navigation ──
  setTab(tab: string) {
    this.activeTab = tab;
    if (tab !== 'messages') this.activeConversation = null;
  }

  getPageTitle(): string {
    const map: Record<string, string> = {
      overview: 'Overview', bookings: 'Bookings', messages: 'Messages',
      portfolio: 'Portfolio', schedule: 'Schedule', earnings: 'Earnings',
      reviews: 'Reviews', services: 'My Services', profile: 'My Profile',
      emergency: '🚨 Emergency'
    };
    return map[this.activeTab] || 'Dashboard';
  }

  getPageSub(): string {
    const map: Record<string, string> = {
      overview: 'Welcome back, ' + this.artistName + ' ✨',
      bookings: 'Manage your client appointments',
      messages: 'Chat with your clients',
      portfolio: 'Showcase your best work',
      schedule: 'Set your availability',
      earnings: 'Track your income',
      reviews: 'See what clients say about you',
      services: 'Manage your service offerings',
      profile: 'Update your artist profile',
      emergency: 'Declare emergency & find a replacement artist'
    };
    return map[this.activeTab] || '';
  }

  // ── Computed ──
  get pendingCount() { return this.bookings.filter(b => b.status === 'pending').length; }
  get unreadMessages() { return this.conversations.reduce((s, c) => s + c.unread, 0); }
  get upcomingBookings() { return this.bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').slice(0, 5); }
  get filteredBookings() { return this.bookingFilter === 'all' ? this.bookings : this.bookings.filter(b => b.status === this.bookingFilter as any); }
  get completedBookings() { return this.bookings.filter(b => b.status === 'completed'); }

  get autoAffectedBookings(): Booking[] {
    const ls = this.emergencyForm.leaveStart;
    const le = this.emergencyForm.leaveEnd;
    if (!ls || !le) return [];
    return this.bookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'completed') return false;
      const bDate = new Date(b.date);
      return bDate >= ls && bDate <= le;
    });
  }
  get filteredConversations() {
    if (!this.messageSearch) return this.conversations;
    return this.conversations.filter(c => c.clientName.toLowerCase().includes(this.messageSearch.toLowerCase()));
  }

  // ── Booking Actions ──
  confirmBooking(b: Booking) { b.status = 'confirmed'; this.computeStats(); }
  cancelBooking(b: Booking) { b.status = 'cancelled'; this.computeStats(); }
  viewBooking(b: Booking) { this.selectedBooking = b; }

  openMessage(b: Booking) {
    this.setTab('messages');
    const existing = this.conversations.find(c => c.clientId === b.clientId);
    if (existing) {
      this.activeConversation = existing;
    } else {
      const newConv: Conversation = {
        clientId: b.clientId, clientName: b.clientName,
        lastMessage: '', lastTime: 'Now', unread: 0, messages: []
      };
      this.conversations.unshift(newConv);
      this.activeConversation = newConv;
    }
  }

  // ── Messages ──
  selectConversation(conv: Conversation) {
    this.activeConversation = conv;
    conv.unread = 0;
    setTimeout(() => this.scrollToBottom(), 100);
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.activeConversation) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.activeConversation.messages.push({ sender: 'artist', text: this.newMessage.trim(), time: now });
    this.activeConversation.lastMessage = this.newMessage.trim();
    this.activeConversation.lastTime = now;
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 50);
  }

  scrollToBottom() {
    if (this.chatBox) {
      this.chatBox.nativeElement.scrollTop = this.chatBox.nativeElement.scrollHeight;
    }
  }

  // ── Portfolio ──
  triggerUpload() { this.fileInput.nativeElement.click(); }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      this.portfolioItems.push({ url: e.target?.result as string, caption: file.name.replace(/\.[^.]+$/, '') });
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  deletePortfolioItem(i: number) { this.portfolioItems.splice(i, 1); }

  // ── Schedule ──
  getMonthLabel(): string {
    return new Date(this.calViewYear, this.calViewMonth, 1)
      .toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  }

  prevMonth() {
    if (this.calViewMonth === 0) { this.calViewMonth = 11; this.calViewYear--; }
    else this.calViewMonth--;
    this.buildCalendar();
  }

  nextMonth() {
    if (this.calViewMonth === 11) { this.calViewMonth = 0; this.calViewYear++; }
    else this.calViewMonth++;
    this.buildCalendar();
  }

  buildCalendar() {
    const year = this.calViewYear;
    const month = this.calViewMonth;
    const today = new Date();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: any[] = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) cells.push({ date: null });

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateStr = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
      const hasBooking = this.bookings.some(b =>
        (b.status === 'pending' || b.status === 'confirmed') && b.date === dateStr
      );
      const isBlocked = this.blockedDates.includes(dateStr);
      const isToday = date.toDateString() === today.toDateString();

      // Range checks
      const isRangeStart = !!this.availRange.start && date.toDateString() === this.availRange.start.toDateString();
      const isRangeEnd = !!this.availRange.end && date.toDateString() === this.availRange.end.toDateString();
      const inRange = !!(this.availRange.start && this.availRange.end &&
        date > this.availRange.start && date < this.availRange.end);

      // Also check saved ranges
      const inSavedRange = this.savedRanges.some(r => date >= r.start && date <= r.end);
      const isSavedStart = this.savedRanges.some(r => date.toDateString() === r.start.toDateString());
      const isSavedEnd = this.savedRanges.some(r => date.toDateString() === r.end.toDateString());

      // Leave range checks
      const leaveStart = this.emergencyForm?.leaveStart;
      const leaveEnd = this.emergencyForm?.leaveEnd;
      const isLeaveStart = !!leaveStart && date.toDateString() === leaveStart.toDateString();
      const isLeaveEnd = !!leaveEnd && date.toDateString() === leaveEnd.toDateString();
      const isLeave = !!(leaveStart && leaveEnd && date > leaveStart && date < leaveEnd);

      // Collect bookings for this day
      const dayBookings = this.bookings.filter(b => {
        const dateStr2 = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
        return (b.status === 'pending' || b.status === 'confirmed') && b.date === dateStr2;
      });

      cells.push({
        date, hasBooking, isBlocked, isToday,
        isRangeStart: isRangeStart || isSavedStart,
        isRangeEnd: isRangeEnd || isSavedEnd,
        inRange: inRange || inSavedRange,
        isLeaveStart, isLeaveEnd, isLeave,
        bookings: dayBookings
      });
    }
    this.calendarCells = cells;
  }

  onCalendarClick(cell: any) {
    if (!cell.date || cell.isBlocked) return;

    // Always show booking popup for this day
    this.selectedCalDay = cell;

    // Also handle availability range selection
    if (!this.availRange.start) {
      this.availRange.start = cell.date;
      this.availRange.end = null;
    } else if (!this.availRange.end) {
      if (cell.date <= this.availRange.start) {
        this.availRange.start = cell.date;
      } else {
        this.availRange.end = cell.date;
      }
    } else {
      this.availRange.start = cell.date;
      this.availRange.end = null;
    }
    this.buildCalendar();
  }

  formatRangeDate(d: Date): string {
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  saveAvailRange() {
    if (this.availRange.start && this.availRange.end) {
      this.savedRanges.push({ start: this.availRange.start, end: this.availRange.end });
      this.availRange = { start: null, end: null };
      this.buildCalendar();
    }
  }

  clearAvailRange() {
    this.availRange = { start: null, end: null };
    this.buildCalendar();
  }

  removeBlockedDate(i: number) {
    this.blockedDates.splice(i, 1);
    this.buildCalendar();
  }

  // ── Emergency Mini Calendar ──
  getEmgMonthLabel(): string {
    return new Date(this.emgCalViewYear, this.emgCalViewMonth, 1)
      .toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  }
  emgPrevMonth() {
    if (this.emgCalViewMonth === 0) { this.emgCalViewMonth = 11; this.emgCalViewYear--; }
    else this.emgCalViewMonth--;
    this.emgBuildCalendar();
  }
  emgNextMonth() {
    if (this.emgCalViewMonth === 11) { this.emgCalViewMonth = 0; this.emgCalViewYear++; }
    else this.emgCalViewMonth++;
    this.emgBuildCalendar();
  }
  emgBuildCalendar() {
    const year = this.emgCalViewYear;
    const month = this.emgCalViewMonth;
    const today = new Date();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: any[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const ls = this.emergencyForm.leaveStart;
      const le = this.emergencyForm.leaveEnd;
      const isLeaveStart = !!ls && date.toDateString() === ls.toDateString();
      const isLeaveEnd = !!le && date.toDateString() === le.toDateString();
      const inRange = !!(ls && le && date > ls && date < le);
      // Check if any upcoming booking falls on this day
      const hasBooking = this.bookings.some(b => {
        if (b.status === 'cancelled' || b.status === 'completed') return false;
        try {
          const bDate = new Date(b.date);
          return bDate.toDateString() === date.toDateString();
        } catch { return false; }
      });
      cells.push({ date, isToday: date.toDateString() === today.toDateString(), isLeaveStart, isLeaveEnd, inRange, hasBooking });
    }
    this.emgCalendarCells = cells;
  }
  onEmgCalClick(cell: any) {
    if (!cell.date) return;
    if (!this.emergencyForm.leaveStart) {
      this.emergencyForm.leaveStart = new Date(cell.date);
      this.emergencyForm.leaveEnd = null;
    } else if (!this.emergencyForm.leaveEnd) {
      if (cell.date <= this.emergencyForm.leaveStart) {
        this.emergencyForm.leaveStart = new Date(cell.date);
      } else {
        this.emergencyForm.leaveEnd = new Date(cell.date);
      }
    } else {
      this.emergencyForm.leaveStart = new Date(cell.date);
      this.emergencyForm.leaveEnd = null;
    }
    this.emgBuildCalendar();
    this.buildCalendar();
  }

  saveSchedule() {
    this.scheduleSaved = true;
    this.showToast('success', '✅ Schedule Saved', 'Your availability has been updated.');
    setTimeout(() => this.scheduleSaved = false, 3000);
  }

  // ── Reviews Helpers ──
  getStars(rating: number): string { return '⭐'.repeat(rating); }
  getRatingCount(star: number): number { return this.reviews.filter(r => r.rating === star).length; }
  getRatingPercent(star: number): number {
    if (!this.reviews.length) return 0;
    return Math.round((this.getRatingCount(star) / this.reviews.length) * 100);
  }

  // ── Services ──
  addService() {
    this.editingServiceIndex = -1;
    this.serviceForm = { name: '', emoji: '💄', description: '', price: 0, duration: '' };
    this.showServiceModal = true;
  }

  editService(i: number) {
    this.editingServiceIndex = i;
    this.serviceForm = { ...this.services[i] };
    this.showServiceModal = true;
  }

  saveService() {
    if (!this.serviceForm.name) return;
    if (this.editingServiceIndex >= 0) {
      this.services[this.editingServiceIndex] = { ...this.serviceForm };
    } else {
      this.services.push({ ...this.serviceForm });
    }
    this.showServiceModal = false;
  }

  // ── Profile ──
  profileForm = {
    name: '', email: '', phone: '', specialty: '', bio: '', location: '', social: ''
  };

  async saveProfile() {
    const user = this.auth.currentUser;
    if (!user) return;
    try {
      await this.userService.updateUser(user.uid, {
        name: this.profileForm.name,
        phone: this.profileForm.phone,
        specialty: this.profileForm.specialty,
        bio: this.profileForm.bio,
        location: this.profileForm.location,
        social: this.profileForm.social
      } as any);
      this.artistName = this.profileForm.name;
      this.artistSpecialty = this.profileForm.specialty;
      this.artistInitials = this.artistName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      this.profileSaved = true;
      setTimeout(() => this.profileSaved = false, 3000);
    } catch { this.showToast('error', 'Save Failed', 'Could not save profile. Please try again.'); }
  }

  // ── Payout ──
  getAccountLabel(): string {
    const map: Record<string, string> = { gcash: 'GCash Number', maya: 'Maya Number', card: 'Card / Account Number' };
    return map[this.payoutForm.method] || 'Account Number';
  }
  getAccountPlaceholder(): string {
    const map: Record<string, string> = { gcash: '09XXXXXXXXX', maya: '09XXXXXXXXX', card: 'Account number' };
    return map[this.payoutForm.method] || '';
  }
  getMethodLabel(method: string): string {
    const map: Record<string, string> = { gcash: 'GCash', maya: 'Maya', card: 'Bank Card' };
    return map[method] || method;
  }
  getMethodEmoji(method: string): string {
    const map: Record<string, string> = { gcash: '💙', maya: '💚', card: '💳' };
    return map[method] || '💸';
  }

  requestPayout() {
    this.payoutError = '';
    const { amount, method, accountNumber, accountName } = this.payoutForm;
    if (!amount || amount < 100) { this.payoutError = 'Minimum payout is ₱100.'; return; }
    if (amount > this.stats.availableBalance) { this.payoutError = 'Amount exceeds available balance.'; return; }
    if (!method) { this.payoutError = 'Please select a cash-out method.'; return; }
    if (!accountNumber) { this.payoutError = 'Please enter your account number.'; return; }
    if (!accountName) { this.payoutError = 'Please enter your account name.'; return; }

    this.isPayoutLoading = true;
    setTimeout(() => {
      const today = new Date();
      const eta = new Date(today); eta.setDate(eta.getDate() + 2);
      const fmt = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

      const payout = {
        method, accountNumber, accountName, amount,
        status: 'processing',
        requestedDate: fmt(today),
        expectedDate: fmt(eta)
      };

      this.payoutHistory.unshift(payout);
      this.lastPayout = payout;
      this.stats.availableBalance -= amount;
      this.payoutForm = { amount: 0, method: '', accountNumber: '', accountName: '' };
      this.isPayoutLoading = false;
      this.showPayoutSuccess = true;
    }, 1800);
  }

  callSupport() { this.showToast('info', '📞 GlowBook Support', 'Hotline: 1800-GLOWBOOK · Open daily 8AM – 8PM'); }

  reportIssue() { this.showPayoutSuccess = false; this.showReportModal = true; }

  submitReport() {
    if (!this.reportForm.type || !this.reportForm.description) {
      this.showToast('error', 'Incomplete', 'Please fill in all fields.'); return;
    }
    this.showToast('success', '✅ Report Submitted', 'Our team will review it within 24–48 hours.');
    this.reportForm = { type: '', description: '' };
    this.showReportModal = false;
  }

  // ── Emergency ──
  get filteredAvailableArtists() {
    return this.availableArtists.filter(a => {
      const matchName = !this.artistSearch || a.name.toLowerCase().includes(this.artistSearch.toLowerCase());
      const matchSpecialty = !this.artistSpecialtyFilter || a.specialty.includes(this.artistSpecialtyFilter);
      return matchName && matchSpecialty;
    });
  }

  toggleAffectedBooking(b: Booking) {
    const idx = this.emergencyForm.affectedBookingIds.indexOf(b.id);
    if (idx >= 0) this.emergencyForm.affectedBookingIds.splice(idx, 1);
    else this.emergencyForm.affectedBookingIds.push(b.id);
  }

  declareEmergency() {
    this.emergencyError = '';
    if (!this.emergencyForm.reason) {
      this.emergencyError = 'Please select a reason for your emergency.'; return;
    }
    if (!this.emergencyForm.leaveStart || !this.emergencyForm.leaveEnd) {
      this.emergencyError = 'Please select your leave start and end date on the calendar.'; return;
    }
    const affected = this.autoAffectedBookings;
    const now = new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    this.activeEmergency = {
      reason: this.emergencyForm.reason,
      details: this.emergencyForm.details,
      affectedBookings: affected,
      declaredAt: now,
      status: 'active',
      leaveStart: this.emergencyForm.leaveStart,
      leaveEnd: this.emergencyForm.leaveEnd
    };

    // Mark bookings as cancelled
    affected.forEach(b => b.status = 'cancelled');
    this.computeStats();

    // Reset form
    this.emergencyForm = { reason: '', details: '', affectedBookingIds: [], leaveStart: null, leaveEnd: null };
    this.emgSuccessData = { affectedCount: affected.length, reason: this.activeEmergency.reason };
    this.showEmgSuccessModal = true;
  }

  resolveEmergency() {
    if (!this.activeEmergency) return;
    const resolved = {
      ...this.activeEmergency,
      status: 'resolved',
      resolvedAt: new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      handoffArtist: this.handoffRequests.find(h => h.status === 'accepted')?.artistName || null
    };
    this.emergencyHistory.unshift(resolved);
    this.activeEmergency = null;
    this.handoffRequests = [];
    this.handoffWizardStep = 0;
  }

  openHandoffModal(artist: any) {
    this.selectedArtist = artist;
    const currentBooking = this.activeEmergency?.affectedBookings[this.handoffWizardStep];
    this.handoffForm = {
      bookingId: currentBooking?.id || '',
      message: `Hi ${artist.name}! I have an emergency and I need someone to cover my booking for ${currentBooking?.clientName} (${currentBooking?.service}) on ${currentBooking?.date}. Are you available? Thank you so much! 🙏`
    };
    this.showHandoffModal = true;
  }

  getHandoffBooking(): Booking | undefined {
    return this.activeEmergency?.affectedBookings.find((b: Booking) => b.id === this.handoffForm.bookingId);
  }

  sendHandoffRequest() {
    if (!this.handoffForm.bookingId) { this.showToast('error', 'Required', 'Please select a booking.'); return; }
    if (!this.handoffForm.message) { this.showToast('error', 'Required', 'Please add a message to the artist.'); return; }
    const booking = this.getHandoffBooking();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.handoffRequests.push({
      artistName: this.selectedArtist.name,
      artistId: this.selectedArtist.id,
      booking,
      message: this.handoffForm.message,
      status: 'pending',
      sentAt: now
    });
    this.showHandoffModal = false;
    this.showHandoffSuccess = true;
    // Auto-advance to next unhandled client
    const bookings = this.activeEmergency?.affectedBookings || [];
    const nextIdx = bookings.findIndex((b: Booking, i: number) =>
      i > this.handoffWizardStep && !this.isBookingHandedOff(b.id)
    );
    if (nextIdx >= 0) {
      setTimeout(() => { this.handoffWizardStep = nextIdx; this.showHandoffSuccess = false; }, 1800);
    }
  }

  // ── Handoff Wizard ──

  // Extract service keywords from a booking service name
  getServiceTags(service: string): string[] {
    if (!service) return [];
    const map: Record<string, string[]> = {
      'Bridal Makeup': ['Bridal'],
      'Glam Makeup': ['Glam'],
      'Natural Makeup': ['Natural'],
      'SFX Makeup': ['SFX'],
      'Debut Makeup': ['Debut', 'Bridal'],
      'Editorial Look': ['Editorial', 'Glam'],
    };
    return map[service] || [service.split(' ')[0]];
  }

  // Filter artists by the tags of the current booking
  getArtistsForBooking(booking: any): any[] {
    if (!booking) return [];
    const tags = this.getServiceTags(booking.service);
    return this.availableArtists.filter(a => {
      const nameMatch = !this.artistSearch ||
        a.name.toLowerCase().includes(this.artistSearch.toLowerCase());
      const tagMatch = tags.some((tag: string) =>
        a.specialty.toLowerCase().includes(tag.toLowerCase())
      );
      return nameMatch && tagMatch;
    });
  }

  // Check if a handoff request was already sent to this artist for this booking
  isHandoffSentTo(artistId: string, bookingId: string): boolean {
    return this.handoffRequests.some(h =>
      h.artistId === artistId && h.booking?.id === bookingId && h.status !== 'declined'
    );
  }

  // Check if a booking already has any handoff request
  isBookingHandedOff(bookingId: string): boolean {
    return this.handoffRequests.some(h =>
      h.booking?.id === bookingId && h.status !== 'declined'
    );
  }

  // Check if all affected bookings have been handed off
  allBookingsHandedOff(): boolean {
    if (!this.activeEmergency?.affectedBookings?.length) return false;
    return this.activeEmergency.affectedBookings.every((b: Booking) =>
      this.isBookingHandedOff(b.id)
    );
  }

  cancelHandoff(h: any) { h.status = 'declined'; }

  clearLeaveDates() {
    this.emergencyForm.leaveStart = null;
    this.emergencyForm.leaveEnd = null;
    this.emgBuildCalendar();
    this.buildCalendar();
  }

  // ── Logout ──
  async onLogout() {
    await this.authService.logout();
    this.router.navigate(['/artist/login']);
  }
}