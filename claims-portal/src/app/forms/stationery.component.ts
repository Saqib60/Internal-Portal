import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ENTITLEMENTS } from '../core/mock-data';
import { workflowFor } from '../core/modules';
import { ModuleKey } from '../core/models';
import { RequestPayload } from '../core/request.service';
import { FormSectionComponent } from '../shared/form-section.component';
import { LockedFieldComponent } from '../shared/locked-field.component';
import { WorkflowCardComponent } from '../shared/workflow-card.component';
import { RowField } from '../shared/row-dialog.component';
import { FormFooterComponent, FormHeadComponent, FormPageBase, LineColumn, LineTableComponent, fmtDate } from './form-kit';

@Component({
  selector: 'app-stationery',
  standalone: true,
  imports: [ReactiveFormsModule, MatRadioModule, MatCheckboxModule, FormSectionComponent, LockedFieldComponent, WorkflowCardComponent, FormHeadComponent, FormFooterComponent, LineTableComponent],
  template: `
    <div class="page">
      <app-form-head group="Requests" title="Stationery Request" description="Request stationery from Admin. Items are issued once Head of Admin approves." (policy)="viewPolicy()" />
      <div class="form-layout">
        <form class="card" [formGroup]="form">
          <div class="req-note"><span class="star">*</span> Required field. You can’t submit until all required fields are filled.</div>
          <app-form-section [n]="1" title="Requester details" description="Name, department and designation are pulled from HR records." [required]="true">
            <span class="radio-label">Company <span class="star">*</span></span>
            <mat-radio-group formControlName="company" class="choice-row">
              @for (c of companies; track c) {
                <div class="choice" [class.selected]="v().company === c"><mat-radio-button [value]="c" color="primary">{{ c }}</mat-radio-button></div>
              }
            </mat-radio-group>
            <div class="grid-2">
              <app-locked-field label="Name" [value]="me.name" />
              <app-locked-field label="Date" [value]="todayText" />
              <app-locked-field label="Department" [value]="me.department" />
              <app-locked-field label="Designation" [value]="me.designation" />
            </div>
          </app-form-section>

          <app-form-section [n]="2" title="Items" description="List the stationery you need. Quantity supplied is filled in by Admin." [required]="true">
            <app-line-table formControlName="items" noun="item" [numbered]="true" [columns]="columns" [fields]="fields" dialogIcon="edit_note"
                            addSubtitle="What you need and how many." [invalid]="attempted() && form.controls.items.invalid" />
            <mat-checkbox formControlName="largeQuantity" color="primary">This is a large quantity for a seminar, meeting or training</mat-checkbox>
            <div><small class="muted">If ticked, your PM / Head of Department approves the request before it goes to Head of Admin.</small></div>
            @if (units() > allowanceLeft && !v().largeQuantity) {
              <div class="warn">You’re asking for {{ units() }} units but have {{ allowanceLeft }} left this month. Tick “large quantity” if this is for an event.</div>
            }
          </app-form-section>
          <app-form-footer [busy]="submitting()" (cancel)="cancel()" (draft)="saveDraft()" (submit)="submit()" />
        </form>
        <aside class="side">
          <div class="card">
            <div class="card-title">Your allowance</div>
            <div class="kv"><span>Monthly allowance</span><span>{{ ent.stationeryMonthly }} items</span></div>
            <div class="kv"><span>Requested this month</span><span>{{ ent.stationeryUsed }} items</span></div>
            <div class="kv"><span>Typical delivery</span><span>1–2 working days</span></div>
          </div>
          <app-workflow-card [steps]="steps()" />
        </aside>
      </div>
    </div>
  `,
  styles: [`.warn { margin-top: 10px; background: var(--amber-50); color: var(--amber); border-radius: 8px; padding: 8px 12px; font-size: 12.5px; }`],
})
export class StationeryComponent extends FormPageBase {
  readonly module: ModuleKey = 'stationery';
  readonly ent = ENTITLEMENTS;
  readonly allowanceLeft = ENTITLEMENTS.stationeryMonthly - ENTITLEMENTS.stationeryUsed;
  readonly todayText = fmtDate(new Date());
  readonly companies = ['NETSOL Technologies Limited', 'NETSOL-Innovation (Pvt.) Limited'];

  readonly form = inject(FormBuilder).group({
    company: ['NETSOL Technologies Limited', Validators.required],
    items: [[] as Record<string, any>[], Validators.required],
    largeQuantity: [false],
  });
  readonly v = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly steps = computed(() => workflowFor('stationery', { largeQuantity: this.v().largeQuantity }));
  readonly units = computed(() => (this.v().items ?? []).reduce((s, i) => s + (+i['qty'] || 0), 0));

  readonly columns: LineColumn[] = [
    { key: 'name', label: 'Stationery' },
    { key: 'qty', label: 'Qty demanded', type: 'number', width: '120px' },
    { key: 'supplied', label: 'Qty supplied', type: 'static', text: 'By Admin', width: '110px' },
    { key: 'remarks', label: 'Remarks' },
  ];
  readonly fields: RowField[] = [
    { key: 'name', label: 'Stationery', type: 'select', required: true, wide: true, options: [
      'A4 paper ream', 'Blue ball pens (box of 10)', 'Black ball pens (box of 10)', 'Spiral notebook', 'Whiteboard markers (set of 4)',
      'Sticky notes', 'Stapler', 'Staples (box)', 'File folders (pack of 10)', 'Highlighters (set of 4)', 'Printer toner',
    ] },
    { key: 'qty', label: 'Quantity', type: 'number', required: true, min: 1, max: 100 },
    { key: 'remarks', label: 'Remarks', type: 'text', placeholder: 'e.g. Meeting room 3B' },
  ];

  protected payload(): RequestPayload {
    const v = this.form.getRawValue();
    const items = v.items ?? [];
    return {
      title: `Stationery · ${this.units()} item${this.units() === 1 ? '' : 's'}`,
      amount: null,
      details: [
        { label: 'Company', value: v.company ?? '' },
        { label: 'Items', value: `${items.length} lines · ${this.units()} units` },
        { label: 'Large quantity', value: v.largeQuantity ? 'Yes (PM / HOD approval)' : 'No' },
      ],
      attachments: [],
      data: {
        largeQuantity: v.largeQuantity,
        items: items.map(i => ({ name: i['name'], qty: +i['qty'], remarks: i['remarks'] ?? '' })),
        lineItems: { columns: ['Sr. no', 'Stationery', 'Qty demanded', 'Qty supplied', 'Remarks'], rows: items.map((i, n) => [String(n + 1), i['name'], String(i['qty']), 'By Admin', i['remarks'] || '—']) },
      },
    };
  }
}
