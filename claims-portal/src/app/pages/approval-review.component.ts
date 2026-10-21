import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { RequestService, Decision, currentStep } from '../core/request.service';
import { FeedbackService } from '../core/feedback.service';
import { moduleDef } from '../core/modules';
import { ProgressTrackerComponent } from '../shared/progress-tracker.component';
import { RequestBodyComponent } from './request-body.component';

/** Approver review screen: request, history, policy checks and the decision panel. */
@Component({
  selector: 'app-approval-review',
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, ProgressTrackerComponent, RequestBodyComponent],
  template: `
    @if (request(); as r) {
      <div class="page">
        <div class="breadcrumb"><a routerLink="/dashboard">Home</a> / <a routerLink="/approvals">Approvals</a> / {{ type() }}</div>
        <div class="page-header">
          <div>
            <h1>Review {{ type() }} request</h1>
            <p>Submitted by {{ r.employee.name }} ({{ r.employee.code }}) · {{ r.employee.department }} · {{ r.submittedOn | date: 'dd MMM y' }}</p>
          </div>
          @if (step()) { <span class="await">Awaiting your approval</span> }
        </div>
        <div class="card track"><div class="card-title">Approval progress</div><app-progress-tracker [request]="r" /></div>

        <div class="form-layout">
          <app-request-body [r]="r" />
          <div class="side">
            <div class="card emp">
              <div class="who"><span class="av">{{ r.employee.initials }}</span><div><strong>{{ r.employee.name }}</strong><small>{{ r.employee.designation }} · {{ r.employee.code }}</small></div></div>
              <div class="kv"><span>Department</span><span>{{ r.employee.department }}</span></div>
            </div>

            @if (step(); as s) {
              <form class="card decision" [formGroup]="form()" (ngSubmit)="decide('approve')">
                <div class="card-title">Your decision</div>
                <p class="muted small">You are approving as {{ s.role }}.</p>
                <div class="checks">
                  <small>Policy checks</small>
                  <div><mat-icon>check_circle</mat-icon> Submitted with all required fields</div>
                  @for (d of doneSteps(); track d.role) { <div><mat-icon>check_circle</mat-icon> {{ d.employeeStep ? 'Physician form uploaded' : 'Approved by ' + d.role }}</div> }
                  @if (r.attachments.length) { <div><mat-icon>check_circle</mat-icon> {{ r.attachments.length }} document{{ r.attachments.length > 1 ? 's' : '' }} attached</div> }
                </div>

                @if (isStationeryIssue()) {
                  <div class="issue">
                    <small>Quantity supplied</small>
                    @for (it of items(); track $index) {
                      <div class="it"><span>{{ it.name }} <em class="muted">× {{ it.qty }}</em></span>
                        <input type="number" min="0" [max]="it.qty" [value]="supplied()[$index]" (input)="setSupplied($index, $any($event.target).value)" aria-label="Quantity supplied" /></div>
                    }
                  </div>
                }

                @for (f of s.fields ?? []; track f.key) {
                  <div class="field">
                    <label>{{ f.label }} @if (f.required) {<span class="star">*</span>}</label>
                    @switch (f.type) {
                      @case ('select') { <mat-form-field><mat-select [formControlName]="f.key">@for (o of f.options; track o) {<mat-option [value]="o">{{ o }}</mat-option>}</mat-select></mat-form-field> }
                      @case ('date') { <mat-form-field><input matInput [matDatepicker]="dp" [formControlName]="f.key" /><mat-datepicker-toggle matIconSuffix [for]="dp" /><mat-datepicker #dp /></mat-form-field> }
                      @default {
                        <mat-form-field>
                          <span matTextPrefix class="prefix-text" [hidden]="!f.prefix">{{ f.prefix }}</span>
                          <input matInput [type]="f.type" [formControlName]="f.key" />
                        </mat-form-field>
                      }
                    }
                  </div>
                }
                <div class="field">
                  <label>Remarks</label>
                  <mat-form-field appearance="outline" subscriptSizing="dynamic">
                    <textarea matInput rows="3" [formControl]="remarks" placeholder="Add a note for the employee. Required if you send back or reject."></textarea>
                  </mat-form-field>
                  @if (remarksError()) { <small class="err">Add a remark so the employee knows what to change.</small> }
                </div>
                <button mat-flat-button color="primary" type="submit" class="full">{{ s.approveLabel || 'Approve' }}</button>
                <button mat-stroked-button type="button" class="full" (click)="decide('sendBack')">Send back for changes</button>
                <button mat-button type="button" class="full text-danger" (click)="decide('reject')">Reject</button>
              </form>
            } @else {
              <div class="card"><div class="card-title">No action needed</div><p class="muted small">This request isn’t waiting on an approver right now. Status: {{ r.status }}.</p></div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .await { background: var(--amber-50); color: var(--amber); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; }
    .track { margin-bottom: 20px; }
    .who { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; strong { display: block; } small { color: var(--muted); font-size: 12px; } }
    .av { width: 38px; height: 38px; border-radius: 50%; background: #f59e0b; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 13px; }
    .decision { border-color: var(--blue-100); box-shadow: 0 6px 24px rgba(31,79,216,.08); display: flex; flex-direction: column; gap: 4px;
      .full { width: 100%; margin-top: 6px; } .field { margin-top: 10px; } }
    .checks { background: #f8fafc; border-radius: 10px; padding: 10px 12px; margin: 8px 0 4px; font-size: 12.5px;
      small { color: var(--muted); display: block; margin-bottom: 4px; } div { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
      mat-icon { color: var(--green); font-size: 16px; width: 16px; height: 16px; } }
    .issue { margin-top: 10px; small { color: var(--text-2); font-weight: 500; font-size: 12.5px; }
      .it { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--border); }
      input { width: 64px; height: 30px; border: 1px solid var(--border-strong); border-radius: 6px; padding: 0 8px; font: inherit; } em { font-style: normal; } }
    .err { color: var(--red); font-size: 11.5px; }
  `],
})
export class ApprovalReviewComponent {
  readonly id = input.required<string>();
  private readonly requests = inject(RequestService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  readonly request = computed(() => this.requests.get(this.id()));
  readonly type = computed(() => (this.request() ? moduleDef(this.request()!.module).type : ''));
  readonly step = computed(() => {
    const r = this.request();
    const s = r ? currentStep(r) : undefined;
    return s && !s.employeeStep && ['Pending', 'In Review'].includes(r!.status) ? s : undefined;
  });
  readonly doneSteps = computed(() => this.request()?.steps.filter(s => s.status === 'done') ?? []);
  readonly isStationeryIssue = computed(() => this.request()?.module === 'stationery' && this.step()?.role === 'Head of Admin');
  readonly items = computed<{ name: string; qty: number; remarks?: string }[]>(() => this.request()?.data['items'] ?? []);
  readonly supplied = signal<number[]>([]);

  /** Rebuilt whenever the current step changes, with that step's fields. */
  readonly form = computed(() => {
    const group = new FormGroup<Record<string, FormControl>>({});
    const amount = this.request()?.amount ?? null;
    for (const f of this.step()?.fields ?? []) {
      group.addControl(f.key, new FormControl(this.prefill(f.key, amount), f.required ? Validators.required : []));
    }
    return group;
  });
  readonly remarks = new FormControl('', { nonNullable: true });
  readonly remarksError = signal(false);

  constructor() {
    effect(() => this.supplied.set(this.items().map(i => i.qty)), { allowSignalWrites: true });
  }

  setSupplied(i: number, v: string): void {
    this.supplied.update(list => list.map((x, j) => (j === i ? Math.max(0, +v || 0) : x)));
  }

  decide(d: Decision): void {
    const r = this.request()!;
    const s = this.step()!;
    if (d === 'approve' && this.form().invalid) {
      this.form().markAllAsTouched();
      this.feedback.toast('error', 'A few fields are missing', `Fill in the ${s.role} fields before you approve.`);
      return;
    }
    if (d !== 'approve' && !this.remarks.value.trim()) {
      this.remarksError.set(true);
      return;
    }
    this.remarksError.set(false);
    const copy = {
      approve: { type: 'success' as const, title: `${s.approveLabel || 'Approve'}?`, message: `${r.id} will move to the next step and ${r.employee.name} will be notified.`, primary: s.approveLabel || 'Approve' },
      sendBack: { type: 'warning' as const, title: 'Send back for changes?', message: `${r.employee.name} will see your remarks and can resubmit ${r.id}.`, primary: 'Send back' },
      reject: { type: 'danger' as const, title: 'Reject this request?', message: `${r.id} will be closed. ${r.employee.name} will need to submit a new request.`, primary: 'Yes, reject' },
    }[d];
    this.feedback.popup({ ...copy, secondary: 'Cancel', icon: d === 'reject' ? 'block' : undefined }).subscribe(ok => {
      if (!ok) return;
      const values: Record<string, unknown> = {};
      for (const [k, c] of Object.entries(this.form().controls)) values[k] = c.value instanceof Date ? c.value.toISOString() : c.value;
      let extra = {};
      if (this.isStationeryIssue() && d === 'approve') {
        const items = this.items().map((it, i) => ({ ...it, supplied: this.supplied()[i] }));
        extra = { data: { ...r.data, items, lineItems: { columns: ['Stationery', 'Qty demanded', 'Qty supplied', 'Remarks'], rows: items.map(i => [i.name, String(i.qty), String(i.supplied), i.remarks || '—']) } } };
      }
      this.requests.decide(r.id, d, this.remarks.value.trim(), values, extra).subscribe(updated => {
        const msg = d === 'approve' ? (updated.status === 'Approved' ? 'All approvals are complete.' : `Forwarded to ${currentStep(updated)?.role}.`) : d === 'reject' ? 'The employee has been notified.' : 'The employee can now update and resubmit.';
        this.feedback.toast(d === 'reject' ? 'error' : d === 'sendBack' ? 'warning' : 'success', d === 'approve' ? `${r.id} approved` : d === 'reject' ? `${r.id} rejected` : `${r.id} sent back`, msg);
        this.router.navigate(['/approvals']);
      });
    });
  }

  /** Sensible defaults so the demo is quick to click through. */
  private prefill(key: string, amount: number | null): unknown {
    switch (key) {
      case 'receivedOn': case 'disbursementDate': case 'pickupDate': return new Date();
      case 'currentBill': case 'amountToBePaid': case 'loanSanctioned': return amount;
      case 'availableLimit': return 57700;
      case 'balanceLimit': return amount !== null ? 57700 - amount : null;
      case 'pfBalance': return 1245000;
      case 'toDateBalance': return 1318400;
      case 'monthlyContribution': return 17300;
      case 'membershipDate': return new Date('2019-03-03');
      case 'previousLoanEnded': return 'No previous loan';
      case 'loanBalance': return 0;
      case 'installments': return '36';
      case 'deductionFrom': return monthLabel(1);
      case 'deductionTo': return monthLabel(36);
      case 'installmentAmount': return amount ? Math.round(amount / 36) : null;
      default: return null;
    }
  }
}

function monthLabel(offset: number): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}
