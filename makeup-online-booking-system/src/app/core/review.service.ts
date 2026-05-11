import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Review {
  reviewId: string;
  artistId: string;
  artistName: string;
  clientUserId: string;
  clientName: string;
  bookingId: string;
  service: string;
  starRating: number;
  reviewMessage: string;
  date: string;
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private firestore: Firestore) {}

  async addReview(data: Omit<Review, 'reviewId'>) {
    const ref = collection(this.firestore, 'reviews');
    const docRef = doc(ref);
    return setDoc(docRef, { ...data, reviewId: docRef.id });
  }

  getReviewsForArtistRealtime(artistId: string): Observable<Review[]> {
    return new Observable<Review[]>(subscriber => {
      const ref = collection(this.firestore, 'reviews');
      const q = query(ref, where('artistId', '==', artistId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        subscriber.next(reviews);
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
        subscriber.next(reviews);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  getReviewsByClientRealtime(clientUserId: string): Observable<Review[]> {
    return new Observable<Review[]>(subscriber => {
      const ref = collection(this.firestore, 'reviews');
      const q = query(ref, where('clientUserId', '==', clientUserId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        subscriber.next(reviews);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
  async updateReviewReply(id: string, reply: string) {
    const docRef = doc(this.firestore, `reviews/${id}`);
    return updateDoc(docRef, { reply, updatedAt: new Date() });
  }

  async updateReviewStatus(id: string, status: 'published' | 'pending' | 'flagged') {
    const docRef = doc(this.firestore, `reviews/${id}`);
    return updateDoc(docRef, { status, updatedAt: new Date() });
  }

  async deleteReview(id: string) {
    const docRef = doc(this.firestore, `reviews/${id}`);
    return deleteDoc(docRef);
  }
}
