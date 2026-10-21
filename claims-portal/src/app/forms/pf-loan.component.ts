import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
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
import { FormFooterComponent, FormHeadComponent, FormPageBase, money } from './form-kit';

const REASONS = [
  'Self or family member illness',
  'Marriage or funeral ceremony',
  'Building or purchase of house or plot, or renovation / extension of house',
  'Performance of Hajj or Umrah, or religious activities of other religions',
  'Purchase of a motorcycle, scooter or vehicle',
  'Purchase of shares of a public limited company for investment',
  'Overseas passage for health or education of self or family member',
];

@Component({
  selector: 'app-pf-loan',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule, MatCheckboxModule, FormSectionComponent, LockedFieldComponent, FileUploadComponent, WorkflowCardComponent, PkrPipe, FormHeadComponent, FormFooterComponent],
  template: `
    <div class="page">
      <app-form-head group="Loans & Advances" title="Provident Fund Loan" crumb="PF Loan" description="Borrow against your provident fund balance. Installments are deducted from your monthly salary." (policy)="viewPolicy()" />
      <div class="form-layout">
        <form class="card" [formGroup]="form">
          <div class="req-note"><span class="star">*</span> Required field. You can’t submit until all required fields are filled.</div>

          <app-form-section [n]="1" title="Employee details" description="Pulled from HR records. Contact HR if anything looks wrong." [required]="true">
            <div class="grid-2">
              <app-locked-field label="Name" [value]="me.name" />
              <app-locked-field label="Employee code" [value]="me.code" />
              <app-locked-field label="Department" [value]="me.department" />
              <app-locked-field label="Designation" [value]="me.designation" />
            </div>
            <span class="radio-label">Company <span class="star">*</span></span>
            <mat-radio-group formControlName="company" class="choice-row">
              @for (c of companies; track c) {
                <div class="choice" [class.selected]="form.value.company === c"><mat-radio-button [value]="c" color="primary">{{ c }}</mat-radio-button></div>
              }
            </mat-radio-group>
          </app-form-section>

          <app-form-section [n]="2" title="Loan details" description="Enter the loan amount and how you’d like to repay it in monthly installments." [required]="true">
            <div class="grid-2">
              <div class="field">
                <label>Loan required <span class="star">*</span></label>
                <mat-form-field>
                  <span matTextPrefix class="prefix-text">PKR</span>
                  <input matInput type="number" formControlName="amount" min="1" />
                  @if (form.controls.amount.hasError('max')) { <mat-error>Can’t be more than {{ maxEligible | pkr: true }}</mat-error> }
                  @else { <mat-error>Enter the loan amount</mat-error> }
                </mat-form-field>
              </div>
              <div class="field">
                <label>Number of installments <span class="star">*</span></label>
                <mat-form-field>
                  <mat-select formControlName="installments">@for (n of installmentOptions; track n) { <mat-option [value]="n">{{ n }}</mat-option> }</mat-select>
                  <mat-error>Choose the number of installments</mat-error>
                </mat-form-field>
              </div>
              <app-locked-field label="Installment amount" [value]="installment() | pkr: true" hint="Loan required ÷ number of installments" />
              <app-locked-field label="Maximum eligible (80% of PF balance)" [value]="maxEligible | pkr: true" [hint]="'PF balance ' + (ent.pfBalance | pkr: true)" />
            </div>
          </app-form-section>

          <app-form-section [n]="3" title="On account of" description="Select the reason you need the loan. Choose one reason per application." [required]="true">
            <mat-radio-group formControlName="reason" class="choice-list" [class.invalid-block]="attempted() && form.controls.reason.invalid">
              @for (r of reasons; track r) {
                <div class="choice" [class.selected]="form.value.reason === r"><mat-radio-button [value]="r" color="primary">{{ r }}</mat-radio-button></div>
              }
            </mat-radio-group>
            @if (attempted() && form.controls.reason.invalid) { <small class="text-danger">Choose a reason</small> }
          </app-form-section>

          <app-form-section [n]="4" title="Evidence & remarks" description="A loan is granted only against sufficient and appropriate evidence." [required]="true">
            <app-file-upload formControlName="evidence" label="Evidence attached" [required]="true" hint="e.g. quotation, medical bills, booking or admission letter · PDF or JPG up to 5 MB" [invalid]="attempted() && form.controls.evidence.invalid" />
            <div class="field">
              <label>Remarks</label>
              <mat-form-field><textarea matInput rows="3" formControlName="remarks" placeholder="Anything else the PF Trust should know (optional)"></textarea></mat-form-field>
            </div>
          </app-form-section>

          <app-form-section [n]="5" title="Declaration" description="Please read the PF loan rules and confirm before submitting." [required]="true">
            <div class="rules">
              <strong>PF loan rules</strong>
              <ol type="i">
                <li>A loan is granted against sufficient and appropriate evidence.</li>
                <li>The loan is recovered in monthly installments from your salary.</li>
                <li>A loan is not granted if another loan from the Fund is outstanding.</li>
                <li>No loan is granted to an employee with less than one (01) year of service.</li>
              </ol>
            </div>
            <div class="checks">
              <mat-checkbox formControlName="authorise" color="primary">I authorise the company to deduct monthly installments from my salary and to recover any outstanding balance from my final settlement.</mat-checkbox>
              <mat-checkbox formControlName="confirm" color="primary">I confirm the information above is correct and I accept the PF loan rules. This is my signature on the application.</mat-checkbox>
              @if (attempted() && (form.controls.authorise.invalid || form.controls.confirm.invalid)) { <small class="text-danger">Tick both boxes to submit</small> }
            </div>
          </app-form-section>

          <app-form-footer [busy]="submitting()" (cancel)="cancel()" (draft)="saveDraft()" (submit)="submit()" />
        </form>
        <aside class="side">
          <div class="card">
            <div class="card-title">PF summary</div>
            <div class="kv"><span>Your contribution</span><span>{{ ent.pfEmployee | pkr: true }}</span></div>
            <div class="kv"><span>Company contribution</span><span>{{ ent.pfCompany | pkr: true }}</span></div>
            <div class="kv"><span>Active PF loans</span><span>None</span></div>
            <div class="kv"><span>Length of service</span><span>{{ service }} years</span></div>
          </div>
          <app-workflow-card [steps]="steps" />
        </aside>
      </div>
    </div>
  `,
  styles: [`.checks { display: flex; flex-direction: column; gap: 6px; } .invalid-block .choice { border-color: #f1b4b4; }`],
})
export class PfLoanComponent extends FormPageBase {
  readonly module: ModuleKey = 'pf-loan';
  readonly ent = ENTITLEMENTS;
  readonly steps = workflowFor('pf-loan');
  readonly reasons = REASONS;
  readonly companies = ['NETSOL Technologies Limited', 'NETSOL-CONNECT (Private) Limited'];
  readonly installmentOptions = [6, 12, 18, 24, 36, 48, 60];
  readonly maxEligible = Math.round(ENTITLEMENTS.pfBalance * 0.8);
  readonly service = new Date().getFullYear() - new Date(this.me.joined).getFullYear();

  readonly form = inject(FormBuilder).group({
    company: ['NETSOL Technologies Limited', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(1), Validators.max(this.maxEligible)]],
    installments: [36, Validators.required],
    reason: ['', Validators.required],
    evidence: [[] as { name: string; size: number }[], Validators.required],
    remarks: [''],
    authorise: [false, Validators.requiredTrue],
    confirm: [false, Validators.requiredTrue],
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly installment = computed(() => {
    const v = this.value();
    return v.amount && v.installments ? Math.round(v.amount / v.installments) : null;
  });

  protected payload(): RequestPayload {
    const v = this.form.getRawValue();
    const shortReason = v.reason?.split(',')[0] ?? '';
    return {
      title: `PF loan · ${shortReason}`,
      amount: v.amount,
      details: [
        { label: 'Loan required', value: money(v.amount) },
        { label: 'On account of', value: v.reason || '—' },
        { label: 'Number of installments', value: String(v.installments) },
        { label: 'Installment amount', value: money(this.installment()) },
        { label: 'Company', value: v.company ?? '' },
        { label: 'Evidence attached', value: `${v.evidence?.length ?? 0} file(s)` },
      ],
      attachments: v.evidence ?? [],
      data: { remarks: v.remarks },
    };
  }
}
