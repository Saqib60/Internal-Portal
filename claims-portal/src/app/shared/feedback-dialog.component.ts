import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FeedbackType } from '../core/models';

export interface FeedbackDialogData {
  type: FeedbackType;
  title: string;
  message: string;
  primary: string;
  secondary?: string;
  icon?: string;
}

const ICONS: Record<FeedbackType, string> = {
  success: 'check', error: 'priority_high', warning: 'warning_amber', info: 'info', danger: 'delete_outline',
};

/** Success / error / warning / info / delete-confirm popup. Resolves true when the primary button is pressed. */
@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="popup" [class]="data.type">
      <button mat-icon-button class="close" (click)="ref.close(false)" aria-label="Close"><mat-icon>close</mat-icon></button>
      <div class="glow"><div class="icon"><mat-icon>{{ data.icon || icons[data.type] }}</mat-icon></div></div>
      <h2>{{ data.title }}</h2>
      <p>{{ data.message }}</p>
      <div class="buttons" [class.single]="!data.secondary">
        @if (data.secondary) {
          <button mat-stroked-button (click)="ref.close(false)">{{ data.secondary }}</button>
        }
        <button mat-flat-button color="primary" class="primary" (click)="ref.close(true)" cdkFocusInitial>{{ data.primary }}</button>
      </div>
    </div>
  `,
  styles: [`
    .popup { position: relative; width: 420px; max-width: 100%; padding: 32px 28px 24px; text-align: center; box-sizing: border-box;
      background: linear-gradient(180deg, var(--tint) 0%, #fff 120px); }
    .close { position: absolute; top: 8px; right: 8px; color: var(--muted); }
    .glow { width: 80px; height: 80px; margin: 0 auto 16px; border-radius: 50%; display: grid; place-items: center;
      background: radial-gradient(circle, var(--soft) 0%, transparent 70%); }
    .icon { width: 56px; height: 56px; border-radius: 50%; background: var(--c); color: #fff; display: grid; place-items: center;
      box-shadow: 0 0 0 8px var(--soft), 0 8px 24px var(--soft);
      mat-icon { font-size: 28px; width: 28px; height: 28px; } }
    h2 { font-size: 19px; font-weight: 700; margin: 0 0 8px; }
    p { color: var(--text-2); margin: 0 0 24px; line-height: 1.55; font-size: 13.5px; }
    .buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; button { height: 42px; } }
    .buttons.single { grid-template-columns: 1fr; }
    .primary.mat-mdc-unelevated-button { --mdc-filled-button-container-color: var(--c); }
    .success { --c: #16a34a; --soft: rgba(22,163,74,.18); --tint: #ecfaf1; }
    .error   { --c: #dc2626; --soft: rgba(220,38,38,.16); --tint: #fdf0f0; }
    .danger  { --c: #dc2626; --soft: rgba(220,38,38,.16); --tint: #fdf0f0; }
    .warning { --c: #d97706; --soft: rgba(217,119,6,.18); --tint: #fff6e8; }
    .info    { --c: #1f4fd8; --soft: rgba(31,79,216,.16); --tint: #eef3fe; }
  `],
})
export class FeedbackDialogComponent {
  readonly data = inject<FeedbackDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<FeedbackDialogComponent, boolean>);
  readonly icons = ICONS;
}
