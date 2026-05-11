import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Payout {
  id: string;
  artistId: string;
  artistName: string;
  amount: number;
  method: string;
  accountNumber: string;
  accountName: string;
  status: 'processing' | 'completed' | 'failed';
  requestedDate: string;
  expectedDate: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PayoutService {
  constructor(private firestore: Firestore) {}

  async requestPayout(data: Omit<Payout, 'id'>) {
    const ref = collection(this.firestore, 'payouts');
    const docRef = doc(ref);
    return setDoc(docRef, { ...data, id: docRef.id });
  }

  getPayoutsForArtistRealtime(artistId: string): Observable<Payout[]> {
    return new Observable<Payout[]>(subscriber => {
      const ref = collection(this.firestore, 'payouts');
      const q = query(ref, where('artistId', '==', artistId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const payouts = snap.docs.map(d => d.data() as Payout);
        subscriber.next(payouts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  async updatePayoutStatus(id: string, status: 'processing' | 'completed' | 'failed' | 'rejected') {
    const docRef = doc(this.firestore, `payouts/${id}`);
    return updateDoc(docRef, { status });
  }

  getAllPayoutsRealtime(): Observable<Payout[]> {
    return new Observable<Payout[]>(subscriber => {
      const ref = collection(this.firestore, 'payouts');
      const unsubscribe = onSnapshot(ref, (snap) => {
        const payouts = snap.docs.map(d => d.data() as Payout);
        subscriber.next(payouts.sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
}
