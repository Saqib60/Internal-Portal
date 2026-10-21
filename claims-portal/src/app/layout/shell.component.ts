import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AuthService } from '../core/auth.service';
import { LayoutService } from '../core/layout.service';
import { NotificationService } from '../core/notification.service';
import { RequestService } from '../core/request.service';
import { FeedbackService } from '../core/feedback.service';
import { MODULE_GROUPS, MODULES } from '../core/modules';
import { AppNotification } from '../core/models';
import { NotificationItemComponent } from './notification-item.component';

interface SearchHit { label: string; sub: string; icon: string; link: string; query?: Record<string, string>; }

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule, MatSidenavModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatBadgeModule, MatTooltipModule, MatAutocompleteModule, MatButtonToggleModule, NotificationItemComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly layout = inject(LayoutService);
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationService);
  private readonly requests = inject(RequestService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  readonly groups = MODULE_GROUPS.map(g => ({ name: g, items: MODULES.filter(m => m.group === g) }));
  readonly approvalsCount = computed(() => this.requests.awaitingApproval().length);
  readonly notifTab = signal<'all' | 'unread'>('all');
  readonly notifList = computed(() => (this.notifTab() === 'all' ? this.notifications.all() : this.notifications.unread()).slice(0, 5));

  readonly search = new FormControl('', { nonNullable: true });
  private readonly term = toSignal(this.search.valueChanges, { initialValue: '' });
  readonly hits = computed<SearchHit[]>(() => {
    const t = (typeof this.term() === 'string' ? this.term() : '').trim().toLowerCase();
    if (!t) return [];
    const forms = MODULES.filter(m => m.label.toLowerCase().includes(t) || m.description.toLowerCase().includes(t))
      .map(m => ({ label: m.label, sub: 'Form · ' + m.description, icon: m.icon, link: m.route }));
    const reqs = this.requests.mine().filter(r => r.id.toLowerCase().includes(t) || r.title.toLowerCase().includes(t)).slice(0, 5)
      .map(r => ({ label: r.id, sub: `Request · ${r.title} · ${r.status}`, icon: 'receipt_long', link: '/requests/' + r.id }));
    return [...forms, ...reqs].slice(0, 8);
  });

  @ViewChild(MatSidenavContent) private content?: MatSidenavContent;

  constructor() {
    // The sidenav content is the scroll container, so reset it on every navigation.
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.content?.scrollTo({ top: 0 }));
  }

  readonly blank = () => '';

  go(hit: SearchHit): void {
    this.search.setValue('');
    this.router.navigateByUrl(hit.link);
  }

  openNotification(n: AppNotification): void {
    this.notifications.markRead(n.id);
    if (n.requestId) this.router.navigate(['/requests', n.requestId]);
  }

  signOut(): void {
    this.feedback.popup({
      type: 'info', title: 'Sign out of the ESS Portal?', message: 'Your drafts are saved. You’ll need Microsoft Authenticator to sign in again.',
      primary: 'Sign out', secondary: 'Stay signed in', icon: 'logout',
    }).subscribe(ok => {
      if (!ok) return;
      this.auth.signOut();
      this.router.navigate(['/login']);
    });
  }

  helpdesk(): void {
    this.feedback.toast('info', 'HR helpdesk', 'Call ext. 2200 or email hr.helpdesk@netsoltech.com.');
  }
}
