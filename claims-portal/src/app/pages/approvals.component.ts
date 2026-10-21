import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { RequestService, currentStep } from '../core/request.service';
import { moduleDef } from '../core/modules';
import { ClaimRequest } from '../core/models';
import { PkrPipe } from '../shared/pipes';
import { StatusChipComponent } from '../shared/status-chip.component';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [DatePipe, RouterLink, MatTableModule, MatIconModule, MatButtonToggleModule, PkrPipe, StatusChipComponent],
  template: `
    <div class="page">
      <div class="breadcrumb"><a routerLink="/dashboard">Home</a> / Approvals</div>
      <div class="page-header">
        <div>
          <h1>Approvals</h1>
          <p>Requests waiting on an approver. Open one to review it and approve, send back or reject.</p>
        </div>
      </div>
      <div class="note"><mat-icon>info</mat-icon> Demo approver view: you can act as any approver role so you can walk each flow end to end.</div>
      <mat-button-toggle-group class="tabs" [value]="tab()" (change)="tab.set($event.value)" hideSingleSelectionIndicator>
        <mat-button-toggle value="waiting">Awaiting action ({{ requests.awaitingApproval().length }})</mat-button-toggle>
        <mat-button-toggle value="done">Recently decided</mat-button-toggle>
      </mat-button-toggle-group>
      <div class="card list">
        <table mat-table [dataSource]="rows()">
          <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Request ID</th><td mat-cell *matCellDef="let r"><span class="id">{{ r.id }}</span></td></ng-container>
          <ng-container matColumnDef="employee"><th mat-header-cell *matHeaderCellDef>Employee</th><td mat-cell *matCellDef="let r"><strong>{{ r.employee.name }}</strong><div class="muted small">{{ r.employee.department }}</div></td></ng-container>
          <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let r">{{ type(r) }}</td></ng-container>
          <ng-container matColumnDef="step"><th mat-header-cell *matHeaderCellDef>Waiting on</th><td mat-cell *matCellDef="let r">{{ stepOf(r) }}</td></ng-container>
          <ng-container matColumnDef="submitted"><th mat-header-cell *matHeaderCellDef>Submitted</th><td mat-cell *matCellDef="let r">{{ r.submittedOn | date: 'dd MMM y' }}</td></ng-container>
          <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef class="right">Amount (in PKR)</th><td mat-cell *matCellDef="let r" class="right num">{{ r.amount | pkr }}</td></ng-container>
          <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let r"><app-status-chip [status]="r.status" /></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let r; columns: cols" (click)="open(r)"></tr>
          <tr class="mat-row" *matNoDataRow><td class="empty" [attr.colspan]="cols.length"><mat-icon>task_alt</mat-icon><strong>Nothing waiting</strong><span>You’re all caught up.</span></td></tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .note { display: flex; gap: 8px; align-items: center; background: var(--blue-50); color: #1b3a8f; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; mat-icon { font-size: 18px; width: 18px; height: 18px; } }
    .tabs { margin-bottom: 16px; }
    .list { padding: 0; overflow: hidden; } table { width: 100%; }
    .id { color: var(--blue); font-weight: 600; }
    tr.mat-mdc-row { cursor: pointer; } tr.mat-mdc-row:hover { background: #f8fafc; }
    .empty { text-align: center; padding: 48px; color: var(--muted); mat-icon { display: block; margin: 0 auto 8px; color: var(--green); } strong { display: block; color: var(--text); } }
  `],
})
export class ApprovalsComponent {
  readonly requests = inject(RequestService);
  private readonly router = inject(Router);
  readonly tab = signal<'waiting' | 'done'>('waiting');
  readonly cols = ['id', 'employee', 'type', 'step', 'submitted', 'amount', 'status'];
  readonly rows = computed(() =>
    this.tab() === 'waiting'
      ? this.requests.awaitingApproval()
      : this.requests.all().filter(r => ['Approved', 'Disbursed', 'Rejected', 'Sent back'].includes(r.status)).slice(0, 15),
  );

  type(r: ClaimRequest): string {
    return moduleDef(r.module).type;
  }

  stepOf(r: ClaimRequest): string {
    const s = currentStep(r);
    return s ? s.role : '—';
  }

  open(r: ClaimRequest): void {
    this.router.navigate(['/approvals', r.id]);
  }
}
