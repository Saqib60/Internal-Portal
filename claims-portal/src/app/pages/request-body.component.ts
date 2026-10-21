import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClaimRequest } from '../core/models';
import { FileSizePipe } from '../shared/pipes';

/** Request details, line items, verification values, attachments and history. Used by the request page and the approver review. */
@Component({
  selector: 'app-request-body',
  standalone: true,
  imports: [DatePipe, MatIconModule, FileSizePipe],
  template: `
    <div class="card">
      <div class="head"><span class="card-title">Request details</span><span class="id">{{ r.id }}</span></div>
      <div class="grid">
        @for (d of r.details; track d.label) {
          <div class="cell"><small>{{ d.label }}</small><strong>{{ d.value }}</strong></div>
        }
      </div>
      @if (r.data['lineItems']; as li) {
        <table class="data-table">
          <thead><tr>@for (c of li.columns; track c) { <th>{{ c }}</th> }</tr></thead>
          <tbody>@for (row of li.rows; track $index) { <tr>@for (c of row; track $index) { <td>{{ c }}</td> }</tr> }</tbody>
        </table>
      }
      @if (r.attachments.length) {
        <div class="sub">Attachments</div>
        <div class="files">
          @for (a of r.attachments; track a.name) {
            <span class="file"><mat-icon fontSet="material-icons-outlined">description</mat-icon>{{ a.name }} <small>{{ a.size | fileSize }}</small></span>
          }
        </div>
      }
    </div>

    @for (s of verifiedSteps(); track s.role) {
      <div class="card">
        <div class="head"><span class="card-title">{{ s.role }} verification</span><span class="ok">Verified {{ s.date | date: 'dd MMM y' }}</span></div>
        <div class="grid">
          @for (f of s.fields; track f.key) {
            <div class="cell"><small>{{ f.label }}</small><strong>{{ show(s.values?.[f.key], f.type, f.prefix) }}</strong></div>
          }
        </div>
      </div>
    }

    <div class="card">
      <div class="card-title">History</div>
      @for (h of history(); track $index) {
        <div class="h">
          <span class="av">{{ initials(h.by) }}</span>
          <div class="hb">
            <div class="hl"><strong>{{ h.by }}</strong><span class="muted">{{ h.role }} · {{ h.action }}</span><span class="spacer"></span><small class="muted">{{ h.date | date: 'dd MMM y, h:mm a' }}</small></div>
            @if (h.remarks) { <div class="remark">{{ h.remarks }}</div> }
          </div>
        </div>
      } @empty { <p class="muted small">Nothing yet. History appears once the request is submitted.</p> }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 16px; }
    .head { display: flex; justify-content: space-between; align-items: baseline; .id { color: var(--blue); font-weight: 600; font-size: 13px; } .ok { color: var(--blue); font-size: 12.5px; font-weight: 600; } }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 20px; margin-bottom: 8px; }
    .cell { small { display: block; color: var(--muted); font-size: 12px; margin-bottom: 2px; } strong { font-size: 13.5px; font-weight: 600; } }
    .data-table { margin-top: 12px; }
    .sub { font-weight: 600; font-size: 13px; margin: 16px 0 8px; }
    .files { display: flex; flex-wrap: wrap; gap: 8px; }
    .file { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; font-size: 12.5px; font-weight: 500;
      mat-icon { color: var(--blue); font-size: 18px; width: 18px; height: 18px; } small { color: var(--muted); font-weight: 400; } }
    .h { display: flex; gap: 12px; margin-bottom: 14px; }
    .av { width: 30px; height: 30px; border-radius: 50%; background: #0f766e; color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700; flex: none; }
    .h:first-of-type .av { background: #f59e0b; }
    .hb { flex: 1; } .hl { display: flex; gap: 8px; align-items: baseline; font-size: 13px; flex-wrap: wrap; }
    .remark { background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; margin-top: 6px; font-size: 13px; color: var(--text-2); }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr 1fr; } }
  `],
})
export class RequestBodyComponent {
  @Input({ required: true }) r!: ClaimRequest;

  verifiedSteps() {
    return this.r.steps.filter(s => s.status === 'done' && s.fields?.length && s.values);
  }

  history() {
    return this.r.history;
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  show(v: unknown, type: string, prefix?: string): string {
    if (v === null || v === undefined || v === '') return '—';
    if (type === 'date') return new Date(v as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (type === 'number') return `${prefix ? prefix + ' ' : ''}${(+v).toLocaleString('en-US')}`;
    return String(v);
  }
}
