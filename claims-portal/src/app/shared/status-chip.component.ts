import { Component, Input } from '@angular/core';
import { RequestStatus } from '../core/models';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  template: `<span class="chip" [class]="cls"><i></i>{{ status }}</span>`,
  styles: [`
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; }
    i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .review { background: #e6eefd; color: #1f4fd8; }
    .pending { background: var(--amber-50); color: var(--amber); }
    .approved { background: var(--green-50); color: var(--green); }
    .disbursed { background: var(--purple-50); color: var(--purple); }
    .rejected { background: var(--red-50); color: var(--red); }
    .draft { background: #eef0f4; color: #4b5563; }
    .action { background: #fff1e6; color: #c2410c; }
  `],
})
export class StatusChipComponent {
  @Input({ required: true }) status!: RequestStatus;
  get cls(): string {
    switch (this.status) {
      case 'In Review': return 'review';
      case 'Pending': return 'pending';
      case 'Approved': return 'approved';
      case 'Disbursed': return 'disbursed';
      case 'Rejected': return 'rejected';
      case 'Action needed':
      case 'Sent back': return 'action';
      default: return 'draft';
    }
  }
}
