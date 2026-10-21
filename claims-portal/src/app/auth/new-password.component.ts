import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../core/auth.service';
import { FeedbackService } from '../core/feedback.service';

const RULES = [
  { label: 'At least 12 characters', test: (v: string) => v.length >= 12 },
  { label: 'An uppercase and a lowercase letter', test: (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v) },
  { label: 'At least one number', test: (v: string) => /\d/.test(v) },
  { label: 'At least one symbol (e.g. ! @ # $)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function strong(c: AbstractControl): ValidationErrors | null {
  return RULES.every(r => r.test(c.value ?? '')) ? null : { weak: true };
}

@Component({
  selector: 'app-new-password',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  styleUrl: './auth-card.scss',
  template: `
    <div class="card">
      <div class="steps">Step 3 of 3 · New password</div>
      <h2>Create a new password</h2>
      <p class="sub">Choose a password you haven’t used before on your NETSOL account.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label>New password <span class="star">*</span></label>
          <mat-form-field appearance="outline">
            <mat-icon matIconPrefix>lock_outline</mat-icon>
            <input matInput [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" />
            <button mat-icon-button matIconSuffix type="button" (click)="show.set(!show())" aria-label="Show password"><mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon></button>
            <mat-error>Your password doesn’t meet all the requirements yet</mat-error>
          </mat-form-field>
        </div>
        <div class="meter"><span [style.width.%]="score() * 25" [class]="'s' + score()"></span></div>
        <div class="meter-label">Strength: <strong>{{ labels[score()] }}</strong></div>
        <ul class="rules">
          @for (r of rules(); track r.label) {
            <li [class.ok]="r.ok"><mat-icon>{{ r.ok ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>{{ r.label }}</li>
          }
        </ul>
        <div class="field">
          <label>Confirm new password <span class="star">*</span></label>
          <mat-form-field appearance="outline">
            <mat-icon matIconPrefix>lock_outline</mat-icon>
            <input matInput [type]="show() ? 'text' : 'password'" formControlName="confirm" autocomplete="new-password" />
            <mat-error>Passwords don’t match</mat-error>
          </mat-form-field>
        </div>
        <button mat-flat-button color="primary" class="full" type="submit" [disabled]="busy()">
          @if (busy()) { <mat-spinner diameter="20" /> } @else { Reset password }
        </button>
      </form>
    </div>
  `,
  styles: [`
    .meter { height: 6px; background: #eef0f4; border-radius: 3px; overflow: hidden; margin-top: -4px;
      span { display: block; height: 100%; transition: width .2s; } .s1 { background: #dc2626; } .s2 { background: #f59e0b; } .s3 { background: #3b82f6; } .s4 { background: #16a34a; } }
    .meter-label { font-size: 12px; color: var(--muted); margin: 6px 0 10px; }
    .rules { list-style: none; padding: 0; margin: 0 0 16px; font-size: 12.5px; color: var(--muted);
      li { display: flex; align-items: center; gap: 6px; margin: 4px 0; } mat-icon { font-size: 16px; width: 16px; height: 16px; }
      li.ok { color: var(--green); } }
  `],
})
export class NewPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  readonly show = signal(false);
  readonly busy = signal(false);
  readonly labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, strong]],
    confirm: ['', [Validators.required, (c: AbstractControl) => (c.parent && c.value !== c.parent.get('password')?.value ? { mismatch: true } : null)]],
  });
  private readonly pw = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly rules = computed(() => RULES.map(r => ({ label: r.label, ok: r.test(this.pw()) })));
  readonly score = computed(() => this.rules().filter(r => r.ok).length);

  submit(): void {
    this.form.controls.confirm.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.auth.setNewPassword(this.form.getRawValue().password).subscribe(() => {
      this.busy.set(false);
      this.feedback.popup({
        type: 'success', title: 'Password updated. You’re good to go!',
        message: 'Your new password is active. Use it the next time you sign in to the ESS Portal.',
        primary: 'Back to sign in',
      }).subscribe(() => this.router.navigate(['/login']));
    });
  }
}
