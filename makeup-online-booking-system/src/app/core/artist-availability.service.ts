import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ArtistAvailability {
  id: string; // Typically the artistId
  artistId: string;
  artistName: string;
  weekDays: { name: string; available: boolean; start: string; end: string }[];
  blockedDates: string[]; // ISO or format used in UI
  updatedAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class ArtistAvailabilityService {
  constructor(private firestore: Firestore) {}

  // ── Set or Update Availability (Artist) ──
  async setAvailability(artistId: string, data: Partial<ArtistAvailability>) {
    const docRef = doc(this.firestore, `artistAvailability/${artistId}`);
    return setDoc(docRef, { 
      ...data, 
      artistId, 
      updatedAt: serverTimestamp() 
    }, { merge: true });
  }

  // ── Get Artist Availability (Client & Artist) ──
  getAvailabilityRealtime(artistId: string): Observable<ArtistAvailability | null> {
    return new Observable<ArtistAvailability | null>(subscriber => {
      const docRef = doc(this.firestore, `artistAvailability/${artistId}`);
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          subscriber.next(snap.data() as ArtistAvailability);
        } else {
          subscriber.next(null);
        }
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Check Availability (for Booking) ──
  async isArtistAvailable(artistId: string, date: string, time: string): Promise<boolean> {
    // 1. Check general availability & blocked dates
    const availRef = doc(this.firestore, `artistAvailability/${artistId}`);
    const availSnap = await getDoc(availRef);
    if (availSnap.exists()) {
      const data = availSnap.data() as ArtistAvailability;
      
      // Check blocked dates
      if (data.blockedDates?.includes(date)) return false;
      
      // Check day of week
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const dayConfig = data.weekDays?.find(d => d.name === dayName);
      if (dayConfig && !dayConfig.available) return false;
      
      // Check hours (simplified)
      if (dayConfig && (time < dayConfig.start || time > dayConfig.end)) return false;
    }

    // 2. Check existing bookings
    const bookingsRef = collection(this.firestore, 'bookings');
    const q = query(bookingsRef, 
      where('assignedArtistId', '==', artistId),
      where('date', '==', date),
      where('time', '==', time),
      where('status', 'in', ['confirmed', 'pending'])
    );
    const bookingsSnap = await getDocs(q);
    return bookingsSnap.empty;
  }
}
