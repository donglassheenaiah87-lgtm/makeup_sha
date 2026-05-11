import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  addDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ArtistExcuse {
  id: string;
  artistId: string;
  artistName: string;
  reason: string;
  details: string;
  leaveStart: string;
  leaveEnd: string;
  affectedBookingIds: string[];
  status: 'active' | 'resolved' | 'rejected';
  declaredAt: string;
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class EmergencyService {
  constructor(private firestore: Firestore) {}

  async declareEmergency(data: Omit<ArtistExcuse, 'id'>) {
    const ref = collection(this.firestore, 'excuseRequests');
    const docRef = doc(ref);
    return setDoc(docRef, { ...data, id: docRef.id, createdAt: serverTimestamp() });
  }

  async resolveEmergency(id: string) {
    const docRef = doc(this.firestore, `excuseRequests/${id}`);
    return updateDoc(docRef, { status: 'resolved' });
  }

  async rejectEmergency(id: string) {
    const docRef = doc(this.firestore, `excuseRequests/${id}`);
    // We could delete or mark as rejected. Marking as rejected is better for audit.
    return updateDoc(docRef, { status: 'rejected' });
  }

  getActiveEmergenciesForArtist(artistId: string): Observable<ArtistExcuse[]> {
    return new Observable<ArtistExcuse[]>(subscriber => {
      const ref = collection(this.firestore, 'excuseRequests');
      const q = query(ref, where('artistId', '==', artistId), where('status', '==', 'active'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const emergencies = snap.docs.map(d => d.data() as ArtistExcuse);
        subscriber.next(emergencies);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  getEmergenciesForArtistRealtime(artistId: string): Observable<ArtistExcuse[]> {
    return new Observable<ArtistExcuse[]>(subscriber => {
      const ref = collection(this.firestore, 'excuseRequests');
      const q = query(ref, where('artistId', '==', artistId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const emergencies = snap.docs.map(d => d.data() as ArtistExcuse);
        subscriber.next(emergencies);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  getAllEmergenciesRealtime(): Observable<ArtistExcuse[]> {
    return new Observable<ArtistExcuse[]>(subscriber => {
      const ref = collection(this.firestore, 'excuseRequests');
      const unsubscribe = onSnapshot(ref, (snap) => {
        const emergencies = snap.docs.map(d => d.data() as ArtistExcuse);
        subscriber.next(emergencies);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  async reassignBooking(bookingId: string, newArtistId: string, newArtistName: string) {
    const bookingRef = doc(this.firestore, `bookings/${bookingId}`);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) return;
    
    const oldData = snap.data();
    
    // 1. Update Booking
    await updateDoc(bookingRef, {
      assignedArtistId: newArtistId,
      artistName: newArtistName,
      transferredFrom: oldData['assignedArtistId'],
      transferDate: serverTimestamp()
    });

    // 2. Create Notification for Client
    await addDoc(collection(this.firestore, 'notifications'), {
      recipientId: oldData['clientId'],
      type: 'emergency_reassignment',
      title: 'Booking Reassigned',
      message: `Due to an artist emergency, your booking for ${oldData['serviceName']} has been reassigned to ${newArtistName}.`,
      timestamp: serverTimestamp(),
      read: false
    });

    // 3. Create Notification for New Artist
    await addDoc(collection(this.firestore, 'notifications'), {
      recipientId: newArtistId,
      type: 'new_assignment',
      title: 'New Emergency Assignment',
      message: `You have been reassigned a booking for ${oldData['clientName']} due to an emergency handoff.`,
      timestamp: serverTimestamp(),
      read: false
    });
  }
}
