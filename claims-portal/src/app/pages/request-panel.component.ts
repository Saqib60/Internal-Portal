import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ClaimRequest } from '../core/models';
import { FileSizePipe, PkrPipe } from '../shared/pipes';
import { StatusChipComponent } from '../shared/status-chip.component';
import { RequestActions } from './request-actions';

/** Right-hand detail panel on My Requests. */
@Component({
  selector: 'app-request-panel',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, PkrPipe, FileSizePipe, StatusChipComponent],
  template: `
    <div class="card panel">
      <div class="top">
        <a class="id" [routerLink]="['/requests', r.id]">{{ r.id }}</a>
        <app-status-chip [status]="r.status" />
        <span class="spacer"></span>
        <button class="close" (click)="closed.emit()" aria-label="Close panel"><mat-icon>close</mat-icon></button>
      </div>
      <h3>{{ r.title }}</h3>
      @if (r.amount !== null) { <div class="amount">{{ r.amount | pkr: true }}</div> }
      <div class="facts">
        <div class="kv"><span>Submitted</span><span>{{ r.submittedOn ? (r.submittedOn | date: 'dd MMM y, h:mm a') : 'Not yet' }}</span></div>
        @for (d of r.details.slice(0, 3); track d.label) { <div class="kv"><span>{{ d.label }}</span><span>{{ d.value }}</span></div> }
        @if (current(); as c) { <div class="kv"><span>Currently with</span><span>{{ c.employeeStep ? 'You' : c.assignee + ' (' + c.role + ')' }}</span></div> }
      </div>

      <div class="sec">Progress</div>
      <div class="timeline">
        <div class="t done"><span class="dot"><mat-icon>check</mat-icon></span><div><strong>Submitted</strong><small>{{ r.employee.name }} · {{ r.submittedOn ? (r.submittedOn | date: 'dd MMM, h:mm a') : 'Draft' }}</small></div></div>
        @for (s of r.steps; track s.role) {
          <div class="t" [class]="s.status">
            <span class="dot">
              @switch (s.status) {
                @case ('done') { <mat-icon>check</mat-icon> }
                @case ('current') { <mat-icon>schedule</mat-icon> }
                @case ('rejected') { <mat-icon>close</mat-icon> }
                @case ('returned') { <mat-icon>undo</mat-icon> }
              }
            </span>
            <div>
              <strong>{{ s.role }}</strong>
              <small>
                @switch (s.status) {
                  @case ('done') { {{ s.employeeStep ? 'You' : s.assignee }} · {{ s.date | date: 'dd MMM' }} }
                  @case ('current') { {{ s.employeeStep ? 'Waiting on you' : s.assignee + ' · in progress' }} }
                  @case ('rejected') { Rejected by {{ s.assignee }} }
                  @case ('returned') { Sent back by {{ s.assignee }} }
                  @default { {{ s.note }} }
                }
              </small>
            </div>
          </div>
        }
      </div>

      @if (r.attachments.length) {
        <div class="sec">Attachments</div>
        @for (a of r.attachments; track a.name) {
          <div class="file"><mat-icon fontSet="material-icons-outlined">description</mat-icon><span>{{ a.name }}</span><small>{{ a.size | fileSize }}</small></div>
        }
      }

      <div class="actions">
        @switch (r.status) {
          @case ('Draft') {
            <button mat-stroked-button class="text-danger" (click)="actions.deleteDraft(r, closedFn)">Delete draft</button>
            <button mat-flat-button color="primary" (click)="actions.continueDraft(r)">Continue draft</button>
          }
          @case ('Action needed') {
            <button mat-flat-button color="primary" class="wide" (click)="actions.uploadPhysicianForm(r)">Upload physician form</button>
          }
          @case ('Sent back') {
            <a mat-stroked-button [routerLink]="['/requests', r.id]">View remarks</a>
            <button mat-flat-button color="primary" (click)="actions.resubmit(r)">Resubmit</button>
          }
          @case ('Pending') {
            <button mat-stroked-button (click)="actions.withdraw(r)">Withdraw</button>
            <button mat-flat-button color="primary" (click)="actions.messageHr(r)">Message HR</button>
          }
          @case ('In Review') {
            <button mat-stroked-button (click)="actions.withdraw(r)">Withdraw</button>
            <button mat-flat-button color="primary" (click)="actions.messageHr(r)">Message HR</button>
          }
          @default {
            <a mat-flat-button color="primary" class="wide" [routerLink]="['/requests', r.id]">View full details</a>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .panel { position: sticky; top: 88px; }
    .top { display: flex; align-items: center; gap: 8px; .id { font-weight: 600; font-size: 13px; } }
    .close { width: 24px; height: 24px; border-radius: 6px; border: 0; background: #f1f3f7; color: var(--text-2); display: grid; place-items: center; cursor: pointer; padding: 0;
      mat-icon { font-size: 16px; width: 16px; height: 16px; } &:hover { background: #e5e8ef; } }
    h3 { font-size: 17px; font-weight: 600; margin-top: 14px; }
    .amount { font-size: 24px; font-weight: 700; margin-top: 2px; }
    .facts { background: #f8fafc; border-radius: 10px; padding: 8px 12px; margin: 14px 0 6px; }
    .sec { font-weight: 600; font-size: 14px; margin: 18px 0 10px; }
    .timeline { display: flex; flex-direction: column; }
    .t { display: flex; gap: 10px; position: relative; padding-bottom: 14px;
      strong { display: block; font-size: 13px; } small { color: var(--muted); font-size: 11.5px; } }
    .t:not(:last-child)::after { content: ''; position: absolute; left: 11px; top: 26px; bottom: 2px; width: 2px; background: var(--border); }
    .t.done:not(:last-child)::after { background: #86d7a5; }
    .dot { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; background: #eef0f4; color: var(--muted);
      mat-icon { font-size: 15px; width: 15px; height: 15px; } }
    .done .dot { background: var(--green-50); color: var(--green); }
    .current .dot { background: #fff; border: 2px solid var(--blue); color: var(--blue); box-sizing: border-box; }
    .pending { opacity: .65; }
    .rejected .dot { background: var(--red-50); color: var(--red); }
    .returned .dot { background: var(--amber-50); color: var(--amber); }
    .file { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 13px;
      mat-icon { color: var(--blue); font-size: 20px; width: 20px; height: 20px; } span { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } small { color: var(--muted); } }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border); .wide { grid-column: span 2; } }
  `],
})
export class RequestPanelComponent {
  @Input({ required: true }) r!: ClaimRequest;
  @Output() closed = new EventEmitter<void>();
  readonly actions = inject(RequestActions);
  readonly closedFn = () => this.closed.emit();

  current() {
    return this.r.steps.find(s => s.status === 'current');
  }
}
