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
}
