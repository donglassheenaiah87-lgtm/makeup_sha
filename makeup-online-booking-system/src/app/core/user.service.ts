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

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  specialty?: string;
  role: 'admin' | 'artist' | 'client';
  createdAt: Date;
  bio?: string;
  location?: string;
  social?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private firestore: Firestore) { }

  // ── Create user document after registration ──
  async createUser(uid: string, data: Omit<UserData, 'uid'>) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return setDoc(userRef, { uid, ...data, createdAt: new Date() });
  }

  // ── Get single user by UID ──
  async getUser(uid: string): Promise<UserData | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data() as UserData) : null;
  }

  // ── Get all users ──
  async getAllUsers(): Promise<UserData[]> {
    const usersRef = collection(this.firestore, 'users');
    const snap = await getDocs(usersRef);
    return snap.docs.map(d => d.data() as UserData);
  }

  // ── Get users by role ──
  async getUsersByRole(role: 'admin' | 'artist' | 'client'): Promise<UserData[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserData);
  }

  // ── Update user ──
  async updateUser(uid: string, data: Partial<UserData>) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return updateDoc(userRef, { ...data });
  }

  // ── Delete user ──
  async deleteUser(uid: string) {
    const userRef = doc(this.firestore, `users/${uid}`);
    return deleteDoc(userRef);
  }
}