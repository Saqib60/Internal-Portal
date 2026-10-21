import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, SignInError } from '../core/auth.service';
import { MOCK_CONFIG } from '../core/mock-data';
import { CaptchaComponent } from '../shared/captcha.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressSpinnerModule, CaptchaComponent],
  styleUrl: './auth-card.scss',
  template: `
    <div class="card">
      <h2>Welcome back</h2>
      <p class="sub">Sign in with your NETSOL username to continue.</p>

      @if (error(); as e) {
        <div class="banner" role="alert">
          <mat-icon>error_outline</mat-icon>
          <div>
            @switch (e.kind) {
              @case ('credentials') { <strong>That username or password isn’t right.</strong> {{ e.attemptsLeft }} attempt{{ e.attemptsLeft === 1 ? '' : 's' }} left before your account is locked for 15 minutes. }
              @case ('captcha') { <strong>The security check didn’t match.</strong> We’ve shown you a new one, please try again. }
              @case ('locked') { <strong>Your account is locked.</strong> Too many failed attempts. Try again in 15 minutes or call the IT helpdesk. }
            }
          </div>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label>Username <span class="star">*</span></label>
          <mat-form-field appearance="outline">
            <mat-icon matIconPrefix>person_outline</mat-icon>
            <input matInput formControlName="username" autocomplete="username" placeholder="e.g. ahmed.raza" />
            <mat-error>Enter your username</mat-error>
          </mat-form-field>
        </div>
        <div class="field">
          <label>Password <span class="star">*</span></label>
          <mat-form-field appearance="outline">
            <mat-icon matIconPrefix>lock_outline</mat-icon>
            <input matInput [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
            <button mat-icon-button matIconSuffix type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error>Enter your password</mat-error>
          </mat-form-field>
        </div>
        <div class="field">
          <label>Security check <span class="star">*</span></label>
          <div class="captcha-row">
            <app-captcha #captcha (refreshed)="form.controls.captcha.reset()" />
            <mat-form-field appearance="outline">
              <input matInput formControlName="captcha" placeholder="Type the code" autocomplete="off" />
              <mat-error>Enter the code</mat-error>
            </mat-form-field>
          </div>
          <small class="muted">Not case-sensitive. Can’t read it? Select refresh for a new one.</small>
        </div>
        <div class="row">
          <mat-checkbox formControlName="remember" color="primary">Keep me signed in</mat-checkbox>
          <a routerLink="/forgot-password">Forgot password?</a>
        </div>
        <button mat-flat-button color="primary" class="full" type="submit" [disabled]="busy()">
          @if (busy()) { <mat-spinner diameter="20" /> } @else { Sign in }
        </button>
      </form>
      <div class="foot"><mat-icon>verified_user</mat-icon> You’ll confirm sign-in with Microsoft Authenticator.</div>
      <div class="demo">Demo sign-in: <code>{{ demoUser }}</code> / <code>{{ demoPass }}</code></div>
    </div>
  `,
})
export class LoginComponent {
  @ViewChild('captcha') captcha!: CaptchaComponent;
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly demoUser = MOCK_CONFIG.username;
  readonly demoPass = MOCK_CONFIG.password;
  readonly showPassword = signal(false);
  readonly busy = signal(false);
  readonly error = signal<SignInError | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    captcha: ['', Validators.required],
    remember: [true],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password, captcha, remember } = this.form.getRawValue();
    this.busy.set(true);
    this.auth.signIn(username, password, this.captcha.matches(captcha), remember).subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigate(['/login/verify']);
      },
      error: (e: SignInError) => {
        this.busy.set(false);
        this.error.set(e);
        this.captcha.refresh();
        if (e.kind === 'credentials') this.form.controls.password.reset();
      },
    });
  }
}
