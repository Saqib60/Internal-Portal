import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { CURRENT_EMPLOYEE, MOCK_CONFIG } from './mock-data';
import { Employee } from './models';
import { storage } from './storage';

export type SignInError = { kind: 'credentials'; attemptsLeft: number } | { kind: 'captcha' } | { kind: 'locked' };

interface PendingSignIn {
  username: string;
  remember: boolean;
  purpose: 'signin' | 'reset';
}

/**
 * Mock authentication. Username + password + captcha, then a Microsoft Authenticator
 * step (number matching, with a 6-digit code fallback). Swap the bodies of these
 * methods for calls to your identity provider (e.g. MSAL / Entra ID) later.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<Employee | null>(
    storage.get<Employee | null>('ess.session', null, 'local') ?? storage.get<Employee | null>('ess.session', null, 'session'),
  );
  readonly user = this.session.asReadonly();
  readonly isSignedIn = computed(() => !!this.session());

  private attempts = 0;
  pending: PendingSignIn | null = storage.get<PendingSignIn | null>('ess.pending', null, 'session');

  signIn(username: string, password: string, captchaOk: boolean, remember: boolean): Observable<void> {
    if (!captchaOk) return throwError(() => ({ kind: 'captcha' } as SignInError)).pipe(delay(MOCK_CONFIG.latencyMs));
    if (this.attempts >= MOCK_CONFIG.maxAttempts) return throwError(() => ({ kind: 'locked' } as SignInError));
    const ok = username.trim().toLowerCase() === MOCK_CONFIG.username && password === MOCK_CONFIG.password;
    if (!ok) {
      this.attempts++;
      const left = MOCK_CONFIG.maxAttempts - this.attempts;
      return throwError(() => (left <= 0 ? { kind: 'locked' } : { kind: 'credentials', attemptsLeft: left }) as SignInError).pipe(delay(MOCK_CONFIG.latencyMs));
    }
    this.attempts = 0;
    this.setPending({ username, remember, purpose: 'signin' });
    return of(void 0).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  /** Forgot password: identify the account before the Authenticator check. */
  startReset(usernameOrEmail: string, captchaOk: boolean): Observable<void> {
    if (!captchaOk) return throwError(() => ({ kind: 'captcha' } as SignInError)).pipe(delay(MOCK_CONFIG.latencyMs));
    this.setPending({ username: usernameOrEmail, remember: false, purpose: 'reset' });
    return of(void 0).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  /** Creates a number-matching push request. Returns the number to show the user. */
  sendPush(): number {
    return 10 + Math.floor(Math.random() * 89);
  }

  verifyCode(code: string): Observable<void> {
    if (!/^\d{6}$/.test(code) || code === MOCK_CONFIG.mfaInvalidCode) {
      return throwError(() => new Error('invalid')).pipe(delay(MOCK_CONFIG.latencyMs));
    }
    return of(void 0).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  /** Called after the Authenticator step succeeds. */
  completeMfa(): 'signin' | 'reset' {
    const purpose = this.pending?.purpose ?? 'signin';
    if (purpose === 'signin') {
      const remember = this.pending?.remember ?? false;
      this.session.set(CURRENT_EMPLOYEE);
      storage.set('ess.session', CURRENT_EMPLOYEE, remember ? 'local' : 'session');
      this.setPending(null);
    } else {
      this.setPending({ ...this.pending!, purpose: 'reset' });
      storage.set('ess.resetVerified', true, 'session');
    }
    return purpose;
  }

  resetVerified(): boolean {
    return storage.get('ess.resetVerified', false, 'session');
  }

  setNewPassword(_password: string): Observable<void> {
    storage.remove('ess.resetVerified');
    this.setPending(null);
    return of(void 0).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  signOut(): void {
    this.session.set(null);
    storage.remove('ess.session');
  }

  private setPending(p: PendingSignIn | null): void {
    this.pending = p;
    if (p) storage.set('ess.pending', p, 'session');
    else storage.remove('ess.pending');
  }
}
