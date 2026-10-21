import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '../core/notification.service';
import { FeedbackService } from '../core/feedback.service';
import { AppNotification } from '../core/models';
import { NotificationItemComponent } from '../layout/notification-item.component';
import { storage } from '../core/storage';

const PAGE = 6;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatButtonToggleModule, MatSlideToggleModule, NotificationItemComponent],
  template: `
    <div class="page">
      <div class="breadcrumb"><a routerLink="/dashboard">Home</a> / Notifications</div>
      <div class="page-header">
        <div><h1>Notifications</h1><p>Updates on your requests and approvals.</p></div>
        <div class="actions"><button mat-stroked-button [disabled]="!svc.unreadCount()" (click)="svc.markAllRead()"><mat-icon>done_all</mat-icon>Mark all as read</button></div>
      </div>
      <div class="form-layout">
        <div class="card list">
          <mat-button-toggle-group class="tabs" [value]="tab()" (change)="tab.set($event.value); limit.set(page)" hideSingleSelectionIndicator>
            <mat-button-toggle value="all">All ({{ svc.all().length }})</mat-button-toggle>
            <mat-button-toggle value="unread">Unread ({{ svc.unreadCount() }})</mat-button-toggle>
          </mat-button-toggle-group>
          @for (g of groups(); track g.name) {
            <div class="group">{{ g.name }}</div>
            @for (n of g.items; track n.id) { <app-notification-item [n]="n" (click)="open(n)" /> }
          } @empty {
            <div class="empty">
              @if (tab() === 'unread' && svc.all().length) {
                <mat-icon>mark_email_read</mat-icon><strong>You’re all caught up</strong><span>No unread notifications. New updates on your requests will show up here.</span>
              } @else {
                <mat-icon fontSet="material-icons-outlined">notifications_none</mat-icon><strong>No notifications yet</strong><span>When you submit a request, you’ll be notified at every approval step.</span>
              }
            </div>
          }
          @if (source().length > limit()) {
            <button mat-stroked-button class="more" (click)="limit.set(limit() + page)">Show more</button>
          } @else if (source().length > page) {
            <p class="end">No older notifications</p>
          }
        </div>
        <div class="side">
          <div class="card prefs">
            <div class="card-title">Notification preferences</div>
            @for (p of prefList; track p.key) {
              <mat-slide-toggle color="primary" hideIcon [checked]="prefs()[p.key]" (change)="setPref(p.key, $event.checked)">{{ p.label }}</mat-slide-toggle>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .list { padding: 16px 10px; }
    .tabs { margin: 0 6px 8px; }
    .group { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 600; padding: 14px 16px 6px; }
    .empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 48px 24px; color: var(--muted);
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #b0b8c9; } strong { color: var(--text); font-size: 15px; } }
    .more { display: block; margin: 12px auto 4px; }
    .end { text-align: center; color: var(--muted); font-size: 12.5px; margin: 14px 0 4px; }
    .prefs { display: flex; flex-direction: column; gap: 12px; }
  `],
})
export class NotificationsComponent {
  readonly svc = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  readonly page = PAGE;
  readonly tab = signal<'all' | 'unread'>('all');
  readonly limit = signal(PAGE);
  readonly source = computed(() => (this.tab() === 'all' ? this.svc.all() : this.svc.unread()));

  readonly prefList = [
    { key: 'email', label: 'Email me when a request moves' },
    { key: 'approvals', label: 'Approval decisions' },
    { key: 'payments', label: 'Payments and disbursements' },
    { key: 'reminders', label: 'Draft and deadline reminders' },
  ];
  readonly prefs = signal<Record<string, boolean>>(storage.get('ess.notifPrefs', { email: true, approvals: true, payments: true, reminders: false }));

  readonly groups = computed(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const buckets: { name: string; items: AppNotification[] }[] = [
      { name: 'Today', items: [] }, { name: 'Yesterday', items: [] }, { name: 'Earlier this week', items: [] }, { name: 'Earlier', items: [] },
    ];
    for (const n of this.source().slice(0, this.limit())) {
      const t = new Date(n.date).getTime();
      const i = t >= startToday ? 0 : t >= startToday - 86400000 ? 1 : t >= startToday - 6 * 86400000 ? 2 : 3;
      buckets[i].items.push(n);
    }
    return buckets.filter(b => b.items.length);
  });

  open(n: AppNotification): void {
    this.svc.markRead(n.id);
    if (n.requestId) this.router.navigate(['/requests', n.requestId]);
  }

  setPref(key: string, v: boolean): void {
    this.prefs.update(p => ({ ...p, [key]: v }));
    storage.set('ess.notifPrefs', this.prefs());
    this.feedback.toast('success', 'Preferences saved');
  }
}
