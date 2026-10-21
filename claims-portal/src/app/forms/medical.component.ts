import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { merge } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ENTITLEMENTS, FAMILY } from '../core/mock-data';
import { workflowFor } from '../core/modules';
import { ClaimRequest, FamilyMember, ModuleKey } from '../core/models';
import { RequestPayload } from '../core/request.service';
import { FormSectionComponent } from '../shared/form-section.component';
import { LockedFieldComponent } from '../shared/locked-field.component';
import { FileUploadComponent } from '../shared/file-upload.component';
import { WorkflowCardComponent } from '../shared/workflow-card.component';
import { openRowDialog, RowField } from '../shared/row-dialog.component';
import { PkrPipe } from '../shared/pipes';
import { FormFooterComponent, FormHeadComponent, FormPageBase, fmtDate, monthOptions, money } from './form-kit';
import { PhysicianFormData, PhysicianPreviewComponent } from './physician-form';

type Treatment = 'OPD' | 'IPD';

const POLICY_NO = 'EFU-GH-2026-0417';

function dischargeAfterAdmission(g: AbstractControl): ValidationErrors | null {
  const a = g.get('admission')?.value as Date | null;
  const d = g.get('discharge')?.value as Date | null;
  return a && d && new Date(d) < new Date(a) ? { dischargeBeforeAdmission: true } : null;
}

function ageOf(dob: string): number {
  const b = new Date(dob);
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age;
}

/** Medical claim: choose OPD or IPD first, then the matching form (EFU page 1 for IPD). */
@Component({
  selector: 'app-medical',
  standalone: true,
  imports: [
    ReactiveFormsModule, DatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule, MatCheckboxModule, MatButtonModule, MatIconModule,
    MatDatepickerModule, MatProgressBarModule, MatTooltipModule, FormSectionComponent, LockedFieldComponent, FileUploadComponent, WorkflowCardComponent,
    PkrPipe, FormHeadComponent, FormFooterComponent,
  ],
  templateUrl: './medical.component.html',
  styleUrl: './medical.component.scss',
})
export class MedicalComponent extends FormPageBase {
  readonly module: ModuleKey = 'medical';
  private readonly fb = inject(FormBuilder);

  readonly ent = ENTITLEMENTS;
  readonly family = FAMILY;
  readonly policyNo = POLICY_NO;
  readonly months = monthOptions();
  readonly banks = ['Habib Bank Limited', 'MCB Bank', 'United Bank Limited', 'Meezan Bank', 'Allied Bank', 'Bank Alfalah', 'Standard Chartered'];
  readonly treatment = signal<Treatment | null>(null);
  readonly opdSteps = workflowFor('medical', { treatment: 'OPD' });
  readonly ipdSteps = workflowFor('medical', { treatment: 'IPD' });

  // ---------------- OPD ----------------
  readonly opdForm = this.fb.group({
    extension: ['', [Validators.required, Validators.pattern(/^\d{3,5}$/)]],
    company: ['NetSol Technologies Ltd.', Validators.required],
    billingMonth: [this.months[0], Validators.required],
    expenses: [[] as Record<string, any>[], Validators.required],
    remarks: [''],
    confirm: [false, Validators.requiredTrue],
  });
  private readonly opdValue = toSignal(this.opdForm.valueChanges, { initialValue: this.opdForm.value });
  readonly expenseGroups = computed(() => {
    const list = this.opdValue().expenses ?? [];
    return FAMILY.map(m => {
      const items = list.map((e, index) => ({ e, index })).filter(x => x.e['patient'] === m.name);
      return { member: m, items, total: items.reduce((s, x) => s + (+x.e['amount'] || 0), 0) };
    }).filter(g => g.items.length);
  });
  readonly opdTotal = computed(() => (this.opdValue().expenses ?? []).reduce((s, e) => s + (+e['amount'] || 0), 0));
  readonly opdLeft = ENTITLEMENTS.opdLimit - ENTITLEMENTS.opdUsed;
  readonly flash = signal(-1);

  private readonly expenseFields: RowField[] = [
    { key: 'patient', label: 'Patient', type: 'select', required: true, options: FAMILY.map(f => f.name) },
    { key: 'detail', label: 'Detail', type: 'select', required: true, options: ['Doctor’s fee', 'Diagnostic tests', 'Medicines'] },
    { key: 'provider', label: 'Doctor, lab or pharmacy', type: 'text', required: true, wide: true, placeholder: 'e.g. Chughtai Lab · CBC & lipid profile' },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'receipt', label: 'Receipt no.', type: 'text', required: true, placeholder: 'e.g. LB-11870' },
    { key: 'amount', label: 'Amount', type: 'number', prefix: 'PKR', required: true, min: 1 },
  ];

  // ---------------- IPD ----------------
  readonly ipdForm = this.fb.group({
    policy: this.fb.group({
      cnic: ['', [Validators.required, Validators.pattern(/^\d{5}-\d{7}-\d$/)]],
      mobile: ['', [Validators.required, Validators.pattern(/^03\d{2}-?\d{7}$/)]],
    }),
    patient: this.fb.group({ name: ['', Validators.required] }),
    hosp: this.fb.group({
      emergency: ['', Validators.required],
      preAuth: ['', Validators.required],
      preAuthRef: [''],
      hospital: ['', Validators.required],
      admission: [null as Date | null, Validators.required],
      discharge: [null as Date | null, Validators.required],
      otherBenefit: ['', Validators.required],
      otherBenefitDetail: [''],
    }, { validators: dischargeAfterAdmission }),
    newborn: this.fb.group({
      deliveryMode: ['', Validators.required],
      deliveryDate: [null as Date | null, Validators.required],
      babyName: ['', Validators.required],
      gender: ['', Validators.required],
      weight: [null as number | null, [Validators.required, Validators.min(0.3), Validators.max(7)]],
      nicu: ['', Validators.required],
    }),
    bills: this.fb.group({
      total: [null as number | null, [Validators.required, Validators.min(1)]],
      hospitalBills: [[] as { name: string; size: number }[], Validators.required],
      discharge: [[] as { name: string; size: number }[], Validators.required],
    }),
    bank: this.fb.group({
      title: [this.me.name, Validators.required],
      bank: ['', Validators.required],
      iban: ['', [Validators.required, Validators.pattern(/^PK\d{2}[A-Z]{4}\d{16}$/)]],
    }),
    declaration: [false, Validators.requiredTrue],
  });
  readonly showNewborn = signal(false);
  private readonly ipdTick = toSignal(merge(this.ipdForm.valueChanges, this.ipdForm.statusChanges), { initialValue: null });
  readonly patient = computed<FamilyMember | undefined>(() => {
    this.ipdTick();
    return FAMILY.find(f => f.name === this.ipdForm.controls.patient.value.name);
  });
  /** "15 of 17 required fields complete" on the locked physician-form card. */
  readonly requiredProgress = computed(() => {
    this.ipdTick();
    this.showNewborn();
    const controls = this.requiredIpdControls();
    return { done: controls.filter(c => c.valid).length, total: controls.length };
  });
  readonly ipdComplete = computed(() => {
    this.ipdTick();
    const p = this.requiredProgress();
    return p.done === p.total && this.ipdForm.valid;
  });

  get form(): FormGroup {
    return this.treatment() === 'IPD' ? this.ipdForm : this.opdForm;
  }

  constructor() {
    super();
    // Conditional fields: pre-authorization reference and other-benefit detail.
    const h = this.ipdForm.controls.hosp.controls;
    h.preAuth.valueChanges.subscribe(v => { h.preAuthRef.setValidators(v === 'Yes' ? Validators.required : null); h.preAuthRef.updateValueAndValidity(); });
    h.otherBenefit.valueChanges.subscribe(v => { h.otherBenefitDetail.setValidators(v === 'Yes' ? Validators.required : null); h.otherBenefitDetail.updateValueAndValidity(); });
    this.ipdForm.controls.newborn.disable();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    const t = this.route.snapshot.queryParamMap.get('type');
    if (!this.treatment() && (t === 'OPD' || t === 'IPD')) this.treatment.set(t);
  }

  chooseTreatment(t: Treatment): void {
    if (this.treatment() === t) return;
    const current = this.treatment();
    if (current && this.form.dirty) {
      this.feedback.popup({
        type: 'warning', title: `Switch to ${t === 'OPD' ? 'Outpatient' : 'Inpatient'}?`,
        message: `A claim can’t mix OPD and IPD. What you’ve entered for ${current} stays in this form until you leave the page, but won’t be submitted.`,
        primary: 'Switch', secondary: 'Stay on ' + current,
      }).subscribe(ok => ok && this.treatment.set(t));
      return;
    }
    this.treatment.set(t);
  }

  // ---------- OPD expenses ----------
  addExpense(): void {
    openRowDialog(this.dialog, {
      title: 'Add expense', subtitle: 'One bill or receipt for any covered family member.', icon: 'medical_services', mode: 'add',
      submitLabel: 'Add expense', fields: this.expenseFields,
    }).subscribe(v => {
      if (!v) return;
      const list = [...(this.opdForm.value.expenses ?? []), v];
      this.setExpenses(list);
      this.highlight(list.length - 1);
      this.feedback.toast('success', 'Expense added', `Claim total is now PKR ${this.opdTotal().toLocaleString('en-US')}.`);
    });
  }

  editExpense(i: number): void {
    openRowDialog(this.dialog, {
      title: 'Edit expense', subtitle: 'Update the details and save your changes.', icon: 'edit', mode: 'edit', submitLabel: 'Save changes',
      fields: this.expenseFields, value: this.opdForm.value.expenses?.[i],
    }).subscribe(v => {
      if (!v) return;
      this.setExpenses((this.opdForm.value.expenses ?? []).map((e, j) => (j === i ? v : e)));
      this.highlight(i);
      this.feedback.toast('success', 'Expense updated');
    });
  }

  removeExpense(i: number): void {
    this.feedback.confirmDelete('expense', 'It will be removed from this claim and the total will update.').subscribe(ok => {
      if (!ok) return;
      this.setExpenses((this.opdForm.value.expenses ?? []).filter((_, j) => j !== i));
      this.feedback.toast('success', 'Expense removed');
    });
  }

  private setExpenses(list: Record<string, any>[]): void {
    this.opdForm.controls.expenses.setValue(list);
    this.opdForm.markAsDirty();
  }

  private highlight(i: number): void {
    this.flash.set(i);
    setTimeout(() => this.flash.set(-1), 2500);
  }

  // ---------- IPD ----------
  toggleNewborn(on: boolean): void {
    this.showNewborn.set(on);
    const g = this.ipdForm.controls.newborn;
    if (on) g.enable();
    else { g.reset(); g.disable(); }
  }

  physicianData(ref = 'Assigned when you submit'): PhysicianFormData {
    const v = this.ipdForm.getRawValue();
    const p = this.patient();
    return {
      claimRef: ref,
      policyNo: POLICY_NO,
      employeeName: this.me.name,
      employeeCode: this.me.code,
      patientName: p?.name ?? '',
      relation: p?.relation ?? '',
      age: p ? String(ageOf(p.dob)) : '',
      gender: p?.gender ?? '',
      hospital: v.hosp.hospital ?? '',
      admission: fmtDate(v.hosp.admission),
      discharge: fmtDate(v.hosp.discharge),
      treatment: v.hosp.emergency ?? '',
      preAuth: v.hosp.preAuth === 'Yes' ? `Yes (${v.hosp.preAuthRef})` : 'No',
    };
  }

  previewPhysicianForm(): void {
    this.dialog.open(PhysicianPreviewComponent, { data: this.physicianData(), maxWidth: '96vw', panelClass: 'pdf-panel' });
  }

  ageText(p: FamilyMember | undefined): string {
    return p ? `${ageOf(p.dob)} years` : '—';
  }

  private requiredIpdControls(): AbstractControl[] {
    const f = this.ipdForm.controls;
    const h = f.hosp.controls;
    const list: AbstractControl[] = [
      f.policy.controls.cnic, f.policy.controls.mobile, f.patient.controls.name,
      h.emergency, h.preAuth, h.hospital, h.admission, h.discharge, h.otherBenefit,
      f.bills.controls.total, f.bills.controls.hospitalBills, f.bills.controls.discharge,
      f.bank.controls.title, f.bank.controls.bank, f.bank.controls.iban, f.declaration,
    ];
    if (h.preAuth.value === 'Yes') list.push(h.preAuthRef);
    if (h.otherBenefit.value === 'Yes') list.push(h.otherBenefitDetail);
    if (this.showNewborn()) list.push(...Object.values(f.newborn.controls));
    return list;
  }

  protected override extraErrors(): string | null {
    if (!this.treatment()) return 'Choose Outpatient or Inpatient first.';
    if (this.treatment() === 'IPD' && this.ipdForm.controls.hosp.hasError('dischargeBeforeAdmission')) return 'The discharge date can’t be before the admission date.';
    return null;
  }

  protected override restore(v: Record<string, any>): void {
    const t = v['treatment'] as Treatment | undefined;
    if (!t) return;
    this.treatment.set(t);
    if (t === 'OPD') this.opdForm.patchValue(v);
    else {
      if (v['newborn']?.deliveryMode) this.toggleNewborn(true);
      const toDate = (x: unknown) => (x ? new Date(x as string) : null);
      this.ipdForm.patchValue({
        ...v,
        hosp: { ...v['hosp'], admission: toDate(v['hosp']?.admission), discharge: toDate(v['hosp']?.discharge) },
        newborn: { ...v['newborn'], deliveryDate: toDate(v['newborn']?.deliveryDate) },
      });
    }
  }

  protected override draftValue(): Record<string, any> {
    return { ...this.form.getRawValue(), treatment: this.treatment() };
  }

  override saveDraft(): void {
    if (!this.treatment()) {
      this.feedback.toast('warning', 'Choose a treatment type first', 'Pick Outpatient or Inpatient, then save your draft.');
      return;
    }
    super.saveDraft();
  }

  protected payload(): RequestPayload {
    return this.treatment() === 'IPD' ? this.ipdPayload() : this.opdPayload();
  }

  private opdPayload(): RequestPayload {
    const v = this.opdForm.getRawValue();
    const list = v.expenses ?? [];
    const groups = this.expenseGroups();
    const patients = groups.map(g => (g.member.relation === 'Self' ? 'Self' : g.member.relation)).join(', ');
    return {
      title: `Medical claim · ${groups.length} family member${groups.length === 1 ? '' : 's'}`,
      amount: this.opdTotal(),
      details: [
        { label: 'Treatment', value: 'Outpatient (OPD)' },
        { label: 'Patients', value: patients || '—' },
        { label: 'Billing month', value: v.billingMonth ?? '' },
        { label: 'Company', value: v.company ?? '' },
        { label: 'Extension', value: v.extension ?? '' },
        { label: 'Expenses', value: String(list.length) },
      ],
      attachments: [],
      data: {
        treatment: 'OPD', remarks: v.remarks,
        lineItems: {
          columns: ['Patient', 'Detail', 'Date', 'Receipt', 'Amount (PKR)'],
          rows: list.map(e => {
            const m = FAMILY.find(f => f.name === e['patient']);
            return [`${e['patient']} (${m?.relation})`, `${e['detail']} · ${e['provider']}`, fmtDate(e['date']), e['receipt'], (+e['amount']).toLocaleString('en-US')];
          }),
        },
      },
    };
  }

  private ipdPayload(): RequestPayload {
    const v = this.ipdForm.getRawValue();
    const p = this.patient();
    const details = [
      { label: 'Treatment', value: `Inpatient (IPD) · ${v.hosp.emergency}` },
      { label: 'Patient', value: p ? `${p.name} (${p.relation})` : '—' },
      { label: 'Hospital', value: v.hosp.hospital ?? '' },
      { label: 'Admission', value: `${fmtDate(v.hosp.admission)} – ${fmtDate(v.hosp.discharge)}` },
      { label: 'Pre-authorization', value: v.hosp.preAuth === 'Yes' ? `Yes · ${v.hosp.preAuthRef}` : 'No' },
      { label: 'Policy number', value: POLICY_NO },
      { label: 'Amount claimed', value: money(v.bills.total) },
      { label: 'Paid to', value: `${v.bank.bank} · ${(v.bank.iban ?? "").slice(0, 4)}…${(v.bank.iban ?? "").slice(-4)}` },
    ];
    if (this.showNewborn()) details.push({ label: 'Newborn', value: `${v.newborn.babyName} · ${v.newborn.deliveryMode} · ${v.newborn.weight} kg` });
    return {
      title: `Inpatient claim · ${p?.relation ?? ''}`,
      amount: v.bills.total,
      details,
      attachments: [...(v.bills.hospitalBills ?? []), ...(v.bills.discharge ?? [])],
      data: { treatment: 'IPD', physician: this.physicianData() },
    };
  }

  protected override afterSubmit(req: ClaimRequest): void {
    if (this.treatment() !== 'IPD') return super.afterSubmit(req);
    this.feedback.popup({
      type: 'success', title: 'Employee form submitted',
      message: `Your claim reference is ${req.id}. Next, download the attending physician form, get it signed and stamped by the treating doctor, and upload it to this claim.`,
      primary: 'Continue to physician form',
    }).subscribe(() => this.router.navigate(['/medical/ipd', req.id]));
  }
}
