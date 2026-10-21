import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../core/auth.service';
import { FeedbackService } from '../core/feedback.service';
import { MOCK_CONFIG } from '../core/mock-data';

type MfaState = 'push' | 'code' | 'timeout';

/** Microsoft Authenticator step: number matching, 6-digit code fallback, timeout. Used by sign-in and password reset. */
@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatProgressSpinnerModule],
  styleUrl: './auth-card.scss',
  template: `
    <div class="card">
      @if (isReset) { <div class="steps">Step 2 of 3 · Verify it’s you</div> }
      <div class="ms"><span class="sq r"></span><span class="sq g"></span><span class="sq b"></span><span class="sq y"></span><span>Microsoft Authenticator</span></div>

      @switch (state()) {
        @case ('push') {
          <h2>Approve sign-in request</h2>
          <p class="sub">Open your Authenticator app and enter the number shown to {{ isReset ? 'confirm it’s you' : 'sign in' }}.</p>
          <div class="number">{{ number() }}</div>
          <div class="waiting"><mat-spinner diameter="18" /> Waiting for your approval… <span class="muted">{{ secondsLeft() }}s</span></div>
          <p class="hint">No notification? Make sure your phone is online and the app is up to date.</p>
          <button mat-stroked-button class="full" type="button" (click)="useCode()">I can’t use my app right now</button>
        }
        @case ('code') {
          <h2>Enter verification code</h2>
          <p class="sub">Enter the 6-digit code shown in your Authenticator app for your NETSOL account.</p>
          @if (codeError()) {
            <div class="banner" role="alert"><mat-icon>error_outline</mat-icon><div><strong>That code didn’t work.</strong> Codes change every 30 seconds. Enter the latest one.</div></div>
          }
          <form [formGroup]="codeForm" (ngSubmit)="verifyCode()">
            <mat-form-field appearance="outline">
              <input matInput class="code" [formControl]="code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="••••••" />
              <mat-error>Enter the 6-digit code</mat-error>
            </mat-form-field>
            @if (!isReset) { <mat-checkbox color="primary" [formControl]="remember">Don’t ask again on this device for 30 days</mat-checkbox> }
            <button mat-flat-button color="primary" class="full" type="submit" [disabled]="busy()">
              @if (busy()) { <mat-spinner diameter="20" /> } @else { Verify }
            </button>
          </form>
          <a class="back" (click)="sendPush()"><mat-icon>phonelink_ring</mat-icon> Send a request to my app instead</a>
        }
        @case ('timeout') {
          <div class="timeout-icon"><mat-icon>timer_off</mat-icon></div>
          <h2>Request timed out</h2>
          <p class="sub">We didn’t get a response from your Authenticator app. Quick checks:</p>
          <ul class="checks">
            <li>Your phone is connected to the internet</li>
            <li>Notifications are on for Microsoft Authenticator</li>
            <li>You’re using the account for {{ username }}</li>
          </ul>
          <button mat-flat-button color="primary" class="full" type="button" (click)="sendPush()">Send another request</button>
          <button mat-stroked-button class="full" type="button" (click)="useCode()">Use a verification code</button>
        }
      }
      <a class="back" [routerLink]="isReset ? '/forgot-password' : '/login'"><mat-icon>arrow_back</mat-icon> {{ isReset ? 'Back' : 'Back to sign in' }}</a>
    </div>
  `,
  styles: [`
    .ms { display: flex; align-items: center; gap: 3px; margin-bottom: 18px; font-size: 12.5px; color: var(--text-2); font-weight: 600;
      .sq { width: 9px; height: 9px; display: inline-block; } .r { background: #f25022; } .g { background: #7fba00; } .b { background: #00a4ef; } .y { background: #ffb900; margin-right: 6px; } }
    .number { font-size: 56px; font-weight: 700; text-align: center; letter-spacing: .04em; color: var(--blue); background: var(--blue-50); border-radius: 14px; padding: 18px 0; margin-bottom: 18px; }
    .waiting { display: flex; justify-content: center; align-items: center; gap: 10px; color: var(--text-2); font-size: 13.5px; }
    .hint { color: var(--muted); font-size: 12.5px; text-align: center; margin: 16px 0; }
    .code { font-size: 22px; letter-spacing: .5em; text-align: center; }
    .timeout-icon { width: 52px; height: 52px; border-radius: 50%; background: var(--amber-50); color: var(--amber); display: grid; place-items: center; margin-bottom: 14px; }
    .checks { margin: -8px 0 16px; padding-left: 18px; color: var(--text-2); font-size: 13px; li { margin: 4px 0; } }
  `],
})
export class MfaComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);

  readonly isReset = this.router.url.startsWith('/forgot-password');
  readonly username = this.auth.pending?.username ?? '';
  readonly state = signal<MfaState>('push');
  readonly number = signal(0);
  readonly secondsLeft = signal(0);
  readonly busy = signal(false);
  readonly codeError = signal(false);
  readonly code = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{6}$/)] });
  readonly remember = new FormControl(false, { nonNullable: true });
  readonly codeForm = new FormGroup({ code: this.code, remember: this.remember });

  private timers: ReturnType<typeof setTimeout>[] = [];
  private ticker?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.sendPush();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  sendPush(): void {
    this.clearTimers();
    this.state.set('push');
    this.number.set(this.auth.sendPush());
    this.secondsLeft.set(Math.round(MOCK_CONFIG.mfaTimeoutMs / 1000));
    this.ticker = setInterval(() => this.secondsLeft.update(s => Math.max(0, s - 1)), 1000);
    this.timers.push(setTimeout(() => { this.clearTimers(); this.state.set('timeout'); }, MOCK_CONFIG.mfaTimeoutMs));
    if (MOCK_CONFIG.mfaAutoApproveMs > 0) {
      this.timers.push(setTimeout(() => this.done(), MOCK_CONFIG.mfaAutoApproveMs));
    }
  }

  useCode(): void {
    this.clearTimers();
    this.codeError.set(false);
    this.code.reset();
    this.state.set('code');
  }

  verifyCode(): void {
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.auth.verifyCode(this.code.value).subscribe({
      next: () => { this.busy.set(false); this.done(); },
      error: () => { this.busy.set(false); this.codeError.set(true); this.code.reset(); },
    });
  }

  private done(): void {
    this.clearTimers();
    const purpose = this.auth.completeMfa();
    if (purpose === 'signin') {
      this.router.navigate(['/dashboard']);
      this.feedback.toast('success', 'Signed in', 'Welcome back to the ESS Portal.');
    } else {
      this.router.navigate(['/forgot-password/new']);
    }
  }

  private clearTimers(): void {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    if (this.ticker) clearInterval(this.ticker);
  }
}
