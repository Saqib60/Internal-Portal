import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppNotification } from '../core/models';
import { RelativeTimePipe } from '../shared/pipes';

const ICON: Record<AppNotification['type'], string> = {
  approved: 'check_circle', action: 'pending_actions', info: 'info', rejected: 'cancel', disbursed: 'payments',
};

@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [MatIconModule, RelativeTimePipe],
  template: `
    <div class="item" [class.unread]="!n.read">
      <span class="ic" [class]="n.type"><mat-icon>{{ icon[n.type] }}</mat-icon></span>
      <div class="text">
        <strong>{{ n.title }}</strong>
        <span>{{ n.body }}</span>
        <small>{{ n.date | relTime }}</small>
      </div>
      @if (!n.read) { <i class="dot"></i> }
    </div>
  `,
  styles: [`
    .item { display: flex; gap: 12px; padding: 12px 16px; cursor: pointer; align-items: flex-start; border-radius: 10px; }
    .item:hover { background: #f6f8fc; }
    .unread { background: #f3f7ff; }
    .ic { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; flex: none;
      mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    .approved { background: var(--green-50); color: var(--green); }
    .action { background: var(--amber-50); color: var(--amber); }
    .info { background: var(--blue-50); color: var(--blue); }
    .rejected { background: var(--red-50); color: var(--red); }
    .disbursed { background: var(--purple-50); color: var(--purple); }
    .text { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 13px; min-width: 0;
      strong { font-weight: 600; } span { color: var(--text-2); line-height: 1.4; } small { color: var(--muted); font-size: 11.5px; margin-top: 2px; } }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); margin-top: 6px; flex: none; }
  `],
})
export class NotificationItemComponent {
  @Input({ required: true }) n!: AppNotification;
  readonly icon = ICON;
}
