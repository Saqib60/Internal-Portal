import { Injectable, computed, signal } from '@angular/core';
import { AppNotification } from './models';
import { seedNotifications } from './mock-data';
import { storage } from './storage';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly items = signal<AppNotification[]>(storage.get('ess.notifications', seedNotifications()));
  readonly all = this.items.asReadonly();
  readonly unread = computed(() => this.items().filter(n => !n.read));
  readonly unreadCount = computed(() => this.unread().length);

  push(n: Omit<AppNotification, 'id' | 'date' | 'read'>): void {
    const id = Math.max(0, ...this.items().map(i => i.id)) + 1;
    this.items.update(list => [{ ...n, id, date: new Date().toISOString(), read: false }, ...list]);
    this.persist();
  }

  markRead(id: number): void {
    this.items.update(list => list.map(n => (n.id === id ? { ...n, read: true } : n)));
    this.persist();
  }

  markAllRead(): void {
    this.items.update(list => list.map(n => ({ ...n, read: true })));
    this.persist();
  }

  clear(): void {
    this.items.set([]);
    this.persist();
  }

  private persist(): void {
    storage.set('ess.notifications', this.items());
  }
}
