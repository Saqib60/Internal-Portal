import { Component, Directive, EventEmitter, Input, OnInit, Output, forwardRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ControlValueAccessor, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClaimRequest, ModuleKey } from '../core/models';
import { CURRENT_EMPLOYEE } from '../core/mock-data';
import { RequestPayload, RequestService } from '../core/request.service';
import { FeedbackService } from '../core/feedback.service';
import { moduleDef } from '../core/modules';
import { RowField, openRowDialog } from '../shared/row-dialog.component';
import { PkrPipe } from '../shared/pipes';

/**
 * Shared behaviour for every request form: drafts (?draft=ID), validation,
 * submit with the success popup, save as draft, and cancel with the leave warning.
 */
@Directive()
export abstract class FormPageBase implements OnInit {
  protected readonly requests = inject(RequestService);
  protected readonly feedback = inject(FeedbackService);
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly dialog = inject(MatDialog);

  abstract readonly module: ModuleKey;
  abstract readonly form: FormGroup;
  readonly me = CURRENT_EMPLOYEE;
  readonly today = new Date();
  readonly submitting = signal(false);
  /** Set after the first submit attempt so custom controls can show their errors. */
  readonly attempted = signal(false);
  protected draftId?: string;

  /** Build the request record from the form. */
  protected abstract payload(): RequestPayload;

  /** Extra checks beyond form validity. Return a message to block submission. */
  protected extraErrors(): string | null {
    return null;
  }

  /** Restore a saved draft. Override when the form has FormArrays. */
  protected restore(value: Record<string, any>): void {
    this.form.patchValue(value);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('draft');
    const draft = id ? this.requests.get(id) : undefined;
    if (draft && draft.status === 'Draft' && draft.module === this.module) {
      this.draftId = draft.id;
      if (draft.data['form']) this.restore(draft.data['form']);
      this.feedback.toast('info', 'Draft restored', `You’re continuing ${draft.id}.`);
    }
  }

  submit(): void {
    this.attempted.set(true);
    const extra = this.extraErrors();
    if (this.form.invalid || extra) {
      this.form.markAllAsTouched();
      this.feedback.toast('error', 'Some required fields are missing', extra ?? 'Fields marked * need to be filled in before you submit.');
      setTimeout(() => document.querySelector('.ng-invalid.mat-mdc-form-field, .mat-form-field-invalid, .invalid-block')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    this.submitting.set(true);
    this.requests.submit(this.module, this.withForm(this.payload()), this.draftId).subscribe({
      next: req => {
        this.submitting.set(false);
        this.form.markAsPristine();
        this.afterSubmit(req);
      },
      error: () => {
        this.submitting.set(false);
        this.feedback.popup({
          type: 'error', title: 'We couldn’t submit your request',
          message: 'Something went wrong on our side. Your draft is safe, so please try again in a moment.',
          primary: 'Try again', secondary: 'Close',
        }).subscribe(again => again && this.submit());
      },
    });
  }

  protected afterSubmit(req: ClaimRequest): void {
    const first = req.steps[0];
    this.feedback.popup({
      type: 'success', title: 'Request submitted. You’re all set!',
      message: `Your ${moduleDef(this.module).type.toLowerCase()} request ${req.id} is now with ${first.assignee} (${first.role}). We’ll notify you at each step, and you can track it anytime from My Requests.`,
      primary: 'Track my request', secondary: 'Back to dashboard',
    }).subscribe(track => this.router.navigate(track ? ['/requests', req.id] : ['/dashboard']));
  }

  saveDraft(): void {
    this.requests.saveDraft(this.module, this.withForm(this.payload()), this.draftId).subscribe(req => {
      this.draftId = req.id;
      this.form.markAsPristine();
      this.feedback.toast('success', 'Draft saved', `${req.id} is in My Requests under Drafts.`);
    });
  }

  cancel(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.feedback.confirmLeave().subscribe(leave => leave && this.router.navigate(['/dashboard']));
  }

  viewPolicy(): void {
    this.feedback.popup({
      type: 'info', title: 'Good to know before you submit',
      message: `Claims must be submitted with original receipts within the policy deadline. The full ${moduleDef(this.module).type} policy is on the HR intranet, or call the HR helpdesk at ext. 2200.`,
      primary: 'Got it',
    }).subscribe();
  }

  /** What gets stored with a draft so the form can be restored later. */
  protected draftValue(): Record<string, any> {
    return this.form.getRawValue();
  }

  private withForm(p: RequestPayload): RequestPayload {
    return { ...p, data: { ...p.data, form: this.draftValue() } };
  }
}

@Component({
  selector: 'app-form-head',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="breadcrumb"><a routerLink="/dashboard">Home</a> / {{ group }} / {{ crumb || title }}</div>
    <div class="page-header">
      <div><h1>{{ title }}</h1><p>{{ description }}</p></div>
      <div class="actions"><button mat-stroked-button type="button" (click)="policy.emit()">View policy</button></div>
    </div>
  `,
})
export class FormHeadComponent {
  @Input() group = '';
  @Input() title = '';
  @Input() crumb = '';
  @Input() description = '';
  @Output() policy = new EventEmitter<void>();
}

@Component({
  selector: 'app-form-footer',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="form-footer">
      <span class="muted">{{ note }}</span>
      <span class="spacer"></span>
      <button mat-button type="button" (click)="cancel.emit()">Cancel</button>
      @if (showDraft) { <button mat-stroked-button type="button" (click)="draft.emit()">Save as draft</button> }
      <span [matTooltip]="disabledReason" [matTooltipDisabled]="!disabled">
        <button mat-flat-button color="primary" type="button" (click)="submit.emit()" [disabled]="busy || disabled">
          @if (busy) { <mat-spinner diameter="18" /> } @else { {{ submitLabel }} }
        </button>
      </span>
    </div>
  `,
})
export class FormFooterComponent {
  @Input() busy = false;
  @Input() disabled = false;
  @Input() disabledReason = '';
  @Input() showDraft = true;
  @Input() submitLabel = 'Submit request';
  @Input() note = 'Your progress is saved when you choose Save as draft.';
  @Output() cancel = new EventEmitter<void>();
  @Output() draft = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
}

export interface LineColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'amount' | 'number' | 'static';
  /** Shown in smaller text under the value. */
  sub?: string;
  suffix?: string;
  /** For type 'static': fixed cell text (e.g. "By Admin"). */
  text?: string;
  width?: string;
}

/**
 * Table with Add / Edit / Delete through dialogs (MatDialog), bound to a FormControl<any[]>.
 * Used for expenses, trips, shipments and stationery items.
 */
@Component({
  selector: 'app-line-table',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTooltipModule, PkrPipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => LineTableComponent), multi: true }],
  template: `
    <table class="data-table" [class.invalid-block]="showError">
      <thead>
        <tr>
          @if (numbered) { <th style="width:56px">Sr. no</th> }
          @for (c of columns; track c.key) { <th [class.right]="c.type === 'amount' || c.type === 'number'" [style.width]="c.width">{{ c.label }}</th> }
          <th class="actions-cell"></th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track i; let i = $index) {
          <tr [class.highlight]="i === flash()">
            @if (numbered) { <td>{{ i + 1 }}</td> }
            @for (c of columns; track c.key) {
              <td [class.right]="c.type === 'amount' || c.type === 'number'" [class.num]="c.type === 'amount' || c.type === 'number'">
                @switch (c.type) {
                  @case ('date') { {{ row[c.key] | date: 'dd MMM y' }} }
                  @case ('amount') { {{ row[c.key] | pkr }} }
                  @case ('static') { <span class="muted">{{ c.text }}</span> }
                  @default { {{ row[c.key] ?? '—' }}{{ c.suffix && row[c.key] !== null && row[c.key] !== undefined ? ' ' + c.suffix : '' }} }
                }
                @if (c.sub && row[c.sub]) { <div class="sub">{{ row[c.sub] }}</div> }
              </td>
            }
            <td class="actions-cell">
              <button mat-icon-button class="icon-btn-sm" type="button" (click)="edit(i)" [disabled]="disabled" matTooltip="Edit" [attr.aria-label]="'Edit ' + noun"><mat-icon fontSet="material-icons-outlined">edit</mat-icon></button>
              <button mat-icon-button class="icon-btn-sm" type="button" (click)="remove(i)" [disabled]="disabled" matTooltip="Delete" [attr.aria-label]="'Delete ' + noun"><mat-icon fontSet="material-icons-outlined">delete</mat-icon></button>
            </td>
          </tr>
        } @empty {
          <tr><td [attr.colspan]="columns.length + (numbered ? 2 : 1)" class="empty">No {{ noun }}s added yet.</td></tr>
        }
        <tr><td [attr.colspan]="columns.length + (numbered ? 2 : 1)">
          <button class="add-link" type="button" (click)="add()" [disabled]="disabled"><span class="material-icons">add</span> Add {{ noun }}</button>
        </td></tr>
      </tbody>
      @if (totalKey) {
        <tfoot><tr>
          <td [attr.colspan]="totalSpan">Total</td>
          <td class="right num">{{ total() | pkr }}</td>
          @if (trailingCols > 0) { <td [attr.colspan]="trailingCols"></td> }
        </tr></tfoot>
      }
    </table>
    @if (showError) { <div class="err">Add at least one {{ noun }}.</div> }
  `,
  styles: [`
    :host { display: block; margin-bottom: 8px; }
    .empty { text-align: center; color: var(--muted); padding: 18px !important; }
    .invalid-block { border-color: var(--red) !important; }
    .err { color: var(--red); font-size: 11.5px; margin-top: 6px; }
    .add-link .material-icons { font-size: 18px; }
  `],
})
export class LineTableComponent implements ControlValueAccessor {
  @Input() columns: LineColumn[] = [];
  @Input() fields: RowField[] = [];
  @Input() noun = 'item';
  @Input() dialogIcon = '';
  @Input() addSubtitle = '';
  @Input() numbered = false;
  @Input() totalKey = '';
  @Input() invalid = false;

  readonly rows = signal<Record<string, any>[]>([]);
  readonly flash = signal(-1);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(FeedbackService);
  disabled = false;
  private onChange: (v: Record<string, any>[]) => void = () => {};
  private onTouched: () => void = () => {};

  get showError(): boolean {
    return this.invalid && !this.rows().length;
  }

  get totalSpan(): number {
    return this.columns.findIndex(c => c.key === this.totalKey) + (this.numbered ? 1 : 0);
  }

  get trailingCols(): number {
    return this.columns.length - this.columns.findIndex(c => c.key === this.totalKey) - 1 + 1;
  }

  total(): number {
    return this.rows().reduce((s, r) => s + (+r[this.totalKey] || 0), 0);
  }

  writeValue(v: Record<string, any>[] | null): void { this.rows.set(v ?? []); }
  registerOnChange(fn: (v: Record<string, any>[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  add(): void {
    openRowDialog(this.dialog, {
      title: `Add ${this.noun}`, subtitle: this.addSubtitle, icon: this.dialogIcon || 'add', mode: 'add', submitLabel: `Add ${this.noun}`, fields: this.fields,
    }).subscribe(v => {
      if (!v) return;
      this.set([...this.rows(), v]);
      this.highlight(this.rows().length - 1);
      this.feedback.toast('success', `${cap(this.noun)} added`, this.totalKey ? `Total is now PKR ${this.total().toLocaleString('en-US')}.` : undefined);
    });
  }

  edit(i: number): void {
    openRowDialog(this.dialog, {
      title: `Edit ${this.noun}`, subtitle: 'Update the details and save your changes.', icon: 'edit', mode: 'edit', submitLabel: 'Save changes', fields: this.fields, value: this.rows()[i],
    }).subscribe(v => {
      if (!v) return;
      this.set(this.rows().map((r, j) => (j === i ? v : r)));
      this.highlight(i);
      this.feedback.toast('success', `${cap(this.noun)} updated`);
    });
  }

  remove(i: number): void {
    this.feedback.confirmDelete(this.noun, `This ${this.noun} will be removed from your request${this.totalKey ? ' and the total will update' : ''}. You can add it again later.`).subscribe(ok => {
      if (!ok) return;
      this.set(this.rows().filter((_, j) => j !== i));
      this.feedback.toast('success', `${cap(this.noun)} removed`);
    });
  }

  private set(v: Record<string, any>[]): void {
    this.rows.set(v);
    this.onChange(v);
    this.onTouched();
  }

  private highlight(i: number): void {
    this.flash.set(i);
    setTimeout(() => this.flash.set(-1), 2500);
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthOptions(count = 6): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function money(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : `PKR ${Math.round(n).toLocaleString('en-US')}`;
}
