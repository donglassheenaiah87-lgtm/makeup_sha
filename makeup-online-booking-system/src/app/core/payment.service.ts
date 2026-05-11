import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface PaymentData {
  id: string; // Document ID
  clientName: string;
  clientId?: string;
  amount: string;
  paymentMethod: string;
  paymentAccount?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(private firestore: Firestore) {}

  // ── Create a new payment ──
  async addPayment(data: Omit<PaymentData, 'id'>) {
    const paymentsRef = collection(this.firestore, 'payments');
    const newDocRef = doc(paymentsRef);
    return setDoc(newDocRef, { ...data, id: newDocRef.id, createdAt: new Date() });
  }

  // ── Get all payments (Real-time) ──
  getAllPaymentsRealtime(): Observable<PaymentData[]> {
    return new Observable<PaymentData[]>(subscriber => {
      const paymentsRef = collection(this.firestore, 'payments');
      const unsubscribe = onSnapshot(paymentsRef, (snap) => {
        const payments = snap.docs.map(d => d.data() as PaymentData);
        subscriber.next(payments);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Payout Requests ──
  async requestPayout(artistId: string, artistName: string, amount: number, method: string, account: string) {
    const ref = collection(this.firestore, 'payoutRequests');
    const docRef = doc(ref);
    return setDoc(docRef, {
      id: docRef.id,
      artistId,
      artistName,
      amount,
      method,
      account,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  }

  getAllPayoutRequestsRealtime(): Observable<any[]> {
    return new Observable<any[]>(subscriber => {
      const ref = collection(this.firestore, 'payoutRequests');
      const unsubscribe = onSnapshot(ref, (snap) => {
        const payouts = snap.docs.map(d => d.data());
        subscriber.next(payouts);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  async updatePayoutStatus(id: string, status: 'approved' | 'rejected' | 'processed' | 'completed' | 'processing') {
    const docRef = doc(this.firestore, `payoutRequests/${id}`);
    return updateDoc(docRef, { status, updatedAt: serverTimestamp() });
  }
}
