import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ENTITLEMENTS } from '../core/mock-data';
import { workflowFor } from '../core/modules';
import { ModuleKey } from '../core/models';
import { RequestPayload } from '../core/request.service';
import { FormSectionComponent } from '../shared/form-section.component';
import { LockedFieldComponent } from '../shared/locked-field.component';
import { FileUploadComponent } from '../shared/file-upload.component';
import { WorkflowCardComponent } from '../shared/workflow-card.component';
import { PkrPipe } from '../shared/pipes';
import { FormFooterComponent, FormHeadComponent, FormPageBase, LineColumn, LineTableComponent, fmtDate, monthOptions } from './form-kit';
import { RowField } from '../shared/row-dialog.component';

/** Mobile and Child Fee reimbursement share the same paper form: billing month, expense table, receipts. */
@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatCheckboxModule, FormSectionComponent, LockedFieldComponent, FileUploadComponent, WorkflowCardComponent, PkrPipe, FormHeadComponent, FormFooterComponent, LineTableComponent],
  template: `
    <div class="page">
      <app-form-head group="Reimbursements" [title]="cfg.title" [crumb]="cfg.crumb" [description]="cfg.description" (policy)="viewPolicy()" />
      <div class="form-layout">
        <form class="card" [formGroup]="form">
          <div class="req-note"><span class="star">*</span> Required field. You can’t submit until all required fields are filled.</div>
          <app-form-section [n]="1" title="Employee & billing details" description="Name, code and department are pulled from HR records." [required]="true">
            <div class="grid-2">
              <app-locked-field label="Name" [value]="me.name" />
              <app-locked-field label="Emp. code" [value]="me.code" />
              <app-locked-field label="Department" [value]="me.department" />
              <div class="field">
                <label>Billing month <span class="star">*</span></label>
                <mat-form-field appearance="outline">
                  <mat-select formControlName="billingMonth" placeholder="Select month">
                    @for (m of months; track m) { <mat-option [value]="m">{{ m }}</mat-option> }
                  </mat-select>
                  <mat-error>Choose the billing month</mat-error>
                </mat-form-field>
              </div>
            </div>
          </app-form-section>

          <app-form-section [n]="2" title="Expenses" description="List each bill or receipt for this month." [required]="true">
            <app-line-table formControlName="expenses" noun="expense" [columns]="columns" [fields]="fields" totalKey="amount" dialogIcon="receipt_long"
                            [addSubtitle]="'Add a bill or receipt for ' + (form.value.billingMonth || 'this month') + '. You can attach the receipt below the table.'"
                            [invalid]="attempted() && form.controls.expenses.invalid" />
            <small class="muted">{{ cfg.limitNote }}</small>
            @if (overLimit()) { <div class="warn">Your total is above the limit. Anything over {{ cfg.limit | pkr: true }} won’t be reimbursed.</div> }
          </app-form-section>

          <app-form-section [n]="3" title="Original receipts" description="Please attach original receipts for every expense listed above." [required]="true">
            <app-file-upload formControlName="receipts" label="Receipts" [required]="true" hint="Original receipts · PDF, JPG or PNG up to 5 MB" [invalid]="attempted() && form.controls.receipts.invalid" />
            <mat-checkbox formControlName="confirm" color="primary" [class.invalid-block]="attempted() && form.controls.confirm.invalid">I confirm that the information provided is correct and complete.</mat-checkbox>
          </app-form-section>

          <app-form-footer [busy]="submitting()" (cancel)="cancel()" (draft)="saveDraft()" (submit)="submit()" />
        </form>

        <aside class="side">
          <div class="card">
            <div class="card-title">{{ cfg.sideTitle }}</div>
            @for (k of cfg.side; track k[0]) { <div class="kv"><span>{{ k[0] }}</span><span>{{ k[1] }}</span></div> }
            <div class="kv"><span>This claim</span><span>{{ total() | pkr: true }}</span></div>
          </div>
          <app-workflow-card [steps]="steps" />
        </aside>
      </div>
    </div>
  `,
  styles: [`.warn { margin-top: 8px; background: var(--amber-50); color: var(--amber); border-radius: 8px; padding: 8px 12px; font-size: 12.5px; }
    mat-checkbox.invalid-block { outline: 1px solid var(--red); border-radius: 6px; }`],
})
export class ExpenseFormComponent extends FormPageBase {
  readonly module: ModuleKey = inject(ActivatedRoute).snapshot.data['module'];
  readonly cfg = CONFIG[this.module as 'mobile' | 'child-fee'];
  readonly steps = workflowFor(this.module);
  readonly months = monthOptions();

  readonly form = inject(FormBuilder).group({
    billingMonth: [monthOptions()[1], Validators.required],
    expenses: [[] as Record<string, any>[], Validators.required],
    receipts: [[] as { name: string; size: number }[], Validators.required],
    confirm: [false, Validators.requiredTrue],
  });

  private readonly expenses = toSignal(this.form.controls.expenses.valueChanges, { initialValue: [] as Record<string, any>[] });
  readonly total = computed(() => (this.expenses() ?? []).reduce((s, e) => s + (+e['amount'] || 0), 0));
  readonly overLimit = computed(() => this.total() > this.cfg.limit);

  readonly columns: LineColumn[] = [
    { key: 'date', label: 'Date', type: 'date', width: '130px' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount (PKR)', type: 'amount', width: '140px' },
  ];
  readonly fields: RowField[] = [
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'amount', label: 'Amount', type: 'number', prefix: 'PKR', required: true, min: 1 },
    { key: 'description', label: 'Description', type: 'text', required: true, wide: true, placeholder: this.module === 'mobile' ? 'e.g. Roaming charges · Karachi visit' : 'e.g. Tuition fee · Hamza Ahmed · Grade 1' },
  ];

  protected payload(): RequestPayload {
    const v = this.form.getRawValue();
    const items = v.expenses ?? [];
    return {
      title: `${this.cfg.short} · ${v.billingMonth}`,
      amount: this.total(),
      details: [
        { label: 'Billing month', value: v.billingMonth ?? '—' },
        { label: 'Expenses', value: String(items.length) },
        { label: 'Total claimed', value: `PKR ${this.total().toLocaleString('en-US')}` },
      ],
      attachments: v.receipts ?? [],
      data: {
        lineItems: { columns: ['Date', 'Description', 'Amount (PKR)'], rows: items.map(e => [fmtDate(e['date']), e['description'], (+e['amount']).toLocaleString('en-US')]) },
      },
    };
  }
}

const CONFIG = {
  mobile: {
    title: 'Mobile Reimbursement', crumb: 'Mobile', short: 'Mobile bill',
    description: 'Claim your monthly mobile bill up to the limit for your grade.',
    limit: ENTITLEMENTS.mobileLimit,
    limitNote: `Claims are paid up to your monthly limit of PKR ${ENTITLEMENTS.mobileLimit.toLocaleString('en-US')}.`,
    sideTitle: 'Mobile entitlement',
    side: [['Grade', 'G-7'], ['Monthly limit', `PKR ${ENTITLEMENTS.mobileLimit.toLocaleString('en-US')}`], ['Claimed this year', `PKR ${ENTITLEMENTS.mobileUsed.toLocaleString('en-US')}`]],
  },
  'child-fee': {
    title: 'Child Fee Reimbursement', crumb: 'Child Fee', short: 'Child fee',
    description: 'Claim school tuition fees for your children, up to your annual entitlement.',
    limit: ENTITLEMENTS.childFeeLimit - ENTITLEMENTS.childFeeUsed,
    limitNote: `You have PKR ${(ENTITLEMENTS.childFeeLimit - ENTITLEMENTS.childFeeUsed).toLocaleString('en-US')} left of your PKR ${ENTITLEMENTS.childFeeLimit.toLocaleString('en-US')} annual limit.`,
    sideTitle: 'Child fee entitlement',
    side: [['Annual limit', `PKR ${ENTITLEMENTS.childFeeLimit.toLocaleString('en-US')}`], ['Claimed this year', `PKR ${ENTITLEMENTS.childFeeUsed.toLocaleString('en-US')}`], ['Children covered', 'Ayesha, Hamza']],
  },
} as const;
