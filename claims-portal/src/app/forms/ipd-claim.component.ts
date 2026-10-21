import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RequestService } from '../core/request.service';
import { FeedbackService } from '../core/feedback.service';
import { Attachment } from '../core/models';
import { FileUploadComponent } from '../shared/file-upload.component';
import { ProgressTrackerComponent } from '../shared/progress-tracker.component';
import { FileSizePipe, PkrPipe } from '../shared/pipes';
import { PhysicianFormData, PhysicianPreviewComponent, downloadPhysicianPdf } from './physician-form';

/** IPD claim record: download the physician form, get it signed, upload it into the same claim. */
@Component({
  selector: 'app-ipd-claim',
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, FileUploadComponent, ProgressTrackerComponent, FileSizePipe, PkrPipe],
  template: `
    @if (request(); as r) {
      <div class="page">
        <div class="breadcrumb"><a routerLink="/dashboard">Home</a> / <a routerLink="/medical">Medical</a> / {{ r.id }}</div>
        <div class="page-header"><div><h1>Inpatient claim · {{ r.id }}</h1><p>{{ r.title }} · {{ r.amount | pkr: true }}</p></div></div>

        @if (waiting()) {
          <div class="banner"><mat-icon>check_circle</mat-icon><div><strong>Employee form submitted</strong>Next, download the attending physician form, get it completed by the treating doctor, and upload it here. Both forms stay together in this claim.</div><span class="ref">Reference {{ r.id }}</span></div>
        } @else {
          <div class="banner"><mat-icon>check_circle</mat-icon><div><strong>Physician form received</strong>Your claim is with Accounts. You can follow it from My Requests.</div><a mat-flat-button color="primary" [routerLink]="['/requests', r.id]">Track claim</a></div>
        }

        <div class="card track"><div class="card-title">Approval progress</div><app-progress-tracker [request]="r" /></div>

        <div class="form-layout">
          <div class="card">
            <div class="head">
              <div><div class="card-title">Attending physician form · EFU page 2</div><p class="muted small">This part must be completed by the treating physician or hospital. Missing information delays the claim.</p></div>
              @if (waiting()) { <span class="need">Action needed</span> } @else { <span class="ok">Uploaded</span> }
            </div>
            <div class="step">
              <span class="n">1</span>
              <div class="sb"><strong>Download and print</strong><small>Pre-filled with the patient’s name, policy number and admission dates.</small>
                <div class="btns">
                  <button mat-flat-button color="primary" (click)="download()" [disabled]="downloading()"><mat-icon>download</mat-icon>Download physician form (PDF)</button>
                  <button mat-stroked-button (click)="preview()"><mat-icon>print</mat-icon>Preview & print</button>
                </div>
              </div>
            </div>
            <div class="step">
              <span class="n">2</span>
              <div class="sb"><strong>Get it filled, signed and stamped</strong><small>Take the printed form to the treating physician. They fill in the diagnosis and procedure details, then sign and stamp it.</small></div>
            </div>
            <div class="step">
              <span class="n">3</span>
              <div class="sb"><strong>Upload the completed form</strong><small>A clear scan or PDF of every page.</small>
                @if (waiting()) {
                  <app-file-upload [formControl]="upload" [multiple]="false" hint="Signed and stamped form · PDF or JPG up to 5 MB" [invalid]="tried() && upload.invalid" />
                } @else {
                  <div class="done"><mat-icon>check_circle</mat-icon> Signed physician form is attached to {{ r.id }}.</div>
                }
              </div>
            </div>
            @if (waiting()) {
              <div class="form-footer">
                <span class="muted">{{ upload.value.length ? 'Ready to send to Accounts.' : 'Upload the completed physician form to submit your claim.' }}</span>
                <span class="spacer"></span>
                <a mat-button routerLink="/requests">Do this later</a>
                <button mat-flat-button color="primary" [disabled]="busy()" (click)="submit()">
                  @if (busy()) { <mat-spinner diameter="18" /> } @else { Submit claim }
                </button>
              </div>
            }
          </div>

          <aside class="side">
            <div class="card">
              <div class="card-title">Request details</div>
              @for (d of r.details.slice(0, 7); track d.label) { <div class="kv"><span>{{ d.label }}</span><span>{{ d.value }}</span></div> }
            </div>
            <div class="card">
              <div class="card-title">Claim record</div>
              <p class="muted small rec-intro">Everything for {{ r.id }} is kept together in one record.</p>
              <div class="rec"><mat-icon class="g">check_circle</mat-icon><div><strong>EFU claim form · employee section</strong><small>Submitted {{ r.submittedOn | date: 'dd MMM y' }}</small></div></div>
              <div class="rec"><mat-icon [class.g]="!waiting()" [class.a]="waiting()">{{ waiting() ? 'schedule' : 'check_circle' }}</mat-icon><div><strong>Attending physician form</strong><small>{{ waiting() ? 'Waiting for upload' : 'Uploaded' }}</small></div></div>
              @for (a of r.attachments; track a.name) {
                <div class="rec"><mat-icon fontSet="material-icons-outlined">description</mat-icon><div><strong>{{ a.name }}</strong><small>{{ a.size | fileSize }}</small></div></div>
              }
            </div>
          </aside>
        </div>
      </div>
    } @else {
      <div class="page"><div class="card"><h2>Claim not found</h2><a routerLink="/requests">Go to My Requests</a></div></div>
    }
  `,
  styles: [`
    .banner { display: flex; gap: 12px; align-items: center; background: var(--green-50); border: 1px solid #bfe8cf; color: #14532d; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; font-size: 13.5px;
      mat-icon { color: #16a34a; } div { flex: 1; } strong { display: block; } .ref { background: #fff; border-radius: 999px; padding: 4px 12px; font-weight: 600; font-size: 12.5px; } }
    .track { margin-bottom: 20px; }
    .head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; p { margin: -6px 0 8px; }
      .need { background: #fff1e6; color: #c2410c; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
      .ok { background: var(--green-50); color: var(--green); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; } }
    .step { display: flex; gap: 14px; padding: 16px 0; border-top: 1px solid var(--border); }
    .n { width: 28px; height: 28px; border-radius: 50%; background: var(--blue); color: #fff; font-weight: 700; font-size: 12.5px; display: grid; place-items: center; flex: none; }
    .sb { flex: 1; strong { display: block; } small { color: var(--muted); font-size: 12.5px; display: block; margin: 2px 0 10px; } }
    .btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .done { display: flex; gap: 6px; align-items: center; color: var(--green); font-size: 13px; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    .rec-intro { margin: -6px 0 10px; }
    .rec { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; font-size: 13px;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: var(--blue); } .g { color: #16a34a; } .a { color: var(--amber); }
      strong { display: block; font-weight: 500; word-break: break-all; } small { color: var(--muted); } }
  `],
})
export class IpdClaimComponent {
  readonly id = input.required<string>();
  private readonly requests = inject(RequestService);
  private readonly feedback = inject(FeedbackService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly request = computed(() => this.requests.get(this.id()));
  readonly waiting = computed(() => this.request()?.status === 'Action needed');
  readonly upload = new FormControl<Attachment[]>([], { nonNullable: true, validators: Validators.required });
  readonly busy = signal(false);
  readonly tried = signal(false);
  readonly downloading = signal(false);

  private formData(): PhysicianFormData {
    const r = this.request()!;
    return { ...(r.data['physician'] as PhysicianFormData), claimRef: r.id };
  }

  preview(): void {
    this.dialog.open(PhysicianPreviewComponent, { data: this.formData(), maxWidth: '96vw' });
  }

  async download(): Promise<void> {
    this.downloading.set(true);
    try {
      await downloadPhysicianPdf(this.formData());
      this.feedback.toast('success', 'Physician form downloaded', 'Print it and take it to the treating doctor.');
    } finally {
      this.downloading.set(false);
    }
  }

  submit(): void {
    this.tried.set(true);
    if (this.upload.invalid) {
      this.feedback.toast('error', 'Upload the signed physician form', 'Your claim can’t go to Accounts without it.');
      return;
    }
    const r = this.request()!;
    this.busy.set(true);
    this.requests.completeEmployeeStep(r.id, this.upload.value.map(f => ({ ...f, name: f.name }))).subscribe(updated => {
      this.busy.set(false);
      const next = updated.steps.find(s => s.status === 'current');
      this.feedback.popup({
        type: 'success', title: 'Claim submitted. You’re all set!',
        message: `Your claim ${r.id} is now with ${next?.assignee} (${next?.role}). We’ll notify you at each step, and you can track it anytime from My Requests.`,
        primary: 'Track my request', secondary: 'Back to dashboard',
      }).subscribe(track => this.router.navigate(track ? ['/requests', r.id] : ['/dashboard']));
    });
  }
}
