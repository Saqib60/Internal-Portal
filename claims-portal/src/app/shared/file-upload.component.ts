import { Component, Input, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Attachment } from '../core/models';
import { FileSizePipe } from './pipes';

/** Drag-and-drop upload bound to a FormControl<Attachment[]>. Files stay in the browser (mock backend). */
@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, FileSizePipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FileUploadComponent), multi: true }],
  template: `
    @if (label) { <label class="lbl">{{ label }} @if (required) {<span class="star">*</span>}</label> }
    @for (f of files(); track f.name) {
      <div class="file">
        <mat-icon class="doc">description</mat-icon>
        <span class="name">{{ f.name }}</span>
        <span class="size">{{ f.size | fileSize }}</span>
        <button mat-icon-button class="icon-btn-sm" type="button" (click)="remove(f)" [disabled]="disabled" aria-label="Remove file"><mat-icon>close</mat-icon></button>
      </div>
    }
    @if (multiple || !files().length) {
      <div class="drop" [class.over]="over()" [class.invalid]="showError" (dragover)="$event.preventDefault(); over.set(true)"
           (dragleave)="over.set(false)" (drop)="onDrop($event)" (click)="input.click()" role="button" tabindex="0" (keydown.enter)="input.click()">
        <mat-icon>upload</mat-icon>
        <div><a>Click to upload</a> or drag and drop</div>
        <small>{{ hint }}</small>
      </div>
    }
    @if (showError) { <div class="err">Please attach at least one file.</div> }
    @if (note) { <small class="note">{{ note }}</small> }
    <input #input type="file" hidden [multiple]="multiple" [accept]="accept" (change)="onPick(input)" />
  `,
  styles: [`
    :host { display: block; margin-bottom: 16px; }
    .lbl { display: block; font-size: 12.5px; font-weight: 500; color: var(--text-2); margin-bottom: 6px; }
    .drop { border: 1.5px dashed var(--border-strong); border-radius: 10px; padding: 18px; text-align: center; cursor: pointer; background: #fbfcfe;
      font-size: 13px; color: var(--text-2); transition: all .15s;
      mat-icon { color: var(--blue); } small { display: block; color: var(--muted); font-size: 11.5px; margin-top: 4px; } a { font-weight: 600; } }
    .drop.over, .drop:hover { border-color: var(--blue); background: var(--blue-50); }
    .drop.invalid { border-color: var(--red); }
    .file { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 8px; padding: 6px 6px 6px 12px; margin-bottom: 8px; font-size: 13px; }
    .doc { color: var(--blue); font-size: 20px; width: 20px; height: 20px; }
    .name { flex: 1; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .size { color: var(--muted); font-size: 12px; }
    .err { color: var(--red); font-size: 11.5px; margin-top: 4px; }
    .note { display: block; color: var(--muted); font-size: 11.5px; margin-top: 6px; }
  `],
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() hint = 'PDF, JPG or PNG up to 5 MB';
  @Input() note = '';
  @Input() required = false;
  @Input() multiple = true;
  @Input() accept = '.pdf,.jpg,.jpeg,.png,.xlsx';
  @Input() invalid = false;

  readonly files = signal<Attachment[]>([]);
  readonly over = signal(false);
  disabled = false;
  private touched = false;
  private onChange: (v: Attachment[]) => void = () => {};
  private onTouched: () => void = () => {};

  get showError(): boolean {
    return this.invalid && this.files().length === 0;
  }

  writeValue(v: Attachment[] | null): void { this.files.set(v ?? []); }
  registerOnChange(fn: (v: Attachment[]) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled = d; }

  onPick(input: HTMLInputElement): void {
    this.add(Array.from(input.files ?? []));
    input.value = '';
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.over.set(false);
    this.add(Array.from(e.dataTransfer?.files ?? []));
  }

  remove(f: Attachment): void {
    this.files.update(list => list.filter(x => x !== f));
    this.emit();
  }

  private add(list: File[]): void {
    if (!list.length || this.disabled) return;
    const mapped = list.map(f => ({ name: f.name, size: f.size }));
    this.files.update(cur => (this.multiple ? [...cur, ...mapped] : mapped.slice(0, 1)));
    this.emit();
  }

  private emit(): void {
    this.onChange(this.files());
    if (!this.touched) {
      this.touched = true;
      this.onTouched();
    }
  }
}
