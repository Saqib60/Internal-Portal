import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ENTITLEMENTS } from '../core/mock-data';
import { workflowFor } from '../core/modules';
import { ModuleKey } from '../core/models';
import { RequestPayload } from '../core/request.service';
import { FormSectionComponent } from '../shared/form-section.component';
import { LockedFieldComponent } from '../shared/locked-field.component';
import { FileUploadComponent } from '../shared/file-upload.component';
import { WorkflowCardComponent } from '../shared/workflow-card.component';
import { RowField } from '../shared/row-dialog.component';
import { PkrPipe } from '../shared/pipes';
import { FormFooterComponent, FormHeadComponent, FormPageBase, LineColumn, LineTableComponent, fmtDate, monthOptions, money } from './form-kit';

@Component({
  selector: 'app-fuel',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatProgressBarModule, FormSectionComponent, LockedFieldComponent, FileUploadComponent, WorkflowCardComponent, PkrPipe, FormHeadComponent, FormFooterComponent, LineTableComponent],
  template: `
    <div class="page">
      <app-form-head group="Reimbursements" title="Fuel Reimbursement" crumb="Fuel" description="Claim fuel used for official travel, based on your monthly mileage log." (policy)="viewPolicy()" />
      <div class="form-layout">
        <form class="card" [formGroup]="form">
          <div class="req-note"><span class="star">*</span> Required field. You can’t submit until all required fields are filled.</div>
          <app-form-section [n]="1" title="Vehicle" description="Select the vehicle used for official travel." [required]="true">
            <div class="grid-2">
              <div class="field"><label>Vehicle type <span class="star">*</span></label>
                <mat-form-field><mat-select formControlName="vehicleType">@for (o of ['Car', 'Motorcycle']; track o) {<mat-option [value]="o">{{ o }}</mat-option>}</mat-select></mat-form-field></div>
              <div class="field"><label>Registration number <span class="star">*</span></label>
                <mat-form-field><input matInput formControlName="registration" placeholder="e.g. LEA-19-4471" /><mat-error>Enter the registration number</mat-error></mat-form-field></div>
              <div class="field"><label>Engine capacity <span class="star">*</span></label>
                <mat-form-field><mat-select formControlName="engine">@for (o of engines; track o) {<mat-option [value]="o">{{ o }}</mat-option>}</mat-select></mat-form-field></div>
              <div class="field"><label>Ownership <span class="star">*</span></label>
                <mat-form-field><mat-select formControlName="ownership">@for (o of ['Own vehicle', 'Company vehicle']; track o) {<mat-option [value]="o">{{ o }}</mat-option>}</mat-select></mat-form-field></div>
            </div>
          </app-form-section>

          <app-form-section [n]="2" title="Mileage" description="Log each official trip. Personal travel is not reimbursable." [required]="true">
            <div class="grid-2">
              <div class="field"><label>Claim month <span class="star">*</span></label>
                <mat-form-field><mat-select formControlName="month">@for (m of months; track m) {<mat-option [value]="m">{{ m }}</mat-option>}</mat-select></mat-form-field></div>
              <div class="field"><label>Fuel type <span class="star">*</span></label>
                <mat-form-field><mat-select formControlName="fuelType">@for (o of ['Petrol', 'Hi-Octane', 'Diesel']; track o) {<mat-option [value]="o">{{ o }}</mat-option>}</mat-select></mat-form-field></div>
            </div>
            <app-line-table formControlName="trips" noun="trip" [columns]="columns" [fields]="fields" dialogIcon="route" addSubtitle="Add one official trip from your log." [invalid]="attempted() && form.controls.trips.invalid" />
            <div class="grid-2 mt">
              <app-locked-field label="Total official km" [value]="km() + ' km'" />
              <div class="field"><label>Fuel average <span class="star">*</span></label>
                <mat-form-field><input matInput type="number" formControlName="average" /><span matTextSuffix class="muted">&nbsp;km / litre</span></mat-form-field></div>
            </div>
          </app-form-section>

          <app-form-section [n]="3" title="Fuel cost" description="Enter the fuel rate for this period. The claim amount is calculated for you." [required]="true">
            <div class="grid-2">
              <div class="field"><label>Fuel rate <span class="star">*</span></label>
                <mat-form-field><span matTextPrefix class="prefix-text">PKR</span><input matInput type="number" formControlName="rate" /><span matTextSuffix class="muted">&nbsp;/ litre</span></mat-form-field></div>
              <app-locked-field label="Litres claimed" [value]="litres().toFixed(1) + ' L'" />
            </div>
            <div class="total"><span>Total claim amount</span><strong>{{ amount() | pkr: true }}</strong></div>
          </app-form-section>

          <app-form-section [n]="4" title="Documents" description="Attach fuel receipts and your trip log for verification." [required]="true">
            <app-file-upload formControlName="documents" label="Fuel receipts & trip log" [required]="true" [invalid]="attempted() && form.controls.documents.invalid" />
            <mat-checkbox formControlName="confirm" color="primary">I confirm these trips were for official work and the log is accurate.</mat-checkbox>
            @if (attempted() && form.controls.confirm.invalid) { <div><small class="text-danger">Tick the box to submit</small></div> }
          </app-form-section>
          <app-form-footer [busy]="submitting()" (cancel)="cancel()" (draft)="saveDraft()" (submit)="submit()" />
        </form>
        <aside class="side">
          <div class="card">
            <div class="card-title">Fuel allowance · {{ form.value.month }}</div>
            <div class="kv"><span>Monthly limit</span><span>{{ ent.fuelLimitLitres }} litres</span></div>
            <div class="kv"><span>Claimed this month</span><span>{{ ent.fuelUsedLitres }} litres</span></div>
            <div class="kv"><span>Remaining</span><span>{{ ent.fuelLimitLitres - ent.fuelUsedLitres }} litres</span></div>
            <mat-progress-bar mode="determinate" [value]="(ent.fuelUsedLitres / ent.fuelLimitLitres) * 100" />
            <small class="muted">{{ ((ent.fuelUsedLitres / ent.fuelLimitLitres) * 100).toFixed(0) }}% of monthly limit used</small>
          </div>
          <app-workflow-card [steps]="steps" />
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .mt { margin-top: 12px; }
    .total { display: flex; justify-content: space-between; align-items: center; background: var(--blue-50); border-radius: 10px; padding: 12px 16px; strong { font-size: 18px; } }
    mat-progress-bar { margin: 10px 0 6px; border-radius: 4px; }
  `],
})
export class FuelComponent extends FormPageBase {
  readonly module: ModuleKey = 'fuel';
  readonly ent = ENTITLEMENTS;
  readonly steps = workflowFor('fuel');
  readonly months = monthOptions();
  readonly engines = ['Up to 1000 cc', '1001 – 1300 cc', '1301 – 1800 cc', 'Above 1800 cc', 'Motorcycle'];

  readonly form = inject(FormBuilder).group({
    vehicleType: ['Car', Validators.required],
    registration: ['', Validators.required],
    engine: ['1001 – 1300 cc', Validators.required],
    ownership: ['Own vehicle', Validators.required],
    month: [this.months[1], Validators.required],
    fuelType: ['Petrol', Validators.required],
    trips: [[] as Record<string, any>[], Validators.required],
    average: [12, [Validators.required, Validators.min(1)]],
    rate: [265, [Validators.required, Validators.min(1)]],
    documents: [[] as { name: string; size: number }[], Validators.required],
    confirm: [false, Validators.requiredTrue],
  });

  readonly columns: LineColumn[] = [
    { key: 'purpose', label: 'Purpose' },
    { key: 'date', label: 'Date', type: 'date', width: '120px' },
    { key: 'route', label: 'Route' },
    { key: 'km', label: 'Km', type: 'number', width: '80px' },
  ];
  readonly fields: RowField[] = [
    { key: 'purpose', label: 'Purpose', type: 'text', required: true, placeholder: 'e.g. Client meeting' },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'route', label: 'Route', type: 'text', required: true, wide: true, placeholder: 'e.g. Office → Client site, DHA' },
    { key: 'km', label: 'Distance', type: 'number', suffix: 'km', required: true, min: 1 },
  ];

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly km = computed(() => (this.value().trips ?? []).reduce((s, t) => s + (+t['km'] || 0), 0));
  readonly litres = computed(() => this.km() / (this.value().average || 1));
  readonly amount = computed(() => Math.round(this.litres() * (this.value().rate || 0)));

  protected payload(): RequestPayload {
    const v = this.form.getRawValue();
    const trips = v.trips ?? [];
    return {
      title: `Fuel claim · ${v.month}`,
      amount: this.amount(),
      details: [
        { label: 'Claim month', value: v.month ?? '' },
        { label: 'Vehicle', value: `${v.vehicleType} · ${v.registration}` },
        { label: 'Official km', value: `${this.km()} km` },
        { label: 'Fuel rate', value: `${money(v.rate)} / litre` },
        { label: 'Litres', value: this.litres().toFixed(1) },
        { label: 'Amount', value: money(this.amount()) },
      ],
      attachments: v.documents ?? [],
      data: { lineItems: { columns: ['Purpose', 'Date', 'Route', 'Km'], rows: trips.map(t => [t['purpose'], fmtDate(t['date']), t['route'], String(t['km'])]) } },
    };
  }
}
