import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface BookingData {
  id: string; // Document ID
  clientName: string;
  clientId?: string;
  email?: string;
  serviceName: string;
  artistName: string;
  artistId?: string;
  date: string;
  time?: string;
  amount: string;
  paymentMethod?: string;
  paymentAccount?: string;
  paymentStatus?: 'unpaid' | 'paid';
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'emergency';
  phone?: string;
  notes?: string;
  eventType?: string;
  venue?: string;
  // New Guest Wizard Fields
  firstName?: string;
  lastName?: string;
  address?: string;
  age?: number;
  gender?: string;
  package?: string;
  allergies?: string;
  skinSensitivity?: string;
  medicalConcerns?: string;
  bookingRef?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {

  constructor(private firestore: Firestore) {}

  // ── Create a new booking ──
  async addBooking(data: Omit<BookingData, 'id'>) {
    const bookingsRef = collection(this.firestore, 'bookings');
    // Using simple doc() to auto-generate an ID
    const newDocRef = doc(bookingsRef);
    return setDoc(newDocRef, { ...data, id: newDocRef.id, createdAt: new Date() });
  }

  // ── Get single booking by ID ──
  async getBooking(id: string): Promise<BookingData | null> {
    const bookingRef = doc(this.firestore, `bookings/${id}`);
    const snap = await getDoc(bookingRef);
    return snap.exists() ? (snap.data() as BookingData) : null;
  }

  // ── Get all bookings ──
  async getAllBookings(): Promise<BookingData[]> {
    const bookingsRef = collection(this.firestore, 'bookings');
    const snap = await getDocs(bookingsRef);
    return snap.docs.map(d => d.data() as BookingData);
  }

  // ── Get all bookings (Real-time) ──
  getAllBookingsRealtime(): Observable<BookingData[]> {
    return new Observable<BookingData[]>(subscriber => {
      const bookingsRef = collection(this.firestore, 'bookings');
      const unsubscribe = onSnapshot(bookingsRef, (snap) => {
        const bookings = snap.docs.map(d => d.data() as BookingData);
        subscriber.next(bookings);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Get bookings for a specific client ──
  async getBookingsByClient(clientName: string): Promise<BookingData[]> {
    const bookingsRef = collection(this.firestore, 'bookings');
    const q = query(bookingsRef, where('clientName', '==', clientName));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BookingData);
  }

  // ── Get bookings for a specific client (Real-time) ──
  getBookingsByClientRealtime(clientName: string, clientId?: string): Observable<BookingData[]> {
    return new Observable<BookingData[]>(subscriber => {
      const bookingsRef = collection(this.firestore, 'bookings');
      // If clientId is provided, we can query by clientId. Otherwise by clientName.
      // But let's just query by clientId if available, else fallback to clientName
      const q = clientId 
        ? query(bookingsRef, where('clientId', '==', clientId))
        : query(bookingsRef, where('clientName', '==', clientName));
      const unsubscribe = onSnapshot(q, (snap) => {
        const bookings = snap.docs.map(d => d.data() as BookingData);
        subscriber.next(bookings);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Get bookings for a specific artist ──
  async getBookingsByArtist(artistName: string): Promise<BookingData[]> {
    const bookingsRef = collection(this.firestore, 'bookings');
    const q = query(bookingsRef, where('artistName', '==', artistName));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BookingData);
  }

  // ── Get bookings for a specific artist (Real-time) ──
  getBookingsByArtistRealtime(artistName: string): Observable<BookingData[]> {
    return new Observable<BookingData[]>(subscriber => {
      const bookingsRef = collection(this.firestore, 'bookings');
      const q = query(bookingsRef, where('artistName', '==', artistName));
      const unsubscribe = onSnapshot(q, (snap) => {
        const bookings = snap.docs.map(d => d.data() as BookingData);
        subscriber.next(bookings);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  // ── Update booking ──
  async updateBooking(id: string, data: Partial<BookingData>) {
    const bookingRef = doc(this.firestore, `bookings/${id}`);
    return updateDoc(bookingRef, { ...data });
  }

  // ── Update booking status ──
  async updateBookingStatus(id: string, status: string) {
    const bookingRef = doc(this.firestore, `bookings/${id}`);
    return updateDoc(bookingRef, { status });
  }

  // ── Delete booking ──
  async deleteBooking(id: string) {
    const bookingRef = doc(this.firestore, `bookings/${id}`);
    return deleteDoc(bookingRef);
  }
}
