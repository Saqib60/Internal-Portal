import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RequestService } from '../core/request.service';
import { moduleDef } from '../core/modules';
import { PkrPipe } from '../shared/pipes';
import { StatusChipComponent } from '../shared/status-chip.component';
import { ProgressTrackerComponent } from '../shared/progress-tracker.component';
import { RequestBodyComponent } from './request-body.component';
import { RequestActions } from './request-actions';

/** Full request page (also the "Submitted" / "Completed" screen of every module flow). */
@Component({
  selector: 'app-request-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, PkrPipe, StatusChipComponent, ProgressTrackerComponent, RequestBodyComponent],
  template: `
    @if (request(); as r) {
      <div class="page">
        <div class="breadcrumb"><a routerLink="/dashboard">Home</a> / <a routerLink="/requests">My Requests</a> / {{ r.id }}</div>
        <div class="page-header">
          <div>
            <h1>{{ r.title }}</h1>
            <p>{{ type() }} · {{ r.id }} @if (r.submittedOn) { · submitted {{ r.submittedOn | date: 'dd MMM y, h:mm a' }} }</p>
          </div>
          <div class="actions"><app-status-chip [status]="r.status" /></div>
        </div>

        @switch (r.status) {
          @case ('Approved') { <div class="banner ok"><mat-icon>verified</mat-icon><div><strong>All approvals are complete.</strong> Payment or fulfilment follows the normal {{ r.amount ? 'payroll' : 'admin' }} cycle.</div></div> }
          @case ('Disbursed') { <div class="banner ok"><mat-icon>payments</mat-icon><div><strong>Paid.</strong> {{ r.amount | pkr: true }} has been disbursed.</div></div> }
          @case ('Rejected') { <div class="banner bad"><mat-icon>cancel</mat-icon><div><strong>This request was rejected.</strong> See the remarks in the history below.</div></div> }
          @case ('Sent back') { <div class="banner warn"><mat-icon>undo</mat-icon><div><strong>Sent back for changes.</strong> Read the remarks below, then resubmit.</div><button mat-flat-button color="primary" (click)="actions.resubmit(r)">Resubmit</button></div> }
          @case ('Action needed') { <div class="banner warn"><mat-icon>pending_actions</mat-icon><div><strong>Action needed.</strong> Upload the signed attending physician form to send this claim to Accounts.</div><button mat-flat-button color="primary" (click)="actions.uploadPhysicianForm(r)">Upload physician form</button></div> }
          @case ('Draft') { <div class="banner"><mat-icon>edit_note</mat-icon><div><strong>This is a draft.</strong> It hasn’t been sent to anyone yet.</div><button mat-flat-button color="primary" (click)="actions.continueDraft(r)">Continue draft</button></div> }
          @case ('Withdrawn') { <div class="banner"><mat-icon>block</mat-icon><div><strong>You withdrew this request.</strong></div></div> }
        }

        <div class="card track"><div class="card-title">Approval progress</div><app-progress-tracker [request]="r" /></div>

        <div class="form-layout">
          <app-request-body [r]="r" />
          <div class="side">
            <div class="card">
              <div class="card-title">Summary</div>
              @if (r.amount !== null) { <div class="kv"><span>Amount</span><span>{{ r.amount | pkr: true }}</span></div> }
              <div class="kv"><span>Type</span><span>{{ type() }}</span></div>
              <div class="kv"><span>Status</span><span>{{ r.status }}</span></div>
              @if (current(); as c) { <div class="kv"><span>Currently with</span><span>{{ c.employeeStep ? 'You' : c.assignee }}</span></div> }
              <div class="kv"><span>Steps</span><span>{{ doneCount() }} of {{ r.steps.length }} done</span></div>
            </div>
            @if (r.status === 'Pending' || r.status === 'In Review') {
              <div class="card btns">
                <button mat-flat-button color="primary" (click)="actions.messageHr(r)">Message HR</button>
                <button mat-stroked-button (click)="actions.withdraw(r)">Withdraw request</button>
              </div>
            }
            <a mat-stroked-button routerLink="/requests">Back to My Requests</a>
          </div>
        </div>
      </div>
    } @else {
      <div class="page"><div class="card notfound"><mat-icon>search_off</mat-icon><h2>We couldn’t find that request</h2><p class="muted">It may have been deleted, or the link is wrong.</p><a mat-flat-button color="primary" routerLink="/requests">Go to My Requests</a></div></div>
    }
  `,
  styles: [`
    .banner { display: flex; gap: 12px; align-items: center; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; background: var(--blue-50); color: #1b3a8f; border: 1px solid var(--blue-100); font-size: 13.5px;
      div { flex: 1; } }
    .banner.ok { background: var(--green-50); color: #14532d; border-color: #bfe8cf; }
    .banner.bad { background: var(--red-50); color: #7f1d1d; border-color: #f5c9c9; }
    .banner.warn { background: var(--amber-50); color: #7c3d06; border-color: #f7d9a8; }
    .track { margin-bottom: 20px; }
    .btns { display: flex; flex-direction: column; gap: 10px; }
    .notfound { text-align: center; padding: 48px; mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--muted); } p { margin: 8px 0 20px; } }
  `],
})
export class RequestDetailComponent {
  readonly id = input.required<string>();
  private readonly requests = inject(RequestService);
  readonly actions = inject(RequestActions);
  readonly request = computed(() => this.requests.get(this.id()));
  readonly type = computed(() => (this.request() ? moduleDef(this.request()!.module).type : ''));
  readonly current = computed(() => this.request()?.steps.find(s => s.status === 'current'));
  readonly doneCount = computed(() => this.request()?.steps.filter(s => s.status === 'done').length ?? 0);
}
