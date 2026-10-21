import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { FeedbackType } from '../core/models';

export interface ToastData {
  type: Exclude<FeedbackType, 'danger'>;
  title: string;
  message?: string;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="toast" [class]="data.type" role="status">
      <div class="icon"><mat-icon>{{ icons[data.type] }}</mat-icon></div>
      <div class="text">
        <strong>{{ data.title }}</strong>
        @if (data.message) { <span>{{ data.message }}</span> }
      </div>
      <button class="x" (click)="ref.dismiss()" aria-label="Dismiss"><mat-icon>close</mat-icon></button>
    </div>
  `,
  styles: [`
    .toast { display: flex; gap: 12px; align-items: flex-start; width: 360px; max-width: calc(100vw - 32px); box-sizing: border-box;
      background: #fff; color: var(--text); border: 1px solid var(--border); border-left: 4px solid var(--c);
      border-radius: 12px; padding: 12px 12px 12px 14px; box-shadow: 0 12px 32px rgba(15,27,61,.14); }
    .icon { width: 28px; height: 28px; border-radius: 50%; background: var(--soft); color: var(--c); display: grid; place-items: center; flex: none;
      mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    .text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 13px; padding-top: 4px;
      strong { font-weight: 600; } span { color: var(--text-2); line-height: 1.4; } }
    .x { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 2px; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    .success { --c: #16a34a; --soft: #e8f7ee; }
    .error { --c: #dc2626; --soft: #fdecec; }
    .warning { --c: #d97706; --soft: #fef4e2; }
    .info { --c: #1f4fd8; --soft: #eef3fe; }
  `],
})
export class ToastComponent {
  readonly data = inject<ToastData>(MAT_SNACK_BAR_DATA);
  readonly ref = inject(MatSnackBarRef<ToastComponent>);
  readonly icons = { success: 'check_circle', error: 'error_outline', warning: 'warning_amber', info: 'info' };
}
