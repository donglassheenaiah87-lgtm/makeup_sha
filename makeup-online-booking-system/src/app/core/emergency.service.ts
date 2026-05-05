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

export interface ArtistExcuse {
  id: string;
  artistId: string;
  artistName: string;
  reason: string;
  details: string;
  leaveStart: string;
  leaveEnd: string;
  affectedBookingIds: string[];
  status: 'active' | 'resolved';
  declaredAt: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class EmergencyService {
  constructor(private firestore: Firestore) {}

  async declareEmergency(data: Omit<ArtistExcuse, 'id'>) {
    const ref = collection(this.firestore, 'artistExcuses');
    const docRef = doc(ref);
    return setDoc(docRef, { ...data, id: docRef.id });
  }

  async resolveEmergency(id: string) {
    const docRef = doc(this.firestore, `artistExcuses/${id}`);
    return updateDoc(docRef, { status: 'resolved' });
  }

  getActiveEmergenciesForArtist(artistId: string): Observable<ArtistExcuse[]> {
    return new Observable<ArtistExcuse[]>(subscriber => {
      const ref = collection(this.firestore, 'artistExcuses');
      const q = query(ref, where('artistId', '==', artistId), where('status', '==', 'active'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const emergencies = snap.docs.map(d => d.data() as ArtistExcuse);
        subscriber.next(emergencies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
}
