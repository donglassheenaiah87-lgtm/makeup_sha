// clientregister.ts — Enhanced with validation, strength meter
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-client-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './clientregister.html',
  styleUrls: ['./clientregister.css']
})
export class ClientRegisterComponent {
  name = ''; email = ''; phone = '';
  password = ''; confirmPassword = '';
  showPassword = false; showConfirm = false;
  agreedToTerms = false;
  errorMessage = ''; successMessage = '';
  isLoading = false;

  // focus states
  nameFocus = false; emailFocus = false; phoneFocus = false;
  pwFocus = false; cpwFocus = false;

  // validation errors
  nameError = ''; emailError = ''; pwError = '';

  // password strength: 1=weak, 2=fair, 3=strong
  pwStrength = 0;

  features = [
    { icon: 'fas fa-calendar-check', title: 'Easy Online Booking', desc: 'Reserve your appointment in minutes, 24/7' },
    { icon: 'fas fa-medal', title: 'Certified Artists', desc: 'All our MUAs are trained & verified professionals' },
    { icon: 'fas fa-shield-alt', title: 'Secure & Private', desc: 'Your personal data is always safe with us' },
    { icon: 'fas fa-star', title: 'Guaranteed Glam', desc: 'Love your look or we\'ll make it right' }
  ];

  constructor(private auth: Auth, private userService: UserService, private router: Router) {}

  validateName(): void {
    this.nameError = !this.name.trim() ? 'Please enter your full name' :
                     this.name.trim().length < 2 ? 'Name is too short' : '';
  }
  validateEmail(): void {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.emailError = !this.email ? 'Please enter your email' :
                      !emailRe.test(this.email) ? 'Invalid email format' : '';
  }
  onPasswordInput(): void {
    const p = this.password;
    let score = 0;
    if (p.length >= 6) score++;
    if (/[A-Z]/.test(p) || /[0-9]/.test(p)) score++;
    if (p.length >= 10 && /[^a-zA-Z0-9]/.test(p)) score++;
    this.pwStrength = score;
    this.pwError = p && p.length < 6 ? 'Password must be at least 6 characters' : '';
  }

  async onRegister() {
    this.errorMessage = ''; this.successMessage = '';
    this.validateName(); this.validateEmail();
    if (this.nameError || this.emailError) return;
    if (!this.phone.trim()) { this.errorMessage = 'Please enter your phone number.'; return; }
    if (!this.password) { this.errorMessage = 'Please enter a password.'; return; }
    if (this.password.length < 6) { this.errorMessage = 'Password must be at least 6 characters.'; return; }
    if (this.password !== this.confirmPassword) { this.errorMessage = 'Passwords do not match.'; return; }
    if (!this.agreedToTerms) { this.errorMessage = 'Please agree to the terms to continue.'; return; }

    this.isLoading = true;
    try {
      const result = await createUserWithEmailAndPassword(this.auth, this.email, this.password);
      await this.userService.createUser(result.user.uid, {
        name: this.name, email: this.email, phone: this.phone,
        role: 'client', createdAt: new Date()
      });
      this.successMessage = 'Account created! Redirecting to login…';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (error: any) {
      this.isLoading = false;
      switch (error.code) {
        case 'auth/email-already-in-use': this.errorMessage = 'Email is already registered.'; break;
        case 'auth/invalid-email': this.errorMessage = 'Invalid email address.'; break;
        case 'auth/weak-password': this.errorMessage = 'Password is too weak.'; break;
        default: this.errorMessage = 'Registration failed. Please try again.';
      }
    }
  }
}