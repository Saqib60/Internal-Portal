import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../core/auth.service';
import { CaptchaComponent } from '../shared/captcha.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, CaptchaComponent],
  styleUrl: './auth-card.scss',
  template: `
    <div class="card">
      <div class="steps">Step 1 of 3 · Find your account</div>
      <h2>Forgot your password?</h2>
      <p class="sub">Enter your username or work email. We’ll confirm it’s you with Microsoft Authenticator, then you can set a new password.</p>
      @if (captchaError()) {
        <div class="banner" role="alert"><mat-icon>error_outline</mat-icon><div><strong>The security check didn’t match.</strong> Try the new code.</div></div>
      }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label>Username or email <span class="star">*</span></label>
          <mat-form-field appearance="outline">
            <mat-icon matIconPrefix>person_outline</mat-icon>
            <input matInput formControlName="user" placeholder="ahmed.raza or ahmed.raza@netsoltech.com" />
            <mat-error>Enter your username or email</mat-error>
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
        </div>
        <button mat-flat-button color="primary" class="full" type="submit" [disabled]="busy()">
          @if (busy()) { <mat-spinner diameter="20" /> } @else { Continue }
        </button>
      </form>
      <a class="back" routerLink="/login"><mat-icon>arrow_back</mat-icon> Back to sign in</a>
    </div>
  `,
})
export class ForgotPasswordComponent {
  @ViewChild('captcha') captcha!: CaptchaComponent;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly captchaError = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    user: ['', Validators.required],
    captcha: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.auth.startReset(this.form.value.user!, this.captcha.matches(this.form.value.captcha)).subscribe({
      next: () => { this.busy.set(false); this.router.navigate(['/forgot-password/verify']); },
      error: () => { this.busy.set(false); this.captchaError.set(true); this.captcha.refresh(); },
    });
  }
}
