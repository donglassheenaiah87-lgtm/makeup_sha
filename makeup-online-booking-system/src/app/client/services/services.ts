// client/services/services.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Service {
  name: string; desc: string; fullDesc: string; icon: string;
  price: number; image: string; duration: string; rating: string;
  ratingCount: number; bookings: number; category: string;
  includes: string[]; wishlisted: boolean;
}

@Component({
  selector: 'app-client-services',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './services.html',
  styleUrls: ['./services.css']
})
export class ClientServicesComponent implements OnInit {
  searchQuery = '';
  activeFilter = 'All';
  wishlistCount = 0;
  svcModalOpen = false;
  activeSvc: Service | null = null;
  toastVisible = false;
  toastTitle = '';
  toastMessage = '';
  toastIcon = 'fas fa-check-circle';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  filters = ['All', 'Bridal', 'Event', 'Natural', 'Editorial'];

  allServices: Service[] = [
    {
      name: 'Bridal Makeup', category: 'Bridal', icon: 'fas fa-heart',
      price: 4500, duration: '2–3 hrs', rating: '5.0', ratingCount: 98,
      bookings: 120, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=420&fit=crop&crop=face',
      desc: 'A timeless, radiant look crafted for your most special day.',
      fullDesc: 'Our bridal makeup is designed to make you look absolutely flawless on your wedding day. Using premium long-lasting products tailored to your skin tone and theme, including a pre-wedding trial session.',
      includes: ['Pre-wedding consultation', 'Trial makeup session', 'Premium long-lasting products', 'Touch-up kit included', 'Hair pinning assistance']
    },
    {
      name: 'Event Glam', category: 'Event', icon: 'fas fa-star',
      price: 2200, duration: '1–2 hrs', rating: '4.9', ratingCount: 143,
      bookings: 200, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=420&fit=crop&crop=face',
      desc: 'Glamorous, long-lasting looks perfect for any celebration.',
      fullDesc: 'Look your absolute best at any event — debuts, galas, proms, or parties. Our event makeup is crafted to last the entire night while keeping you photo-ready and stunning.',
      includes: ['Custom look consultation', 'Full face application', 'Long-wear setting spray', 'Lash application', 'Color-matched foundation']
    },
    {
      name: 'Natural Glow', category: 'Natural', icon: 'fas fa-leaf',
      price: 1800, duration: '1 hr', rating: '4.8', ratingCount: 112,
      bookings: 180, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=420&fit=crop&crop=face',
      desc: 'Soft, effortless beauty that enhances your natural features.',
      fullDesc: 'Perfect for everyday occasions, dates, or casual events. Our natural glow service enhances your best features while keeping the look fresh, light, and authentically you.',
      includes: ['Skin prep & hydration', 'Natural-finish foundation', 'Subtle contouring', 'Tinted lip treatment', 'All-day setting spray']
    },
    {
      name: 'Photoshoot Look', category: 'Editorial', icon: 'fas fa-camera',
      price: 2500, duration: '1.5–2 hrs', rating: '4.9', ratingCount: 67,
      bookings: 90, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=420&fit=crop&crop=face',
      desc: 'Camera-ready, editorial-quality finish for your shoot.',
      fullDesc: 'Crafted specifically for HD photography and videography. We use camera-optimized products and techniques that translate beautifully on screen, for models, content creators, and portfolio shoots.',
      includes: ['HD-ready application', 'Color-correcting base', 'Contouring & highlighting', 'Waterproof eye makeup', 'On-set touch-up support']
    },
    {
      name: 'Debut Glam', category: 'Event', icon: 'fas fa-birthday-cake',
      price: 2800, duration: '2 hrs', rating: '5.0', ratingCount: 54,
      bookings: 76, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=600&h=420&fit=crop&crop=face',
      desc: 'A dreamy, princess-perfect look for your 18th birthday.',
      fullDesc: 'Make your debut truly unforgettable with a custom look tailored to your theme and personality. We work closely with you to design a makeup look that makes you shine.',
      includes: ['Theme consultation', 'Full glam application', 'Crown & accessories styling', 'Touch-up kit', 'Lash application']
    },
    {
      name: 'Korean Soft Look', category: 'Natural', icon: 'fas fa-heart',
      price: 1600, duration: '1 hr', rating: '4.7', ratingCount: 89,
      bookings: 145, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=600&h=420&fit=crop&crop=face',
      desc: 'Trendy K-beauty inspired soft dewy skin look.',
      fullDesc: 'Inspired by K-beauty trends, this look focuses on glass skin, soft gradient lips, and innocent eyes. Perfect for casual dates, cafés, or everyday glam.',
      includes: ['Glass skin prep', 'Soft gradient brows', 'Dewy foundation', 'Puppy eye liner', 'Tinted lip']
    },
    {
      name: 'Airbrush Makeup', category: 'Bridal', icon: 'fas fa-spray-can',
      price: 3500, duration: '2 hrs', rating: '4.9', ratingCount: 41,
      bookings: 65, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1523263685509-57c1d050d19b?w=600&h=420&fit=crop&crop=face',
      desc: 'Flawless, lightweight airbrush finish that lasts all day.',
      fullDesc: 'Airbrush makeup delivers a flawless, photo-ready finish that is lighter and more durable than traditional application. Ideal for weddings, events, and photoshoots.',
      includes: ['Airbrush foundation', 'Contouring & blush', 'Setting spray', 'Lash application', '12-hour wear guarantee']
    },
    {
      name: 'SFX Makeup', category: 'Editorial', icon: 'fas fa-mask',
      price: 3200, duration: '2–4 hrs', rating: '4.8', ratingCount: 28,
      bookings: 40, wishlisted: false,
      image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&h=420&fit=crop&crop=face',
      desc: 'Special effects and theatrical makeup for creative projects.',
      fullDesc: 'From Halloween looks to film and theater productions, our SFX makeup artists create stunning illusions, wounds, aging effects, and fantastical characters.',
      includes: ['Character consultation', 'SFX prosthetics (if needed)', 'Face & body paint', 'HD camera testing', 'Removal kit']
    }
  ];

  filteredServices: Service[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.filteredServices = [...this.allServices];
  }

  get displayed(): Service[] {
    const q = this.searchQuery.toLowerCase();
    return this.filteredServices.filter(s =>
      !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
    );
  }

  setFilter(f: string): void {
    this.activeFilter = f;
    this.filteredServices = f === 'All'
      ? [...this.allServices]
      : this.allServices.filter(s => s.category === f);
  }

  openModal(s: Service): void {
    this.activeSvc = s;
    this.svcModalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.svcModalOpen = false;
    this.activeSvc = null;
    document.body.style.overflow = '';
  }

  toggleWish(s: Service): void {
    s.wishlisted = !s.wishlisted;
    this.wishlistCount = this.allServices.filter(x => x.wishlisted).length;
    this.showToast(
      s.wishlisted ? 'Saved!' : 'Removed',
      s.wishlisted ? `${s.name} added to wishlist 💕` : `${s.name} removed.`,
      s.wishlisted ? 'fas fa-heart' : 'fas fa-heart-broken',
      'success'
    );
  }

  showToast(title: string, msg: string, icon = 'fas fa-check-circle', type: 'success' | 'error' = 'success'): void {
    this.toastTitle = title; this.toastMessage = msg; this.toastIcon = icon; this.toastType = type;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, 3500);
  }

  goBack(): void { this.router.navigate(['/client/dashboard']); }

  goToBook(): void { this.router.navigate(['/book']); }

  onImgError(e: Event): void {
    const img = e.target as HTMLImageElement;
    img.style.display = 'none';
    if (img.parentElement) img.parentElement.style.background = 'linear-gradient(135deg,#e8c5ce,#c9848e)';
  }
}
