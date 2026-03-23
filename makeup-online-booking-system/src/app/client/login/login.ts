import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-client-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class ClientLoginComponent {
  email = '';
  password = '';
  errorMessage = '';
  showPassword = false;
  rememberMe = false;
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {}

  goTo(role: string) {
    const map: Record<string, string> = {
      client: '/client/login',
      artist: '/artist/login',
      admin:  '/admin/login',
    };
    this.router.navigate([map[role]]);
  }

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
      // Step 1: Firebase Auth login
      const result = await this.authService.login(this.email, this.password);
      const uid = result.user.uid;

      // Step 2: Check role in Firestore
      const userData = await this.userService.getUser(uid);

      if (!userData) {
        this.errorMessage = 'User data not found. Contact support.';
        this.isLoading = false;
        await this.authService.logout();
        return;
      }

      if (userData.role !== 'client') {
        this.errorMessage = 'Access denied. Client accounts only.';
        this.isLoading = false;
        await this.authService.logout();
        return;
      }

      // Step 3: Clear guest mode if any, then go to dashboard
      sessionStorage.removeItem('guestMode');
      this.router.navigate(['/client/dashboard']);

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