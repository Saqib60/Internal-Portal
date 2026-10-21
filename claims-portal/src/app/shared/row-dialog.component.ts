import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

export interface RowField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  options?: string[];
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  /** Takes the full width of the dialog grid. */
  wide?: boolean;
}

export interface RowDialogData {
  title: string;
  subtitle: string;
  icon?: string;
  mode: 'add' | 'edit';
  submitLabel: string;
  fields: RowField[];
  value?: Record<string, any>;
}

/**
 * Add / edit dialog for table rows (expenses, shipments, items, trips).
 * Closes with the row value, or undefined when cancelled.
 */
@Component({
  selector: 'app-row-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <header>
        <div class="tile"><mat-icon>{{ data.icon || (data.mode === 'add' ? 'add' : 'edit') }}</mat-icon></div>
        <div class="titles"><h2>{{ data.title }}</h2><p>{{ data.subtitle }}</p></div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Close"><mat-icon>close</mat-icon></button>
      </header>
      <div class="body">
        @for (f of data.fields; track f.key) {
          <div class="field" [class.wide]="f.wide || f.type === 'textarea'">
            <label>{{ f.label }} @if (f.required) {<span class="star">*</span>}</label>
            @switch (f.type) {
              @case ('select') {
                <mat-form-field>
                  <mat-select [formControlName]="f.key" [placeholder]="f.placeholder || 'Select'">
                    @for (o of f.options; track o) { <mat-option [value]="o">{{ o }}</mat-option> }
                  </mat-select>
                  <mat-error>{{ errorText(f) }}</mat-error>
                </mat-form-field>
              }
              @case ('date') {
                <mat-form-field>
                  <input matInput [matDatepicker]="dp" [formControlName]="f.key" placeholder="DD / MM / YYYY" />
                  <mat-datepicker-toggle matIconSuffix [for]="dp" />
                  <mat-datepicker #dp />
                  <mat-error>{{ errorText(f) }}</mat-error>
                </mat-form-field>
              }
              @case ('textarea') {
                <mat-form-field>
                  <textarea matInput rows="2" [formControlName]="f.key" [placeholder]="f.placeholder || ''"></textarea>
                  <mat-error>{{ errorText(f) }}</mat-error>
                </mat-form-field>
              }
              @default {
                <mat-form-field>
                  <span matTextPrefix class="prefix-text" [hidden]="!f.prefix">{{ f.prefix }}</span>
                  <input matInput [type]="f.type" [formControlName]="f.key" [placeholder]="f.placeholder || ''" />
                  <span matTextSuffix class="muted" [hidden]="!f.suffix">&nbsp;{{ f.suffix }}</span>
                  <mat-error>{{ errorText(f) }}</mat-error>
                </mat-form-field>
              }
            }
            @if (f.hint) { <small class="muted hint">{{ f.hint }}</small> }
          </div>
        }
      </div>
      <footer>
        <span class="muted small"><span class="star">*</span> Required fields</span>
        <span class="spacer"></span>
        <button mat-stroked-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit">{{ data.submitLabel }}</button>
      </footer>
    </form>
  `,
  styles: [`
    form { width: 560px; max-width: 100%; }
    header { display: flex; gap: 12px; align-items: flex-start; padding: 20px 16px 16px 20px; background: linear-gradient(180deg, #eef3fe, #fff); border-bottom: 1px solid var(--border);
      h2 { font-size: 17px; font-weight: 700; } p { margin: 4px 0 0; color: var(--muted); font-size: 12.5px; } .titles { flex: 1; } }
    .tile { width: 40px; height: 40px; border-radius: 10px; background: var(--blue); color: #fff; display: grid; place-items: center; flex: none; }
    .body { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; padding: 20px; }
    .wide { grid-column: span 2; }
    footer { display: flex; gap: 10px; align-items: center; padding: 14px 20px; background: #f8fafc; border-top: 1px solid var(--border); }
    @media (max-width: 600px) { .body { grid-template-columns: 1fr; } .wide { grid-column: auto; } }
  `],
})
export class RowDialogComponent implements OnInit {
  readonly data = inject<RowDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RowDialogComponent>);
  form = new FormGroup<Record<string, FormControl>>({});

  ngOnInit(): void {
    for (const f of this.data.fields) {
      const v: ValidatorFn[] = [];
      if (f.required) v.push(Validators.required);
      if (f.min !== undefined) v.push(Validators.min(f.min));
      if (f.max !== undefined) v.push(Validators.max(f.max));
      let value = this.data.value?.[f.key] ?? null;
      if (f.type === 'date' && value) value = new Date(value);
      this.form.addControl(f.key, new FormControl(value, v));
    }
  }

  errorText(f: RowField): string {
    const c = this.form.get(f.key);
    if (c?.hasError('min')) return `Must be at least ${f.min}`;
    if (c?.hasError('max')) return `Can’t be more than ${f.max}`;
    return `${f.label} is required`;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const out: Record<string, any> = { ...this.form.getRawValue() };
    for (const f of this.data.fields) {
      if (f.type === 'date' && out[f.key] instanceof Date) out[f.key] = (out[f.key] as Date).toISOString();
      if (f.type === 'number' && out[f.key] !== null) out[f.key] = +out[f.key];
    }
    this.ref.close(out);
  }
}

export function openRowDialog(dialog: MatDialog, data: RowDialogData): Observable<Record<string, any> | undefined> {
  return dialog.open(RowDialogComponent, { data, autoFocus: 'first-tabbable', maxWidth: '94vw', panelClass: 'row-dialog-panel' }).afterClosed();
}
