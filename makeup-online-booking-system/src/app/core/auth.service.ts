import { Injectable } from '@angular/core';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserService } from './user.service';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  user,
  createUserWithEmailAndPassword,
  updateProfile
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  currentUser$: Observable<any>;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private userService: UserService
  ) {
    this.currentUser$ = user(this.auth);
  }

  // Register new user
  async register(
    email: string,
    password: string,
    name: string
  ) {

    const result = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    // SET FIREBASE AUTH DISPLAY NAME (updated to include comment)
    await updateProfile(result.user, {
      displayName: name
    }); // <-- displayName set here

    console.log('Updated User:', result.user);

    return result;
  }

  // Login + save lastLogin to Firestore
  async login(email: string, password: string) {

    const result = await signInWithEmailAndPassword(
      this.auth,
      email,
      password
    );

    // Firestore user data
    const firestoreUser = await this.userService.getUser(
      result.user.uid
    );

    console.log('AUTH USER:', result.user);

    console.log('FIRESTORE USER:', firestoreUser);

    // Populate auth user with Firestore profile data (name & phone) for UI usage
    (result.user as any).displayName = firestoreUser?.name ?? result.user.displayName;
    (result.user as any).phoneNumber = firestoreUser?.phone ?? null;
    // Save last login
    const userRef = doc(this.firestore, `users/${result.user.uid}`);

    await setDoc(
      userRef,
      { lastLogin: new Date() },
      { merge: true }
    );

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