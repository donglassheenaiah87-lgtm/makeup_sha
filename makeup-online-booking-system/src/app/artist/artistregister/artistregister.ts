import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc, collection } from '@angular/fire/firestore';
import { UserService } from '../../core/user.service';
import { ServiceItemService, ServiceData } from '../../core/service-item.service';

@Component({
  selector: 'app-artist-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './artistregister.html',
  styleUrls: ['./artistregister.css']
})
export class ArtistRegisterComponent implements OnInit {
  // Navigation
  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Step 1: Personal Info
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  address = '';
  birthdate = '';
  gender = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;

  // Step 2: Specialization & Experience
  availableServices: ServiceData[] = [];
  selectedSpecializations: string[] = [];
  yearsExperience: number | null = null;
  bio = '';
  skills = '';

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private userService: UserService,
    private serviceItemService: ServiceItemService,
    private router: Router
  ) {}

  async ngOnInit() {
    try {
      this.availableServices = await this.serviceItemService.getAllServices();
    } catch (e) {
      console.error('Failed to load services', e);
    }
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (!this.firstName || !this.lastName || !this.email || !this.phone || !this.address || !this.password) {
        this.errorMessage = 'Please fill in all personal details.';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        return;
      }
      this.errorMessage = '';
      this.currentStep = 2;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  toggleSpecialization(serviceName: string) {
    const idx = this.selectedSpecializations.indexOf(serviceName);
    if (idx > -1) {
      this.selectedSpecializations.splice(idx, 1);
    } else {
      this.selectedSpecializations.push(serviceName);
    }
  }

  async onRegister() {
    if (!this.yearsExperience || this.selectedSpecializations.length === 0) {
      this.errorMessage = 'Please select at least one specialization and provide your experience.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // 1. Create Auth User
      const trimmedEmail = this.email.trim();
      const result = await createUserWithEmailAndPassword(this.auth, trimmedEmail, this.password);
      const uid = result.user.uid;

      const artistData = {
        uid,
        firstName: this.firstName,
        lastName: this.lastName,
        name: `${this.firstName} ${this.lastName}`,
        email: trimmedEmail,
        phone: this.phone,
        address: this.address,
        birthdate: this.birthdate,
        gender: this.gender,
        role: 'artist',
        status: 'pending',
        specialty: this.selectedSpecializations.join(', '),
        specializations: this.selectedSpecializations,
        yearsExperience: this.yearsExperience,
        bio: this.bio,
        skills: this.skills,
        createdAt: new Date(),
        rating: 5,
        ratingCount: 0,
        revenue: 0,
        bookings: 0
      };

      // 2. Save to 'users' collection for login/auth
      await this.userService.createUser(uid, artistData);

      // 3. Save to dedicated 'artists' collection as requested
      const artistRef = doc(this.firestore, `artists/${uid}`);
      await setDoc(artistRef, artistData);

      this.isLoading = false;
      this.currentStep = 3; // Success step
    } catch (error: any) {
      this.isLoading = false;
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'Email is already registered.'; break;
        case 'auth/invalid-email':
          this.errorMessage = 'Invalid email address.'; break;
        case 'auth/weak-password':
          this.errorMessage = 'Password is too weak.'; break;
        default:
          this.errorMessage = 'Registration failed. ' + (error.message || 'Please try again.');
      }
    }
  }
}