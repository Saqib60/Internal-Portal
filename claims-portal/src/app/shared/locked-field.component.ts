import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Read-only value pulled from HR records, styled like a locked input. */
@Component({
  selector: 'app-locked-field',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="field">
      <label>{{ label }}</label>
      <div class="box"><span>{{ value }}</span><mat-icon>lock</mat-icon></div>
      @if (hint) { <small>{{ hint }}</small> }
    </div>
  `,
  styles: [`
    .field { margin-bottom: 16px; }
    .box { display: flex; align-items: center; justify-content: space-between; height: 40px; padding: 0 12px; border-radius: 8px;
      background: var(--field-locked); color: var(--text-2); font-size: 14px; box-sizing: border-box; }
    span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--muted); flex: none; }
    small { display: block; margin-top: 4px; color: var(--muted); font-size: 11.5px; }
  `],
})
export class LockedFieldComponent {
  @Input() label = '';
  @Input() value: string | number | null = '';
  @Input() hint = '';
}
