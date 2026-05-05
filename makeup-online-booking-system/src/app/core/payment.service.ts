import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  onSnapshot
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
}
