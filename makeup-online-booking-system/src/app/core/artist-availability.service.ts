import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  onSnapshot
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ArtistAvailability {
  id: string; // Typically the artistId
  artistId: string;
  artistName: string;
  weekDays: { day: string; isAvailable: boolean; startTime: string; endTime: string }[];
  blockedDates: string[]; // ISO date strings
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ArtistAvailabilityService {
  constructor(private firestore: Firestore) {}

  // ── Set or Update Availability (Artist) ──
  async setAvailability(artistId: string, data: Omit<ArtistAvailability, 'id' | 'updatedAt'>) {
    const docRef = doc(this.firestore, `artistAvailability/${artistId}`);
    return setDoc(docRef, { ...data, id: artistId, updatedAt: new Date() }, { merge: true });
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
}
