import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { WorkflowStep } from '../core/models';

/** "Approval workflow" side card shown next to every form. */
@Component({
  selector: 'app-workflow-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="card">
      <div class="card-title">Approval workflow</div>
      <p class="muted small intro">Your request moves through these steps. You’ll be notified at each one.</p>
      <div class="step">
        <span class="dot done"><mat-icon>check</mat-icon></span>
        <div><strong>{{ firstLabel }}</strong><small>{{ firstNote }}</small></div>
      </div>
      @for (s of steps; track s.role; let i = $index) {
        <div class="step">
          <span class="dot">{{ i + 1 }}</span>
          <div><strong>{{ s.role }}</strong><small>{{ s.note }}</small></div>
        </div>
      }
      @for (s of optional; track s.role) {
        <div class="step optional">
          <span class="dot">•</span>
          <div><strong>{{ s.role }}</strong><small>{{ s.note }}</small></div>
        </div>
      }
    </div>
    <div class="card help">
      <div class="row"><mat-icon>help_outline</mat-icon><strong>Need help?</strong></div>
      <p class="muted small">Read the policy or contact the HR helpdesk at ext. 2200.</p>
      <a class="small">View policy document →</a>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .intro { margin: -6px 0 12px; }
    .step { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0;
      strong { display: block; font-size: 13px; } small { color: var(--muted); font-size: 11.5px; } }
    .dot { width: 24px; height: 24px; border-radius: 50%; background: #eef0f4; color: var(--text-2); font-size: 11px; font-weight: 700; display: grid; place-items: center; flex: none; }
    .dot.done { background: var(--green-50); color: var(--green); mat-icon { font-size: 15px; width: 15px; height: 15px; } }
    .optional { opacity: .8; }
    .help { background: #f8fafc; .row { display: flex; gap: 6px; align-items: center; mat-icon { color: var(--blue); font-size: 18px; width: 18px; height: 18px; } }
      p { margin: 6px 0; } }
  `],
})
export class WorkflowCardComponent {
  @Input() steps: WorkflowStep[] = [];
  @Input() optional: WorkflowStep[] = [];
  @Input() firstLabel = 'Submitted by you';
  @Input() firstNote = 'Start';
}
