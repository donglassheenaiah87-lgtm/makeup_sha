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

export interface UserData {
  uid: string;
  name: string;          // Himoon natong required para sa tanan
  firstName?: string;    // Optional na lang ni para dili mag-error ang registration
  lastName?: string;     // Optional na lang ni
  email: string;
  phone: string;
  role: 'admin' | 'artist' | 'client';
  status?: string; // e.g. 'pending', 'active', 'inactive'
  createdAt: any;

  // Artist-specific
  specialty?: string;
  bio?: string;
  location?: string;
  social?: string;
  profilePicture?: string;
  rating?: number;
  ratingCount?: number;
  services?: any[];
  portfolioItems?: any[];
  weekDays?: any[];
  blockedDates?: string[];

  // Client-specific
  favoriteService?: string;
  notes?: string;
  loyaltyPoints?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private firestore: Firestore) { }

  async createUser(uid: string, data: any) {
    const userRef = doc(this.firestore, `users/${uid}`);

    // Siguraduhon nato nga maski unsa pay i-pasa, naay fallback ang name/firstName
    const payload = {
      uid,
      ...data,
      name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'User',
      firstName: data.firstName || data.name?.split(' ')[0] || '',
      lastName: data.lastName || data.name?.split(' ').slice(1).join(' ') || '',
      loyaltyPoints: data.loyaltyPoints ?? 0,
      createdAt: data.createdAt || new Date()
    };

    return setDoc(userRef, payload);
  }

  async getUser(uid: string): Promise<UserData | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data() as UserData) : null;
  }

  async getAllUsers(): Promise<UserData[]> {
    const usersRef = collection(this.firestore, 'users');
    const snap = await getDocs(usersRef);
    return snap.docs.map(d => d.data() as UserData);
  }

  async getUsersByRole(role: 'admin' | 'artist' | 'client'): Promise<UserData[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserData);
  }

  getUsersByRoleRealtime(role: 'admin' | 'artist' | 'client'): Observable<UserData[]> {
    return new Observable<UserData[]>(subscriber => {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('role', '==', role));
      const unsubscribe = onSnapshot(q, (snap) => {
        const users = snap.docs.map(d => d.data() as UserData);
        subscriber.next(users);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  getArtistsFromArtistsCollectionRealtime(): Observable<any[]> {
    return new Observable<any[]>(subscriber => {
      const artistsRef = collection(this.firestore, 'artists');
      const unsubscribe = onSnapshot(artistsRef, (snap) => {
        const artists = snap.docs.map(d => d.data());
        subscriber.next(artists);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  getAllUsersRealtime(): Observable<UserData[]> {
    return new Observable<UserData[]>(subscriber => {
      const usersRef = collection(this.firestore, 'users');
      const unsubscribe = onSnapshot(usersRef, (snap) => {
        const users = snap.docs.map(d => d.data() as UserData);
        subscriber.next(users);
      }, (error) => {
        subscriber.error(error);
      });
      return { unsubscribe };
    });
  }

  async updateUser(uid: string, data: Partial<UserData>) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return updateDoc(userRef, { ...data });
  }

  async deleteUser(uid: string) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return deleteDoc(userRef);
  }

  getDisplayName(user: UserData): string {
    return user.name || `${user.firstName} ${user.lastName}`.trim() || user.email;
  }
}