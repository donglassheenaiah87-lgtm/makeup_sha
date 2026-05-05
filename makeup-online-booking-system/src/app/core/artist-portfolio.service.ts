import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface PortfolioItem {
  id: string;
  artistId: string;
  imageUrl: string;
  title: string;
  description: string;
  serviceCategory?: string;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ArtistPortfolioService {
  constructor(private firestore: Firestore) {}

  // ── Add Item to Portfolio (Artist) ──
  async addPortfolioItem(data: Omit<PortfolioItem, 'id'>) {
    const ref = collection(this.firestore, 'artistPortfolios');
    const newDocRef = doc(ref);
    return setDoc(newDocRef, { ...data, id: newDocRef.id, createdAt: new Date() });
  }

  // ── Delete Item from Portfolio (Artist) ──
  async deletePortfolioItem(itemId: string) {
    const docRef = doc(this.firestore, `artistPortfolios/${itemId}`);
    return deleteDoc(docRef);
  }

  // ── Get Artist Portfolio (Client & Artist) ──
  getPortfolioRealtime(artistId: string): Observable<PortfolioItem[]> {
    return new Observable<PortfolioItem[]>(subscriber => {
      const ref = collection(this.firestore, 'artistPortfolios');
      const q = query(ref, where('artistId', '==', artistId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => d.data() as PortfolioItem);
        // Sort by newest first
        subscriber.next(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
  // ── Get All Portfolios (Global) ──
  getAllPortfoliosRealtime(): Observable<PortfolioItem[]> {
    return new Observable<PortfolioItem[]>(subscriber => {
      const ref = collection(this.firestore, 'artistPortfolios');
      const unsubscribe = onSnapshot(ref, (snap) => {
        const items = snap.docs.map(d => d.data() as PortfolioItem);
        subscriber.next(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }
}
