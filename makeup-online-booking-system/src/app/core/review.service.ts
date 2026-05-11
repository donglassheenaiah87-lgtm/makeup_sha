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
  where,
  orderBy,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Review {
  reviewId: string;
  clientId: string;
  clientName: string;
  artistId: string;
  artistName: string;
  reviewText: string;
  rating: number;
  bookingId: string;
  serviceName: string;
  status: 'published' | 'pending' | 'flagged';
  createdAt: any;
  reply?: string;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private firestore: Firestore) {}

  async addReview(data: Omit<Review, 'reviewId' | 'createdAt' | 'status'>) {
    const ref = collection(this.firestore, 'reviews');
    const docRef = doc(ref);
    return setDoc(docRef, { 
      ...data, 
      reviewId: docRef.id, 
      status: 'published',
      createdAt: serverTimestamp() 
    });
  }

  getReviewsForArtistRealtime(artistId: string): Observable<Review[]> {
    return new Observable<Review[]>(subscriber => {
      const ref = collection(this.firestore, 'reviews');
      const q = query(ref, where('artistId', '==', artistId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        // Sort in memory to avoid needing composite indexes
        reviews.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
        });
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
      const q = query(ref);
      const unsubscribe = onSnapshot(q, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        // Sort in memory
        reviews.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
        });
        subscriber.next(reviews);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  getReviewsByClientRealtime(clientId: string): Observable<Review[]> {
    return new Observable<Review[]>(subscriber => {
      const ref = collection(this.firestore, 'reviews');
      const q = query(ref, where('clientId', '==', clientId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const reviews = snap.docs.map(d => d.data() as Review);
        // Sort in memory
        reviews.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
        });
        subscriber.next(reviews);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  async updateReview(id: string, data: Partial<Review>) {
    const docRef = doc(this.firestore, `reviews/${id}`);
    return updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
  }

  async updateReviewReply(id: string, reply: string) {
    const docRef = doc(this.firestore, `reviews/${id}`);
    return updateDoc(docRef, { reply, updatedAt: serverTimestamp() });
  }

  async updateReviewStatus(id: string, status: 'published' | 'pending' | 'flagged') {
    const docRef = doc(this.firestore, `reviews/${id}`);
    return updateDoc(docRef, { status, updatedAt: serverTimestamp() });
  }

  async deleteReview(id: string) {
    const docRef = doc(this.firestore, `reviews/${id}`);
    return deleteDoc(docRef);
  }
}
