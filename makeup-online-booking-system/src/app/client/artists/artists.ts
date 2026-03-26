// client/artists/artists.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Artist {
  name: string; firstName: string; role: string; image: string;
  rating: string; exp: string; clients: number; specialties: string[];
  bio: string; instagram: string; bookings: number;
}

@Component({
  selector: 'app-client-artists',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './artists.html',
  styleUrls: ['./artists.css']
})
export class ClientArtistsComponent implements OnInit {
  searchQuery = '';
  activeFilter = 'All';
  toastVisible = false;
  toastTitle = '';
  toastMessage = '';
  toastIcon = 'fas fa-check-circle';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: any;

  filters = ['All', 'Bridal', 'Glam', 'Natural', 'Editorial', 'SFX'];

  artists: Artist[] = [
    {
      name: 'Anika Reyes', firstName: 'Anika', role: 'Lead Bridal Artist',
      rating: '5.0', exp: '8 yrs', clients: 300, bookings: 450,
      image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=480&h=560&fit=crop&crop=face',
      specialties: ['Bridal', 'Glam', 'Airbrush'],
      bio: 'Anika is our lead bridal artist with 8 years of experience crafting flawless, timeless bridal looks. She specializes in airbrush techniques and has worked with 300+ brides across the Philippines.',
      instagram: '@anika.mua'
    },
    {
      name: 'Sofia Cruz', firstName: 'Sofia', role: 'Editorial Specialist',
      rating: '4.9', exp: '6 yrs', clients: 220, bookings: 310,
      image: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=480&h=560&fit=crop&crop=face',
      specialties: ['Editorial', 'SFX', 'Event'],
      bio: 'Sofia is a creative force behind our editorial and SFX looks. With a background in fashion photography makeup, she brings artistic vision to every project.',
      instagram: '@sofia.artistry'
    },
    {
      name: 'Mia Santos', firstName: 'Mia', role: 'Natural Beauty Expert',
      rating: '4.8', exp: '5 yrs', clients: 180, bookings: 260,
      image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=480&h=560&fit=crop&crop=face',
      specialties: ['Natural', 'Skincare', 'Glam'],
      bio: 'Mia believes in enhancing your natural beauty, not masking it. A skincare-first approach makes her the go-to for brides and clients wanting a fresh, effortless look.',
      instagram: '@mia.glow'
    },
    {
      name: 'Leila Torres', firstName: 'Leila', role: 'Event & Debut Artist',
      rating: '4.9', exp: '7 yrs', clients: 260, bookings: 390,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=480&h=560&fit=crop&crop=face',
      specialties: ['Debut', 'Event', 'Korean'],
      bio: 'Leila is our event and debut specialist, known for creating dreamy 18th birthday looks and stunning event glam. She is also a certified Korean makeup technique artist.',
      instagram: '@leila.beauty'
    },
    {
      name: 'Ria Mendoza', firstName: 'Ria', role: 'Creative & SFX Artist',
      rating: '4.9', exp: '4 yrs', clients: 120, bookings: 180,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=480&h=560&fit=crop&crop=face',
      specialties: ['SFX', 'Editorial', 'Avant-garde'],
      bio: 'Ria brings fantasy to life with her creative and SFX makeup artistry. From theatrical productions to cosplay and film, her skills are truly transformative.',
      instagram: '@ria.sfx'
    },
    {
      name: 'Cara Lim', firstName: 'Cara', role: 'Photoshoot Specialist',
      rating: '4.8', exp: '5 yrs', clients: 200, bookings: 290,
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=480&h=560&fit=crop&crop=face',
      specialties: ['Editorial', 'Natural', 'Glam'],
      bio: 'Cara specializes in photoshoot and content creator makeup, ensuring every look is camera-ready and translates beautifully in photos and video.',
      instagram: '@cara.glam'
    },
  ];

  get displayed(): Artist[] {
    const q = this.searchQuery.toLowerCase();
    return this.artists.filter(a => {
      const matchesFilter = this.activeFilter === 'All' || a.specialties.includes(this.activeFilter);
      const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.specialties.some(s => s.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }

  constructor(private router: Router) {}

  ngOnInit(): void { window.scrollTo(0, 0); }

  setFilter(f: string): void { this.activeFilter = f; }

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
