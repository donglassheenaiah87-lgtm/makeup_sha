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
  where
} from '@angular/fire/firestore';

export interface BookingData {
  id: string; // Document ID
  clientName: string;
  clientId?: string;
  serviceName: string;
  artistName: string;
  artistId?: string;
  date: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  phone?: string;
  notes?: string;
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

  // ── Get bookings for a specific client ──
  async getBookingsByClient(clientName: string): Promise<BookingData[]> {
    const bookingsRef = collection(this.firestore, 'bookings');
    const q = query(bookingsRef, where('clientName', '==', clientName));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BookingData);
  }

  // ── Get bookings for a specific artist ──
  async getBookingsByArtist(artistName: string): Promise<BookingData[]> {
    const bookingsRef = collection(this.firestore, 'bookings');
    const q = query(bookingsRef, where('artistName', '==', artistName));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as BookingData);
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
