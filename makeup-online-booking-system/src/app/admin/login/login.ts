import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import { UserService } from '../../core/user.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class AdminLoginComponent {
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

  async onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Normalize email if they just typed admin@glowbook
      const finalEmail = this.email === 'admin@glowbook' ? 'admin@glowbook.com' : this.email;

      // Auto-create Admin profile if it's the very first time entering the demo credentials
      if (finalEmail === 'admin@glowbook.com' && this.password === 'admin123') {
         try {
           const { getAuth, createUserWithEmailAndPassword } = await import('@angular/fire/auth');
           const regResult = await createUserWithEmailAndPassword(getAuth(), finalEmail, this.password);
           await this.userService.createUser(regResult.user.uid, {
               name: 'Super Admin', email: finalEmail, phone: '', role: 'admin', createdAt: new Date()
           });
         } catch (e: any) {
           // If email is already in use, it will gracefully fall through to login below
         }
      }

      // Step 1: Firebase Auth login
      const result = await this.authService.login(finalEmail, this.password);
      const uid = result.user.uid;

      // Step 2: Check role in Firestore
      let userData = await this.userService.getUser(uid);

      // Failsafe: if the document was somehow lost or not created, recreate it
      if (!userData && finalEmail === 'admin@glowbook.com') {
          await this.userService.createUser(uid, {
               name: 'Super Admin', email: finalEmail, phone: '', role: 'admin', createdAt: new Date()
          });
          userData = await this.userService.getUser(uid);
      }

      if (!userData) {
        this.errorMessage = 'User data not found. Contact support.';
        this.isLoading = false;
        await this.authService.logout();
        return;
      }

      if (userData.role !== 'admin') {
        this.errorMessage = 'Access denied. Admin accounts only.';
        this.isLoading = false;
        await this.authService.logout();
        return;
      }

      // Step 3: Go to dashboard
      this.router.navigate(['/admin/dashboard']);

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