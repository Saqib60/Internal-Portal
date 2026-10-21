import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../core/auth.service';
import { RequestService } from '../core/request.service';
import { ENTITLEMENTS } from '../core/mock-data';
import { moduleDef } from '../core/modules';
import { ClaimRequest, ModuleKey } from '../core/models';
import { PkrPipe } from '../shared/pipes';
import { StatusChipComponent } from '../shared/status-chip.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule, PkrPipe, StatusChipComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ greeting }}, {{ firstName }}</h1>
          <p>Submit a new request or track the ones already in progress.</p>
        </div>
        <div class="actions"><a mat-stroked-button routerLink="/requests">View all requests</a></div>
      </div>

      <div class="stats">
        <div class="card stat">
          <span class="lbl">Pending requests</span>
          <strong>{{ pending().length }}</strong>
          <small class="amber">{{ awaiting() }} awaiting approval</small>
        </div>
        <div class="card stat">
          <span class="lbl">Approved in {{ year }}</span>
          <strong>{{ approvedTotal() | pkr: true }}</strong>
          <small class="green">{{ approvedCount() }} requests approved</small>
        </div>
        <div class="card stat">
          <span class="lbl">OPD medical balance</span>
          <strong>{{ ent.opdLimit - ent.opdUsed | pkr: true }}</strong>
          <mat-progress-bar mode="determinate" [value]="((ent.opdLimit - ent.opdUsed) / ent.opdLimit) * 100" />
          <small>of {{ ent.opdLimit | pkr: true }} annual limit</small>
        </div>
        <div class="card stat">
          <span class="lbl">Provident fund balance</span>
          <strong>{{ ent.pfBalance | pkr: true }}</strong>
          <small>As of 30 Sep {{ year }}</small>
        </div>
      </div>

      <h2 class="h2">Submit a new request</h2>
      <p class="muted sub">Choose a form to get started. Drafts are saved automatically.</p>
      <div class="tiles">
        @for (t of tiles; track t.title) {
          <a class="card tile" [routerLink]="t.route">
            <span class="ic"><mat-icon fontSet="material-icons-outlined">{{ t.icon }}</mat-icon></span>
            <strong>{{ t.title }}</strong>
            <small>{{ t.description }}</small>
          </a>
        }
      </div>

      <div class="bottom">
        <div class="card">
          <div class="row-head"><span class="card-title">Recent requests</span><a routerLink="/requests">View all →</a></div>
          <div class="table-wrap">
            <table mat-table [dataSource]="recent()">
              <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Request ID</th><td mat-cell *matCellDef="let r"><a class="id">{{ r.id }}</a></td></ng-container>
              <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let r">{{ type(r.module) }}</td></ng-container>
              <ng-container matColumnDef="submitted"><th mat-header-cell *matHeaderCellDef>Submitted</th><td mat-cell *matCellDef="let r">{{ r.submittedOn ? (r.submittedOn | date: 'dd MMM y') : '—' }}</td></ng-container>
              <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef class="right">Amount (in PKR)</th><td mat-cell *matCellDef="let r" class="right num">{{ r.amount | pkr }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let r"><app-status-chip [status]="r.status" /></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let r; columns: cols" (click)="open(r)" class="clickable"></tr>
            </table>
          </div>
        </div>
        <div class="card ent">
          <div class="card-title">Entitlements · {{ year }}</div>
          @for (e of entitlements; track e.label) {
            <div class="ent-row"><span>{{ e.label }}</span><small>{{ e.text }}</small></div>
            <mat-progress-bar mode="determinate" [value]="e.pct" [class.amber-bar]="e.pct > 70" />
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .stat { display: flex; flex-direction: column; gap: 8px;
      .lbl { color: var(--text-2); font-size: 13px; } strong { font-size: 24px; font-weight: 700; letter-spacing: -.01em; }
      small { font-size: 12px; color: var(--muted); } .amber { color: var(--amber); } .green { color: var(--green); }
      mat-progress-bar { border-radius: 4px; --mdc-linear-progress-track-height: 6px; --mdc-linear-progress-active-indicator-height: 6px; } }
    .h2 { font-size: 18px; font-weight: 600; } .sub { margin: 4px 0 16px; font-size: 13px; }
    .tiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 24px; }
    .tile { display: flex; flex-direction: column; gap: 6px; color: var(--text); text-decoration: none; transition: all .15s; min-height: 120px;
      &:hover { border-color: var(--blue); box-shadow: 0 6px 20px rgba(31,79,216,.08); text-decoration: none; transform: translateY(-1px); }
      .ic { width: 38px; height: 38px; border-radius: 9px; background: var(--blue-50); color: var(--blue); display: grid; place-items: center; margin-bottom: 12px;
        mat-icon { font-size: 20px; width: 20px; height: 20px; } }
      strong { font-size: 15px; font-weight: 600; } small { color: var(--muted); font-size: 12.5px; line-height: 1.4; } }
    .bottom { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: start; }
    .row-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; a { font-size: 13px; font-weight: 600; } }
    .table-wrap { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .id { font-weight: 600; }
    .clickable { cursor: pointer; } .clickable:hover { background: #f8fafc; }
    .ent-row { display: flex; justify-content: space-between; margin: 14px 0 8px; font-size: 13.5px; font-weight: 500; small { color: var(--muted); font-size: 12px; } }
    .ent mat-progress-bar { border-radius: 4px; --mdc-linear-progress-track-height: 6px; --mdc-linear-progress-active-indicator-height: 6px; }
    .amber-bar { --mdc-linear-progress-active-indicator-color: #f59e0b; }
    @media (max-width: 1200px) { .tiles { grid-template-columns: repeat(3, 1fr); } .stats { grid-template-columns: repeat(2, 1fr); } .bottom { grid-template-columns: 1fr; } }
    @media (max-width: 700px) { .tiles, .stats { grid-template-columns: 1fr; } }
  `],
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly requests = inject(RequestService);
  private readonly router = inject(Router);

  readonly ent = ENTITLEMENTS;
  readonly year = new Date().getFullYear();
  readonly firstName = (this.auth.user()?.name ?? '').split(' ')[0];
  readonly greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();
  readonly cols = ['id', 'type', 'submitted', 'amount', 'status'];

  readonly pending = computed(() => this.requests.mine().filter(r => ['Pending', 'In Review', 'Action needed', 'Sent back'].includes(r.status)));
  readonly awaiting = computed(() => this.pending().filter(r => r.status !== 'Action needed' && r.status !== 'Sent back').length);
  private readonly approved = computed(() => this.requests.mine().filter(r => ['Approved', 'Disbursed'].includes(r.status)));
  readonly approvedCount = computed(() => this.approved().length);
  readonly approvedTotal = computed(() => this.approved().reduce((s, r) => s + (r.amount ?? 0), 0));
  readonly recent = computed(() => this.requests.mine().filter(r => r.status !== 'Draft').slice(0, 5));

  readonly tiles = [
    tile('medical'),
    { title: 'Track my requests', description: 'See status and who it’s waiting on', icon: 'receipt_long', route: '/requests' },
    tile('pf-loan'), tile('fuel'), tile('advance-salary'), tile('child-fee'), tile('courier'), tile('mobile'), tile('stationery'), tile('nesp'),
  ];

  readonly entitlements = [
    { label: 'Medical (OPD)', text: `PKR ${fmt(ENTITLEMENTS.opdUsed)} / PKR ${fmt(ENTITLEMENTS.opdLimit)}`, pct: (ENTITLEMENTS.opdUsed / ENTITLEMENTS.opdLimit) * 100 },
    { label: 'Mobile', text: `PKR ${fmt(ENTITLEMENTS.mobileUsed)} / PKR ${fmt(ENTITLEMENTS.mobileYearLimit)}`, pct: (ENTITLEMENTS.mobileUsed / ENTITLEMENTS.mobileYearLimit) * 100 },
    { label: 'Fuel (this month)', text: `${ENTITLEMENTS.fuelUsedLitres} L / ${ENTITLEMENTS.fuelLimitLitres} L`, pct: (ENTITLEMENTS.fuelUsedLitres / ENTITLEMENTS.fuelLimitLitres) * 100 },
    { label: 'Child fee — Hamza', text: `PKR ${fmt(ENTITLEMENTS.childFeeUsed)} / PKR ${fmt(ENTITLEMENTS.childFeeLimit)}`, pct: (ENTITLEMENTS.childFeeUsed / ENTITLEMENTS.childFeeLimit) * 100 },
  ];

  type(m: ModuleKey): string {
    return moduleDef(m).type;
  }

  open(r: ClaimRequest): void {
    this.router.navigate(['/requests', r.id]);
  }
}

function tile(key: ModuleKey) {
  const m = moduleDef(key);
  const title = key === 'stationery' ? 'Stationery' : m.label;
  return { title, description: m.description, icon: m.icon, route: m.route };
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}
