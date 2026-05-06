import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Review {
  id: string;
  artistId: string;
  artistName: string;
  clientId: string;
  clientName: string;
  service: string;
  rating: number;
  comment: string;
  date: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private firestore: Firestore) {}

  async addReview(data: Omit<Review, 'id'>) {
    const ref = collection(this.firestore, 'reviews');
    const docRef = doc(ref);
    return setDoc(docRef, { ...data, id: docRef.id });
  }

  // ── CHANGED: Added filter by artistId for artist-specific reviews (original method kept) ──
  // Reads from: Firebase 'reviews' collection, filtered by artistId
  getReviewsForArtistRealtime(artistId: string): Observable<Review[]> {
    return new Observable<Review[]>(subscriber => {
      const ref = collection(this.firestore, 'reviews');
      const q = query(ref, where('artistId', '==', artistId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        subscriber.next(reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── NEW: Fetch all reviews across the platform (used for Community Reviews tab in Profile) ──
  // Reads from: Firebase 'reviews' collection (all documents)
  // Why: Lets clients see what other clients are saying about artists before booking.
  getAllReviewsRealtime(): Observable<Review[]> {
    return new Observable<Review[]>(subscriber => {
      const ref = collection(this.firestore, 'reviews');
      const unsubscribe = onSnapshot(ref, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        subscriber.next(reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── NEW: Fetch reviews written by a specific client (used for "My Reviews" tab in Profile) ──
  // Reads from: Firebase 'reviews' collection, filtered by clientId
  // ACID - Isolated: Each query is independent and reads only this client's data.
  getReviewsByClientRealtime(clientId: string): Observable<Review[]> {
    return new Observable<Review[]>(subscriber => {
      const ref = collection(this.firestore, 'reviews');
      const q = query(ref, where('clientId', '==', clientId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        subscriber.next(reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
}
