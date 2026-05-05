import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';
import { UserService } from '../core/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  showPassword = false;
  rememberMe = false;
  isLoading = false;

  // focus state for animated input borders
  emailFocused = false;
  pwFocused = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {}

  // ── Guest Access ──
  continueAsGuest() {
    sessionStorage.setItem('guestMode', 'true');
    this.router.navigate(['/client/dashboard']);
  }

  async onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const trimmedEmail = this.email.trim();
      // Step 1: Firebase Auth login
      const result = await this.authService.login(trimmedEmail, this.password);
      const uid = result.user.uid;

      // Step 2: Check role in Firestore
      let userData = await this.userService.getUser(uid);

      if (!userData) {
        // Auto create user data as client if it doesn't exist, unless it's the admin
        const isAdmin = this.email.trim().toLowerCase() === 'admin@glowbook.com';
        const role = isAdmin ? 'admin' : 'client';
        await this.userService.createUser(uid, {
          email: this.email,
          role: role,
          name: this.email.split('@')[0], 
          phone: '',
          createdAt: new Date()
        });
        userData = await this.userService.getUser(uid);
      } else if (this.email.trim().toLowerCase() === 'admin@glowbook.com' && userData.role !== 'admin') {
        // Force update to admin if they were accidentally created as another role before
        await this.userService.updateUser(uid, { role: 'admin' });
        userData.role = 'admin';
      }

      if (!userData) {
        this.errorMessage = 'User data not found. Contact support.';
        this.isLoading = false;
        await this.authService.logout();
        return;
      }

      // Step 3: Clear guest mode if any, then go to respective dashboard
      sessionStorage.removeItem('guestMode');
      
      if (userData.role === 'admin') {
        this.router.navigate(['/admin/dashboard']);
      } else if (userData.role === 'artist') {
        if (userData.status === 'pending') {
          this.errorMessage = 'Your artist account is pending admin approval.';
          this.isLoading = false;
          await this.authService.logout();
          return;
        }
        this.router.navigate(['/artist/dashboard']);
      } else {
        this.router.navigate(['/client/dashboard']);
      }

    } catch (error: any) {
      this.isLoading = false;
      switch (error.code) {
        case 'auth/user-not-found':
          this.errorMessage = 'No account found with this email.'; break;
        case 'auth/wrong-password':
          this.errorMessage = 'Incorrect password.'; break;
        case 'auth/invalid-credential':
          this.errorMessage = 'Invalid email or password.'; break;
        case 'auth/invalid-email':
          this.errorMessage = 'Invalid email address.'; break;
        case 'auth/too-many-requests':
          this.errorMessage = 'Too many attempts. Try again later.'; break;
        default:
          this.errorMessage = 'Login failed. Please try again.';
      }
    }
  }
}
