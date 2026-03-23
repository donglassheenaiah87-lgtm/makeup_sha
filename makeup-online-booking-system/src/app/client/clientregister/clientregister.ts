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
  name = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirm = false;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private auth: Auth,
    private userService: UserService,
    private router: Router
  ) {}

  async onRegister() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validations
    if (!this.name || !this.email || !this.phone || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    this.isLoading = true;

    try {
      // Step 1: Create Firebase Auth account
      const result = await createUserWithEmailAndPassword(
        this.auth, this.email, this.password
      );
      const uid = result.user.uid;

      // Step 2: Save user data to Firestore
      await this.userService.createUser(uid, {
        name: this.name,
        email: this.email,
        phone: this.phone,
        role: 'client',
        createdAt: new Date()
      });

      this.successMessage = 'Account created! Redirecting to login...';
      setTimeout(() => this.router.navigate(['/client/login']), 2000);
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
          this.errorMessage = 'Registration failed. Please try again.';
      }
    }
  }
}