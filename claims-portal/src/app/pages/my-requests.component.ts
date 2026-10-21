import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { RequestService } from '../core/request.service';
import { FeedbackService } from '../core/feedback.service';
import { MODULE_GROUPS, MODULES, moduleDef } from '../core/modules';
import { ClaimRequest, ModuleKey } from '../core/models';
import { PkrPipe } from '../shared/pipes';
import { StatusChipComponent } from '../shared/status-chip.component';
import { RequestPanelComponent } from './request-panel.component';

type Tab = 'all' | 'pending' | 'approved' | 'rejected' | 'drafts';

const TAB_STATUSES: Record<Exclude<Tab, 'all'>, string[]> = {
  pending: ['Pending', 'In Review', 'Action needed', 'Sent back'],
  approved: ['Approved', 'Disbursed'],
  rejected: ['Rejected', 'Withdrawn'],
  drafts: ['Draft'],
};

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [
    DatePipe, RouterLink, MatButtonModule, MatIconModule, MatTableModule, MatPaginatorModule, MatSelectModule, MatFormFieldModule,
    MatMenuModule, MatButtonToggleModule, PkrPipe, StatusChipComponent, RequestPanelComponent,
  ],
  template: `
    <div class="page wide">
      <div class="breadcrumb"><a routerLink="/dashboard">Home</a> / My Requests</div>
      <div class="page-header">
        <div>
          <h1>My Requests</h1>
          <p>Track the status of every request you’ve submitted and see who it’s waiting on.</p>
        </div>
        <div class="actions">
          <button mat-stroked-button (click)="export()"><mat-icon>download</mat-icon>Export</button>
          <button mat-flat-button color="primary" class="split" [matMenuTriggerFor]="newMenu">
            New request <span class="div"></span><mat-icon iconPositionEnd>expand_more</mat-icon>
          </button>
        </div>
      </div>

      <div class="toolbar">
        <mat-button-toggle-group class="tabs" [value]="tab()" (change)="setTab($event.value)" hideSingleSelectionIndicator>
          @for (t of tabs; track t.key) {
            <mat-button-toggle [value]="t.key">{{ t.label }} <span class="cnt">{{ counts()[t.key] }}</span></mat-button-toggle>
          }
        </mat-button-toggle-group>
        <span class="spacer"></span>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter">
          <mat-select [value]="type()" (selectionChange)="type.set($event.value); pageIndex.set(0)">
            <mat-option value="all">All request types</mat-option>
            @for (m of modules; track m.key) { <mat-option [value]="m.key">{{ m.type }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter">
          <mat-select [value]="period()" (selectionChange)="period.set($event.value); pageIndex.set(0)">
            <mat-option [value]="30">Last 30 days</mat-option>
            <mat-option [value]="180">Last 6 months</mat-option>
            <mat-option [value]="365">Last 12 months</mat-option>
            <mat-option [value]="0">All time</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="layout" [class.with-panel]="selected()">
        <div class="card list">
          <div class="table-wrap">
            <table mat-table [dataSource]="page()">
              <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Request ID</th><td mat-cell *matCellDef="let r"><span class="id">{{ r.id }}</span></td></ng-container>
              <ng-container matColumnDef="type"><th mat-header-cell *matHeaderCellDef>Type</th><td mat-cell *matCellDef="let r" class="ellipsis">{{ typeOf(r.module) }}</td></ng-container>
              <ng-container matColumnDef="submitted"><th mat-header-cell *matHeaderCellDef>Submitted</th><td mat-cell *matCellDef="let r">{{ r.submittedOn ? (r.submittedOn | date: 'dd MMM y') : '—' }}</td></ng-container>
              <ng-container matColumnDef="amount"><th mat-header-cell *matHeaderCellDef class="right">Amount (in PKR)</th><td mat-cell *matCellDef="let r" class="right num">{{ r.amount | pkr }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let r"><app-status-chip [status]="r.status" /></td></ng-container>
              <ng-container matColumnDef="chev"><th mat-header-cell *matHeaderCellDef></th><td mat-cell *matCellDef="let r" class="chev"><mat-icon>chevron_right</mat-icon></td></ng-container>
              <tr mat-header-row *matHeaderRowDef="columns()"></tr>
              <tr mat-row *matRowDef="let r; columns: columns()" (click)="select(r)" [class.sel]="selected()?.id === r.id" tabindex="0" (keydown.enter)="select(r)"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td class="empty" [attr.colspan]="columns().length">
                  <mat-icon fontSet="material-icons-outlined">inbox</mat-icon>
                  <strong>No requests here</strong>
                  <span>Try another tab or filter, or start a new request.</span>
                </td>
              </tr>
            </table>
          </div>
          <mat-paginator [length]="filtered().length" [pageSize]="pageSize()" [pageIndex]="pageIndex()" [pageSizeOptions]="[5, 10, 25]"
                         showFirstLastButtons (page)="onPage($event)" aria-label="Select page of requests" />
        </div>
        @if (selected(); as s) {
          <app-request-panel [r]="s" (closed)="selectedId.set(null)" />
        }
      </div>
    </div>

    <mat-menu #newMenu="matMenu" class="wide-menu" xPosition="before">
      @for (g of groups; track g.name) {
        <div class="menu-group">{{ g.name }}</div>
        @for (m of g.items; track m.key) {
          <a mat-menu-item [routerLink]="m.route"><mat-icon fontSet="material-icons-outlined">{{ m.icon }}</mat-icon>{{ m.label }}</a>
        }
      }
    </mat-menu>
  `,
  styles: [`
    .page.wide { max-width: 1320px; }
    .split .div { display: inline-block; width: 1px; height: 18px; background: rgba(255,255,255,.4); margin: 0 4px 0 10px; vertical-align: middle; }
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter { width: 200px; }
    .layout { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
    .layout.with-panel { grid-template-columns: minmax(0, 1fr) 340px; }
    .list { padding: 14px 14px 4px; }
    .table-wrap { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    table { width: 100%; }
    .id { color: var(--blue); font-weight: 600; }
    .mat-column-id { width: 22%; } .mat-column-type { width: 24%; } .mat-column-submitted { width: 18%; } .mat-column-amount { width: 16%; padding-right: 32px !important; }
    .mat-column-chev { width: 40px; color: var(--muted); }
    .ellipsis { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    tr.mat-mdc-row { cursor: pointer; } tr.mat-mdc-row:hover { background: #f8fafc; } tr.sel { background: #eef3fe !important; }
    .empty { text-align: center; padding: 48px 16px; color: var(--muted);
      mat-icon { font-size: 36px; width: 36px; height: 36px; display: block; margin: 0 auto 8px; color: #b0b8c9; } strong { display: block; color: var(--text); } }
    @media (max-width: 1100px) { .layout.with-panel { grid-template-columns: 1fr; } }
  `],
})
export class MyRequestsComponent {
  private readonly requests = inject(RequestService);
  private readonly feedback = inject(FeedbackService);
  private readonly route = inject(ActivatedRoute);

  readonly modules = MODULES;
  readonly groups = MODULE_GROUPS.map(g => ({ name: g, items: MODULES.filter(m => m.group === g) }));
  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' }, { key: 'drafts', label: 'Drafts' },
  ];

  readonly tab = signal<Tab>('all');
  readonly type = signal<ModuleKey | 'all'>('all');
  readonly period = signal(180);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly selectedId = signal<string | null>(null);

  readonly selected = computed(() => (this.selectedId() ? this.requests.get(this.selectedId()!) ?? null : null));
  readonly columns = computed(() => (this.selected() ? ['id', 'type', 'amount', 'status', 'chev'] : ['id', 'type', 'submitted', 'amount', 'status', 'chev']));

  private readonly inPeriod = computed(() => {
    const days = this.period();
    const since = Date.now() - days * 86400000;
    return this.requests.mine().filter(r => {
      if (this.type() !== 'all' && r.module !== this.type()) return false;
      return !days || new Date(r.submittedOn ?? r.createdOn).getTime() >= since || r.status === 'Draft';
    });
  });

  readonly counts = computed(() => {
    const list = this.inPeriod();
    const c = { all: list.length } as Record<Tab, number>;
    (Object.keys(TAB_STATUSES) as Exclude<Tab, 'all'>[]).forEach(k => (c[k] = list.filter(r => TAB_STATUSES[k].includes(r.status)).length));
    return c;
  });

  readonly filtered = computed(() => {
    const t = this.tab();
    return t === 'all' ? this.inPeriod() : this.inPeriod().filter(r => TAB_STATUSES[t].includes(r.status));
  });

  readonly page = computed(() => this.filtered().slice(this.pageIndex() * this.pageSize(), (this.pageIndex() + 1) * this.pageSize()));

  constructor() {
    const id = this.route.snapshot.queryParamMap.get('open');
    if (id) this.selectedId.set(id);
    // Keep the page index valid when filters shrink the list.
    effect(() => {
      const max = Math.max(0, Math.ceil(this.filtered().length / this.pageSize()) - 1);
      if (this.pageIndex() > max) this.pageIndex.set(max);
    }, { allowSignalWrites: true });
  }

  typeOf(m: ModuleKey): string {
    return moduleDef(m).type;
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    this.pageIndex.set(0);
  }

  select(r: ClaimRequest): void {
    this.selectedId.set(this.selectedId() === r.id ? null : r.id);
  }

  onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  export(): void {
    const rows = [['Request ID', 'Type', 'Title', 'Submitted', 'Amount (PKR)', 'Status']].concat(
      this.filtered().map(r => [r.id, this.typeOf(r.module), r.title, r.submittedOn?.slice(0, 10) ?? '', r.amount?.toString() ?? '', r.status]),
    );
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-requests.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.feedback.toast('success', 'Export ready', `${this.filtered().length} requests downloaded as CSV.`);
  }
}
