import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Numbered form section: badge, title (with optional required star), description, content. */
@Component({
  selector: 'app-form-section',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="section" [class.locked]="locked">
      <div class="head">
        <span class="n">{{ n }}</span>
        <div class="titles">
          <h3>{{ title }} @if (required) {<span class="star">*</span>}</h3>
          <p>{{ locked ? lockedText : description }}</p>
        </div>
        @if (locked) { <mat-icon class="lock">lock</mat-icon> }
      </div>
      @if (!locked) { <div class="body"><ng-content /></div> }
    </section>
  `,
  styles: [`
    .section { padding: 20px 0; border-bottom: 1px solid var(--border); }
    :host:last-of-type .section { border-bottom: 0; }
    .head { display: flex; gap: 12px; align-items: flex-start; }
    .n { width: 26px; height: 26px; border-radius: 50%; background: var(--blue-50); color: var(--blue); font-size: 12px; font-weight: 700;
      display: grid; place-items: center; flex: none; margin-top: 1px; }
    .titles { flex: 1; h3 { font-size: 15.5px; font-weight: 600; } p { margin: 3px 0 0; color: var(--muted); font-size: 12.5px; } }
    .body { margin: 16px 0 0 38px; }
    .locked { opacity: .55; .n { background: #eef0f4; color: var(--muted); } }
    .lock { color: var(--muted); font-size: 18px; width: 18px; height: 18px; }
    @media (max-width: 700px) { .body { margin-left: 0; } }
  `],
})
export class FormSectionComponent {
  @Input() n: number | string = 1;
  @Input() title = '';
  @Input() description = '';
  @Input() required = false;
  @Input() locked = false;
  @Input() lockedText = 'Appears after you choose a treatment type';
}
