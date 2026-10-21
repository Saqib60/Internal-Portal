import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { workflowFor } from '../core/modules';
import { ModuleKey } from '../core/models';
import { RequestPayload } from '../core/request.service';
import { FormSectionComponent } from '../shared/form-section.component';
import { LockedFieldComponent } from '../shared/locked-field.component';
import { WorkflowCardComponent } from '../shared/workflow-card.component';
import { PkrPipe } from '../shared/pipes';
import { FormFooterComponent, FormHeadComponent, FormPageBase, fmtDate, money } from './form-kit';

const GROSS_SALARY = 250000;

function nextMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 1; i <= n; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    out.push(m.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }));
  }
  return out;
}

@Component({
  selector: 'app-advance-salary',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatDatepickerModule, FormSectionComponent, LockedFieldComponent, WorkflowCardComponent, PkrPipe, FormHeadComponent, FormFooterComponent],
  template: `
    <div class="page">
      <app-form-head group="Loans & Advances" title="Advance Salary" description="Request part of your salary in advance. The amount is recovered from upcoming payrolls." (policy)="viewPolicy()" />
      <div class="form-layout">
        <form class="card" [formGroup]="form">
          <div class="req-note"><span class="star">*</span> Required field. You can’t submit until all required fields are filled.</div>
          <app-form-section [n]="1" title="Request details" description="Enter the amount you need and choose how it will be recovered." [required]="true">
            <div class="grid-2">
              <div class="field">
                <label>Amount requested <span class="star">*</span></label>
                <mat-form-field>
                  <span matTextPrefix class="prefix-text">PKR</span>
                  <input matInput type="number" formControlName="amount" />
                  <mat-hint>Up to one month’s gross salary ({{ gross | pkr: true }})</mat-hint>
                  @if (form.controls.amount.hasError('max')) { <mat-error>Can’t be more than {{ gross | pkr: true }}</mat-error> } @else { <mat-error>Enter the amount</mat-error> }
                </mat-form-field>
              </div>
              <div class="field">
                <label>Reason <span class="star">*</span></label>
                <mat-form-field>
                  <mat-select formControlName="reason" placeholder="Select a reason">@for (r of reasons; track r) { <mat-option [value]="r">{{ r }}</mat-option> }</mat-select>
                  <mat-error>Choose a reason</mat-error>
                </mat-form-field>
              </div>
              <div class="field">
                <label>Recovery installments <span class="star">*</span></label>
                <mat-form-field>
                  <mat-select formControlName="installments">@for (n of [1, 2, 3]; track n) { <mat-option [value]="n">{{ n }} month{{ n > 1 ? 's' : '' }}</mat-option> }</mat-select>
                </mat-form-field>
              </div>
              <div class="field">
                <label>Recovery starts from <span class="star">*</span></label>
                <mat-form-field>
                  <mat-select formControlName="startMonth">@for (m of months; track m) { <mat-option [value]="m">{{ m }}</mat-option> }</mat-select>
                </mat-form-field>
              </div>
              <app-locked-field label="Monthly deduction" [value]="deduction() | pkr: true" hint="Amount ÷ recovery installments" />
              <div class="field">
                <label>Required by <span class="star">*</span></label>
                <mat-form-field>
                  <input matInput [matDatepicker]="dp" formControlName="requiredBy" [min]="today" placeholder="DD / MM / YYYY" />
                  <mat-datepicker-toggle matIconSuffix [for]="dp" /><mat-datepicker #dp />
                  <mat-error>Choose a date</mat-error>
                </mat-form-field>
              </div>
              <app-locked-field label="Paid to" value="Salary account · HBL ****4471" />
              <div></div>
              <div class="field span-2">
                <label>Remarks</label>
                <mat-form-field><textarea matInput rows="3" formControlName="remarks" placeholder="Add any detail that helps HR review your request (optional)"></textarea></mat-form-field>
              </div>
            </div>
          </app-form-section>
          <app-form-section [n]="2" title="Declaration" description="Please read and confirm before submitting your request." [required]="true">
            <mat-checkbox formControlName="confirm" color="primary">I authorise the company to recover this advance from my salary as selected above, and from my final settlement if I leave before it is recovered.</mat-checkbox>
            @if (attempted() && form.controls.confirm.invalid) { <div><small class="text-danger">Tick the box to submit</small></div> }
          </app-form-section>
          <app-form-footer [busy]="submitting()" (cancel)="cancel()" (draft)="saveDraft()" (submit)="submit()" />
        </form>
        <aside class="side">
          <div class="card">
            <div class="card-title">Advance summary</div>
            <div class="kv"><span>Advances taken this year</span><span>0 of 2</span></div>
            <div class="kv"><span>Outstanding balance</span><span>PKR 0</span></div>
            <div class="kv"><span>Next payroll date</span><span>{{ nextPayroll }}</span></div>
          </div>
          <app-workflow-card [steps]="steps" />
        </aside>
      </div>
    </div>
  `,
})
export class AdvanceSalaryComponent extends FormPageBase {
  readonly module: ModuleKey = 'advance-salary';
  readonly steps = workflowFor('advance-salary');
  readonly gross = GROSS_SALARY;
  readonly reasons = ['Medical emergency', 'Education fees', 'Wedding or family event', 'House repair', 'Other'];
  readonly months = nextMonths(3);
  readonly nextPayroll = fmtDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));

  readonly form = inject(FormBuilder).group({
    amount: [null as number | null, [Validators.required, Validators.min(1), Validators.max(GROSS_SALARY)]],
    reason: ['', Validators.required],
    installments: [1, Validators.required],
    startMonth: [this.months[0], Validators.required],
    requiredBy: [null as Date | null, Validators.required],
    remarks: [''],
    confirm: [false, Validators.requiredTrue],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly deduction = computed(() => (this.value().amount ? Math.round(this.value().amount! / (this.value().installments ?? 1)) : null));

  protected override restore(v: Record<string, any>): void {
    this.form.patchValue({ ...v, requiredBy: v['requiredBy'] ? new Date(v['requiredBy']) : null });
  }

  protected payload(): RequestPayload {
    const v = this.form.getRawValue();
    return {
      title: 'Advance salary',
      amount: v.amount,
      details: [
        { label: 'Amount requested', value: money(v.amount) },
        { label: 'Reason', value: v.reason || '—' },
        { label: 'Recovery', value: `${v.installments} installment(s) from ${v.startMonth}` },
        { label: 'Monthly deduction', value: money(this.deduction()) },
        { label: 'Required by', value: fmtDate(v.requiredBy) },
      ],
      attachments: [],
      data: { remarks: v.remarks },
    };
  }
}
