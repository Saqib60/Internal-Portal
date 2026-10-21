import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClaimRequest } from '../core/models';

/** Read-only horizontal approval progress (custom, as mapped in the component map). */
@Component({
  selector: 'app-progress-tracker',
  standalone: true,
  imports: [MatIconModule, DatePipe],
  template: `
    <div class="track">
      <div class="node done">
        <span class="dot"><mat-icon>check</mat-icon></span>
        <div><strong>Submitted</strong><small>{{ request.submittedOn | date: 'dd MMM y' }}</small></div>
      </div>
      @for (s of request.steps; track s.role) {
        <div class="line" [class.done]="s.status === 'done'"></div>
        <div class="node" [class]="s.status">
          <span class="dot">
            @switch (s.status) {
              @case ('done') { <mat-icon>check</mat-icon> }
              @case ('current') { <mat-icon>schedule</mat-icon> }
              @case ('rejected') { <mat-icon>close</mat-icon> }
              @case ('returned') { <mat-icon>undo</mat-icon> }
              @default { <i></i> }
            }
          </span>
          <div>
            <strong>{{ s.role }}</strong>
            <small>
              @switch (s.status) {
                @case ('done') { {{ s.date | date: 'dd MMM y' }} }
                @case ('current') { {{ s.employeeStep ? 'Action needed' : 'In progress' }} }
                @case ('rejected') { Rejected }
                @case ('returned') { Sent back }
                @default { Pending }
              }
            </small>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .track { display: flex; align-items: center; gap: 10px; overflow-x: auto; padding-bottom: 2px; }
    .node { display: flex; align-items: center; gap: 8px; flex: none;
      strong { display: block; font-size: 12.5px; } small { color: var(--muted); font-size: 11.5px; } }
    .dot { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: #eef0f4; color: var(--muted);
      mat-icon { font-size: 16px; width: 16px; height: 16px; } i { width: 8px; height: 8px; border-radius: 50%; background: #c7ccd6; } }
    .done .dot { background: var(--green-50); color: var(--green); }
    .current .dot { background: #fff; color: var(--blue); border: 2px solid var(--blue); }
    .current small { color: var(--blue); }
    .rejected .dot { background: var(--red-50); color: var(--red); } .rejected small { color: var(--red); }
    .returned .dot { background: var(--amber-50); color: var(--amber); } .returned small { color: var(--amber); }
    .line { flex: 1; min-width: 24px; height: 2px; background: var(--border); } .line.done { background: #86d7a5; }
  `],
})
export class ProgressTrackerComponent {
  @Input({ required: true }) request!: ClaimRequest;
}
