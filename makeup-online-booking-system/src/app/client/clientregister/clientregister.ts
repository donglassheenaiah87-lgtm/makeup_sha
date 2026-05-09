import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-clientregister',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './clientregister.html',
  styleUrl: './clientregister.css'
})
export class ClientRegisterComponent {

  currentStep = 1;
  totalSteps = 4;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // ── Step 1: Personal Info ──
  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  birthday = '';
  gender = '';

  // ── Step 2: Account Setup ──
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;

  // ── Step 3: Profile Setup ──
  city = '';
  address = '';
  skinType = '';
  allergies = '';
  eventTypes: string[] = [];
  referral = '';

  // ── Step 4: Payment Method ──
  preferredPayment = '';
  gcashNumber = '';
  cardName = '';
  cardNumber = '';
  cardExpiry = '';
  savePayment = false;

  // focus states
  firstFocused = false; lastFocused = false;
  emailFocused = false; phoneFocused = false;
  bdFocused = false;
  pwFocused = false; cfFocused = false;
  cityFocused = false; addressFocused = false;
  allergyFocused = false; gcashFocused = false;
  cardNameFocused = false; cardNumFocused = false; cardExpFocused = false;

  steps = [
    { num: 1, label: 'Personal Info',    icon: '👤' },
    { num: 2, label: 'Account Setup',    icon: '🔐' },
    { num: 3, label: 'Profile Setup',    icon: '✨' },
    { num: 4, label: 'Payment Method',   icon: '💳' },
  ];

  eventTypeOptions = ['Wedding', 'Debut', 'Prenup', 'Editorial', 'Party/Event', 'Corporate', 'Film/TV', 'Other'];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  // ── Navigation ──
  nextStep() {
    this.errorMessage = '';

    if (this.currentStep === 1) {
      if (!this.firstName || !this.lastName || !this.email || !this.phone) {
        this.errorMessage = 'Please fill in all required fields.'; return;
      }
      if (!/^\S+@\S+\.\S+$/.test(this.email)) {
        this.errorMessage = 'Please enter a valid email address.'; return;
      }
    }

    if (this.currentStep === 2) {
      if (!this.password || !this.confirmPassword) {
        this.errorMessage = 'Please enter and confirm your password.'; return;
      }
      if (this.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters.'; return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match.'; return;
      }
    }

    if (this.currentStep === 3) {
      if (!this.city) {
        this.errorMessage = 'Please enter your city.'; return;
      }
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    } else {
      this.onRegister();
    }
  }

  backStep() {
    this.errorMessage = '';
    if (this.currentStep > 1) this.currentStep--;
  }

  toggleEventType(type: string) {
    const idx = this.eventTypes.indexOf(type);
    if (idx === -1) this.eventTypes.push(type);
    else this.eventTypes.splice(idx, 1);
  }

  hasEventType(type: string): boolean {
    return this.eventTypes.includes(type);
  }

  // ── Final Submission ──
  async onRegister() {
    if (this.currentStep === 4 && !this.preferredPayment) {
      // Payment is optional — allow skip
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService.register(this.email.trim(), this.password);
      const uid = result.user.uid;

      await this.userService.createUser(uid, {
        uid,
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        name: `${this.firstName.trim()} ${this.lastName.trim()}`,
        email: this.email.trim(),
        phone: this.phone.trim(),
        birthday: this.birthday || null,
        gender: this.gender || null,
        role: 'client',
        status: 'active',
        loyaltyPoints: 0,
        // Profile
        city: this.city.trim() || null,
        address: this.address.trim() || null,
        skinType: this.skinType || null,
        allergies: this.allergies.trim() || null,
        eventTypes: this.eventTypes,
        referral: this.referral || null,
        // Payment (store preference only — no raw card data in production)
        preferredPayment: this.preferredPayment || null,
        gcashNumber: this.preferredPayment === 'gcash' ? this.gcashNumber.trim() : null,
        createdAt: new Date(),
      });

      this.isLoading = false;
      this.successMessage = '🎉 Your Lumière account has been created!';
      setTimeout(() => this.router.navigate(['/login']), 2500);

    } catch (error: any) {
      this.isLoading = false;
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'An account with this email already exists.';
          this.currentStep = 1; break;
        case 'auth/invalid-email':
          this.errorMessage = 'Invalid email address.';
          this.currentStep = 1; break;
        case 'auth/weak-password':
          this.errorMessage = 'Password should be at least 6 characters.';
          this.currentStep = 2; break;
        default:
          this.errorMessage = 'Registration failed. Please try again.';
      }
    }
  }

  getPasswordStrength(): { label: string; level: number; color: string } {
    const pw = this.password;
    if (!pw) return { label: '', level: 0, color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak',   level: 1, color: '#e74c3c' };
    if (score <= 2) return { label: 'Fair',   level: 2, color: '#e67e22' };
    if (score <= 3) return { label: 'Good',   level: 3, color: '#f1c40f' };
    return { label: 'Strong', level: 4, color: '#2ecc71' };
  }
}
