import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { workflowFor } from '../core/modules';
import { ModuleKey } from '../core/models';
import { RequestPayload } from '../core/request.service';
import { FormSectionComponent } from '../shared/form-section.component';
import { LockedFieldComponent } from '../shared/locked-field.component';
import { WorkflowCardComponent } from '../shared/workflow-card.component';
import { RowField } from '../shared/row-dialog.component';
import { FormFooterComponent, FormHeadComponent, FormPageBase, LineColumn, LineTableComponent, fmtDate } from './form-kit';

@Component({
  selector: 'app-courier',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatIconModule, FormSectionComponent, LockedFieldComponent, WorkflowCardComponent, FormHeadComponent, FormFooterComponent, LineTableComponent],
  template: `
    <div class="page">
      <app-form-head group="Requests" title="Courier Approval" description="Send personal or official shipments through the company courier account." (policy)="viewPolicy()" />
      <div class="form-layout">
        <form class="card" [formGroup]="form">
          <div class="req-note"><span class="star">*</span> Required field. You can’t submit until all required fields are filled.</div>
          <app-form-section [n]="1" title="Request details" description="Choose whether the shipment is personal or official." [required]="true">
            <div class="grid-2">
              <app-locked-field label="Date" [value]="todayText" />
              <div></div>
            </div>
            <span class="radio-label">Shipment type <span class="star">*</span></span>
            <mat-radio-group formControlName="shipmentType" class="choice-row">
              @for (t of ['Personal', 'Official']; track t) {
                <div class="choice" [class.selected]="v().shipmentType === t"><mat-radio-button [value]="t" color="primary">{{ t }}</mat-radio-button></div>
              }
            </mat-radio-group>
            @if (v().shipmentType === 'Personal') {
              <div class="note"><mat-icon>info</mat-icon> Personal shipments are deducted from your monthly salary.</div>
            } @else {
              <span class="radio-label">Chargeable to <span class="star">*</span></span>
              <mat-radio-group formControlName="chargeableTo" class="choice-row">
                @for (t of chargeOptions; track t) {
                  <div class="choice" [class.selected]="v().chargeableTo === t"><mat-radio-button [value]="t" color="primary">{{ t }}</mat-radio-button></div>
                }
                @if (v().chargeableTo === 'Client project' || v().chargeableTo === 'Other') {
                  <div class="field">
                    <mat-form-field>
                      <input matInput formControlName="chargeDetail" [placeholder]="v().chargeableTo === 'Client project' ? 'Project name' : 'Specify if Other'" />
                      <mat-hint>{{ v().chargeableTo === 'Client project' ? 'Enter the client project name.' : 'Who should this be charged to?' }}</mat-hint>
                      <mat-error>This field is required</mat-error>
                    </mat-form-field>
                  </div>
                }
              </mat-radio-group>
            }
          </app-form-section>

          <app-form-section [n]="2" title="Employee details" description="Name, code, department and designation are pulled from HR records.">
            <div class="grid-2">
              <app-locked-field label="Name" [value]="me.name" />
              <app-locked-field label="E. Code" [value]="me.code" />
              <app-locked-field label="Department" [value]="me.department" />
              <app-locked-field label="Designation" [value]="me.designation" />
            </div>
          </app-form-section>

          <app-form-section [n]="3" title="Shipments" description="Add a row for each package you are sending." [required]="true">
            <app-line-table formControlName="shipments" noun="shipment" [numbered]="true" [columns]="columns" [fields]="fields" dialogIcon="local_shipping"
                            addSubtitle="Who it’s going to, which courier and how heavy it is." [invalid]="attempted() && form.controls.shipments.invalid" />
            <div class="note"><mat-icon>verified_user</mat-icon>
              {{ v().shipmentType === 'Official' ? 'Official shipments are approved by your PM / Head of Department, then Admin books the pickup.' : 'Personal shipments are acknowledged by SPF and deducted from salary. Admin books the pickup.' }}
            </div>
          </app-form-section>
          <app-form-footer [busy]="submitting()" (cancel)="cancel()" (draft)="saveDraft()" (submit)="submit()" />
        </form>
        <aside class="side">
          <div class="card">
            <div class="card-title">Courier details</div>
            <div class="kv"><span>Courier account</span><span>Company — TCS</span></div>
            <div class="kv"><span>Requests this month</span><span>2</span></div>
            <div class="kv"><span>Daily pickup cut-off</span><span>4:00 PM</span></div>
          </div>
          <app-workflow-card [steps]="steps()" />
        </aside>
      </div>
    </div>
  `,
  styles: [`.note { display: flex; gap: 8px; align-items: center; background: #f8fafc; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: var(--text-2); margin: 4px 0 8px;
    mat-icon { color: var(--blue); font-size: 18px; width: 18px; height: 18px; flex: none; } }`],
})
export class CourierComponent extends FormPageBase {
  readonly module: ModuleKey = 'courier';
  readonly todayText = fmtDate(new Date());
  readonly chargeOptions = ['NETSOL Technologies Limited', 'Client project', 'Other'];

  readonly form = inject(FormBuilder).group({
    shipmentType: ['Official', Validators.required],
    chargeableTo: ['NETSOL Technologies Limited'],
    chargeDetail: [''],
    shipments: [[] as Record<string, any>[], Validators.required],
  });
  readonly v = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly steps = computed(() => workflowFor('courier', { shipmentType: this.v().shipmentType }));

  readonly columns: LineColumn[] = [
    { key: 'to', label: 'To', sub: 'address' },
    { key: 'courier', label: 'Courier', width: '90px' },
    { key: 'scope', label: 'Local / Intl.', width: '110px' },
    { key: 'weight', label: 'Weight', suffix: 'kg', width: '80px' },
    { key: 'remarks', label: 'Remarks' },
  ];
  readonly fields: RowField[] = [
    { key: 'to', label: 'To (name / company)', type: 'text', required: true, placeholder: 'e.g. Orient Leasing Ltd.' },
    { key: 'address', label: 'City / address', type: 'text', required: true, placeholder: 'e.g. Shahrah-e-Faisal, Karachi' },
    { key: 'courier', label: 'Courier', type: 'select', options: ['TCS', 'DHL', 'Leopards', 'FedEx'], required: true },
    { key: 'scope', label: 'Local / International', type: 'select', options: ['Local', 'International'], required: true },
    { key: 'weight', label: 'Weight', type: 'number', suffix: 'kg', required: true, min: 0.1 },
    { key: 'remarks', label: 'Remarks', type: 'text', placeholder: 'e.g. Signed contract copies' },
  ];

  constructor() {
    super();
    // "Chargeable to" applies to official shipments only; the detail field is required for Client project / Other.
    this.form.controls.shipmentType.valueChanges.subscribe(t => {
      const c = this.form.controls.chargeableTo;
      c.setValidators(t === 'Official' ? Validators.required : null);
      c.updateValueAndValidity({ emitEvent: false });
      this.syncDetail();
    });
    this.form.controls.chargeableTo.valueChanges.subscribe(() => this.syncDetail());
  }

  private syncDetail(): void {
    const v = this.form.getRawValue();
    const need = v.shipmentType === 'Official' && (v.chargeableTo === 'Client project' || v.chargeableTo === 'Other');
    const d = this.form.controls.chargeDetail;
    d.setValidators(need ? Validators.required : null);
    d.updateValueAndValidity({ emitEvent: false });
  }

  protected payload(): RequestPayload {
    const v = this.form.getRawValue();
    const list = v.shipments ?? [];
    const charge = v.shipmentType === 'Official' ? `${v.chargeableTo}${v.chargeDetail ? ' · ' + v.chargeDetail : ''}` : 'Salary deduction';
    return {
      title: `Courier · ${list.length} shipment${list.length === 1 ? '' : 's'}`,
      amount: null,
      details: [
        { label: 'Shipment type', value: v.shipmentType ?? '' },
        { label: 'Chargeable to', value: charge },
        { label: 'Shipments', value: String(list.length) },
      ],
      attachments: [],
      data: {
        shipmentType: v.shipmentType,
        lineItems: { columns: ['Sr. no', 'To', 'Courier', 'Local / Intl.', 'Weight', 'Remarks'], rows: list.map((s, i) => [String(i + 1), `${s['to']} · ${s['address']}`, s['courier'], s['scope'], `${s['weight']} kg`, s['remarks'] || '—']) },
      },
    };
  }
}
