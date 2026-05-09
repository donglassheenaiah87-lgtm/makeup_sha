import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, user, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  currentUser$: Observable<any>;

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    this.currentUser$ = user(this.auth);
  }

  // Register new user
  async register(email: string, password: string) {
    return await createUserWithEmailAndPassword(this.auth, email, password);
  }

  // Login + save lastLogin to Firestore
  async login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(this.auth, email, password);

    // Save last login timestamp to Firestore
    const userRef = doc(this.firestore, `users/${result.user.uid}`);
    await setDoc(userRef, { lastLogin: new Date() }, { merge: true });

    return result;
  }

  // Logout
  logout() {
    return signOut(this.auth);
  }

  // Get current user
  getCurrentUser() {
    return this.auth.currentUser;
  }
}