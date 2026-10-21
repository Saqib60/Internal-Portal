import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { workflowFor } from '../core/modules';
import { ModuleKey } from '../core/models';
import { RequestPayload } from '../core/request.service';
import { FormSectionComponent } from '../shared/form-section.component';
import { LockedFieldComponent } from '../shared/locked-field.component';
import { FileUploadComponent } from '../shared/file-upload.component';
import { WorkflowCardComponent } from '../shared/workflow-card.component';
import { PkrPipe } from '../shared/pipes';
import { FormFooterComponent, FormHeadComponent, FormPageBase, monthOptions, money } from './form-kit';

const HEADS = [
  { key: 'fees', label: 'Fees' },
  { key: 'transport', label: 'Transport' },
  { key: 'books', label: 'Books' },
  { key: 'uniform', label: 'Uniform' },
  { key: 'annualFund', label: 'Annual fund' },
] as const;

@Component({
  selector: 'app-nesp',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule, MatIconModule, FormSectionComponent, LockedFieldComponent, FileUploadComponent, WorkflowCardComponent, PkrPipe, FormHeadComponent, FormFooterComponent],
  template: `
    <div class="page">
      <app-form-head group="Reimbursements" title="NESP Reimbursement" crumb="NESP" description="Submit an NESP claim along with the supporting documents required by policy." (policy)="viewPolicy()" />
      <div class="form-layout">
        <form class="card" [formGroup]="form">
          <div class="req-note"><span class="star">*</span> Required field. You can’t submit until all required fields are filled.</div>
          <app-form-section [n]="1" title="Employee details" description="Name, code and designation are pulled from HR records." [required]="true">
            <div class="grid-2">
              <app-locked-field label="Name" [value]="me.name" />
              <app-locked-field label="Employee code" [value]="me.code" />
              <app-locked-field label="Designation" [value]="me.designation" />
              <div class="field"><label>Billing month(s) <span class="star">*</span></label>
                <mat-form-field>
                  <mat-select formControlName="months" multiple placeholder="Select month(s)">@for (m of monthsList; track m) {<mat-option [value]="m">{{ m }}</mat-option>}</mat-select>
                  <mat-error>Choose at least one month</mat-error>
                </mat-form-field></div>
            </div>
          </app-form-section>

          <app-form-section [n]="2" title="Children & claim" description="Add a card for each child. Enter the amount claimed under each head." [required]="true">
            <div formArrayName="children">
              @for (c of children.controls; track c; let i = $index) {
                <div class="child" [formGroupName]="i">
                  <div class="child-head">
                    <span class="badge">{{ i + 1 }}</span><strong>Child {{ i + 1 }}</strong>
                    <span class="spacer"></span><span class="muted small">Subtotal {{ subtotal(i) | pkr: true }}</span>
                    @if (children.length > 1) { <button mat-button type="button" class="text-danger" (click)="removeChild(i)"><mat-icon>delete_outline</mat-icon>Remove</button> }
                  </div>
                  <div class="grid-2">
                    <div class="field"><label>Child’s name <span class="star">*</span></label>
                      <mat-form-field><mat-select formControlName="name" placeholder="Select child">@for (k of kids; track k) {<mat-option [value]="k">{{ k }}</mat-option>}</mat-select><mat-error>Choose the child</mat-error></mat-form-field></div>
                    <div class="field"><label>Grade / class <span class="star">*</span></label>
                      <mat-form-field><input matInput formControlName="grade" placeholder="e.g. Grade 3" /><mat-error>Enter the grade</mat-error></mat-form-field></div>
                    <div class="field"><label>School <span class="star">*</span></label>
                      <mat-form-field><input matInput formControlName="school" placeholder="e.g. Beaconhouse School System" /><mat-error>Enter the school</mat-error></mat-form-field></div>
                    <div class="field"><label>City <span class="star">*</span></label>
                      <mat-form-field><input matInput formControlName="city" placeholder="e.g. Lahore" /><mat-error>Enter the city</mat-error></mat-form-field></div>
                  </div>
                  <div class="heads-label">Claim (PKR)</div>
                  <div class="heads">
                    @for (h of heads; track h.key) {
                      <div class="field"><label>{{ h.label }}</label>
                        <mat-form-field><input matInput type="number" min="0" [formControlName]="h.key" placeholder="0" /></mat-form-field></div>
                    }
                  </div>
                </div>
              }
            </div>
            <button class="add-link" type="button" (click)="addChild()"><span class="material-icons">add</span> Add another child</button>
            <div class="total">
              <div><span>Total claim</span><small>{{ breakdown() }}</small></div>
              <strong>{{ total() | pkr: true }}</strong>
            </div>
          </app-form-section>

          <app-form-section [n]="3" title="Supporting documents" description="Required for fees, books and uniform. Not needed for transport or annual fund." [required]="needsDocs()">
            <app-file-upload formControlName="documents" label="Fee vouchers & receipts" [required]="needsDocs()" [invalid]="attempted() && needsDocs() && !form.value.documents?.length" />
            <div class="rules">
              <strong>No claim will be processed if</strong>
              <ol type="a">
                <li>Supporting documents are not attached (fees, books and uniform only).</li>
                <li>The form is incomplete.</li>
                <li>The claim is not submitted within 45 days after the expense is incurred.</li>
                <li>It violates any applicable policy or procedure.</li>
              </ol>
            </div>
            <mat-checkbox formControlName="confirm" color="primary">I confirm the information is correct and the expenses were incurred for my children named above.</mat-checkbox>
            @if (attempted() && form.controls.confirm.invalid) { <div><small class="text-danger">Tick the box to submit</small></div> }
          </app-form-section>
          <app-form-footer [busy]="submitting()" (cancel)="cancel()" (draft)="saveDraft()" (submit)="submit()" />
        </form>
        <aside class="side">
          <div class="card">
            <div class="card-title">NESP entitlement · {{ year }}</div>
            <div class="kv"><span>Annual limit</span><span>As per policy</span></div>
            <div class="kv"><span>Claimed to date</span><span>PKR 0</span></div>
            <div class="kv"><span>This claim</span><span>{{ total() | pkr: true }}</span></div>
          </div>
          <app-workflow-card [steps]="steps" />
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .child { border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px 4px; margin-bottom: 12px; background: #fcfdff; }
    .child-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; .badge { width: 22px; height: 22px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 11px; font-weight: 700; display: grid; place-items: center; } }
    .heads-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin: 4px 0 8px; }
    .heads { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0 10px; }
    .total { display: flex; justify-content: space-between; align-items: center; background: var(--blue-50); border-radius: 10px; padding: 12px 16px; margin: 8px 0;
      span { font-weight: 600; display: block; } small { color: var(--muted); font-size: 12px; } strong { font-size: 18px; } }
    @media (max-width: 800px) { .heads { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class NespComponent extends FormPageBase {
  readonly module: ModuleKey = 'nesp';
  readonly steps = workflowFor('nesp');
  readonly heads = HEADS;
  readonly kids = ['Ayesha Ahmed', 'Hamza Ahmed'];
  readonly monthsList = monthOptions(12);
  readonly year = new Date().getFullYear();
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    months: [[] as string[], Validators.required],
    children: this.fb.array([this.childGroup()]),
    documents: [[] as { name: string; size: number }[]],
    confirm: [false, Validators.requiredTrue],
  });

  get children(): FormArray<FormGroup> {
    return this.form.controls.children as FormArray<FormGroup>;
  }

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  readonly sums = computed(() => {
    const out: Record<string, number> = { fees: 0, transport: 0, books: 0, uniform: 0, annualFund: 0 };
    for (const c of (this.value().children ?? []) as Record<string, any>[]) for (const h of HEADS) out[h.key] += +c[h.key] || 0;
    return out;
  });
  readonly total = computed(() => Object.values(this.sums()).reduce((a, b) => a + b, 0));
  readonly breakdown = computed(() => HEADS.map(h => `${h.label} ${this.sums()[h.key].toLocaleString('en-US')}`).join(' · '));
  readonly needsDocs = computed(() => this.sums()['fees'] + this.sums()['books'] + this.sums()['uniform'] > 0);

  subtotal(i: number): number {
    const c = (this.value().children?.[i] ?? {}) as Record<string, any>;
    return HEADS.reduce((s, h) => s + (+c[h.key] || 0), 0);
  }

  addChild(): void {
    this.children.push(this.childGroup());
    this.form.markAsDirty();
  }

  removeChild(i: number): void {
    this.feedback.confirmDelete('child', `Child ${i + 1} and their claim amounts will be removed from this request.`).subscribe(ok => {
      if (!ok) return;
      this.children.removeAt(i);
      this.form.markAsDirty();
      this.feedback.toast('success', 'Child removed');
    });
  }

  protected override extraErrors(): string | null {
    if (this.total() <= 0) return 'Enter an amount under at least one head.';
    if (this.needsDocs() && !this.form.value.documents?.length) return 'Attach supporting documents for fees, books or uniform.';
    return null;
  }

  protected override restore(v: Record<string, any>): void {
    const kids = (v['children'] as Record<string, any>[]) ?? [];
    this.children.clear();
    kids.forEach(() => this.children.push(this.childGroup()));
    if (!kids.length) this.children.push(this.childGroup());
    this.form.patchValue(v);
  }

  protected payload(): RequestPayload {
    const v = this.form.getRawValue();
    const kids = (v.children ?? []) as Record<string, any>[];
    return {
      title: `NESP claim · ${kids.length} child${kids.length > 1 ? 'ren' : ''}`,
      amount: this.total(),
      details: [
        { label: 'Billing month(s)', value: (v.months ?? []).join(', ') || '—' },
        { label: 'Children', value: String(kids.length) },
        ...HEADS.map(h => ({ label: h.label, value: money(this.sums()[h.key]) })),
      ],
      attachments: v.documents ?? [],
      data: {
        lineItems: {
          columns: ['Child', 'School · City', 'Grade', ...HEADS.map(h => h.label)],
          rows: kids.map(c => [c['name'] ?? '', `${c['school']} · ${c['city']}`, c['grade'], ...HEADS.map(h => (+c[h.key] || 0).toLocaleString('en-US'))]),
        },
      },
    };
  }

  private childGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required], school: ['', Validators.required], city: ['', Validators.required], grade: ['', Validators.required],
      fees: [null as number | null, Validators.min(0)], transport: [null as number | null, Validators.min(0)], books: [null as number | null, Validators.min(0)],
      uniform: [null as number | null, Validators.min(0)], annualFund: [null as number | null, Validators.min(0)],
    });
  }
}
