import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { Attachment, ClaimRequest, DetailRow, ModuleKey, StepState } from './models';
import { CURRENT_EMPLOYEE, MOCK_CONFIG, nextId, seedRequests } from './mock-data';
import { moduleDef, workflowFor } from './modules';
import { NotificationService } from './notification.service';
import { storage } from './storage';

export interface RequestPayload {
  title: string;
  amount: number | null;
  details: DetailRow[];
  attachments: Attachment[];
  data: Record<string, any>;
}

export type Decision = 'approve' | 'sendBack' | 'reject';

const STORE_KEY = 'ess.requests.v1';

/**
 * Mock request store. Every method returns an Observable with simulated latency,
 * so swapping in HttpClient calls later doesn't change the components.
 */
@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly notifications = inject(NotificationService);
  private readonly store = signal<ClaimRequest[]>(storage.get(STORE_KEY, seedRequests()));

  readonly all = this.store.asReadonly();
  readonly mine = computed(() =>
    this.store()
      .filter(r => r.employee.code === CURRENT_EMPLOYEE.code)
      .sort((a, b) => (b.submittedOn ?? b.createdOn).localeCompare(a.submittedOn ?? a.createdOn)),
  );
  /** Requests waiting on an approver (any role, for the demo approver view). */
  readonly awaitingApproval = computed(() =>
    this.store().filter(r => {
      const step = currentStep(r);
      return !!step && !step.employeeStep && ['Pending', 'In Review'].includes(r.status);
    }),
  );

  get(id: string): ClaimRequest | undefined {
    return this.store().find(r => r.id === id);
  }

  submit(module: ModuleKey, payload: RequestPayload, draftId?: string): Observable<ClaimRequest> {
    const now = new Date().toISOString();
    const id = draftId ?? nextId(module, this.store());
    const flow = workflowFor(module, payload.data);
    const steps: StepState[] = flow.map((s, i) => ({ ...s, status: i === 0 ? 'current' : 'pending' }));
    const first = steps[0];
    const req: ClaimRequest = {
      id,
      module,
      ...payload,
      createdOn: now,
      submittedOn: now,
      status: first.employeeStep ? 'Action needed' : 'Pending',
      steps,
      history: [{ by: CURRENT_EMPLOYEE.name, role: 'Employee', action: 'submitted', date: now, remarks: payload.data['remarks'] || undefined }],
      employee: this.me(),
    };
    this.upsert(req);
    this.notifications.push({
      type: first.employeeStep ? 'action' : 'info',
      title: first.employeeStep ? `Upload the physician form for ${id}` : `${moduleDef(module).type} request submitted`,
      body: first.employeeStep ? 'Download the attending physician form, get it signed and upload it to continue.' : `${id} is now with ${first.assignee} (${first.role}).`,
      requestId: id,
    });
    return of(req).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  saveDraft(module: ModuleKey, payload: RequestPayload, draftId?: string): Observable<ClaimRequest> {
    const id = draftId ?? nextId(module, this.store());
    const existing = this.get(id);
    const req: ClaimRequest = {
      id,
      module,
      ...payload,
      createdOn: existing?.createdOn ?? new Date().toISOString(),
      submittedOn: null,
      status: 'Draft',
      steps: workflowFor(module, payload.data).map(s => ({ ...s, status: 'pending' })),
      history: [],
      employee: this.me(),
    };
    this.upsert(req);
    return of(req).pipe(delay(MOCK_CONFIG.latencyMs / 2));
  }

  /** IPD: the employee uploads the signed physician form, which hands the claim to Accounts. */
  completeEmployeeStep(id: string, files: Attachment[]): Observable<ClaimRequest> {
    const req = this.get(id)!;
    const now = new Date().toISOString();
    const steps = req.steps.map(s => ({ ...s }));
    const i = steps.findIndex(s => s.status === 'current');
    steps[i] = { ...steps[i], status: 'done', date: now };
    if (steps[i + 1]) steps[i + 1].status = 'current';
    const updated: ClaimRequest = {
      ...req,
      steps,
      status: 'Pending',
      attachments: [...req.attachments, ...files],
      history: [...req.history, { by: CURRENT_EMPLOYEE.name, role: 'Employee', action: 'uploaded the physician form', date: now }],
    };
    this.upsert(updated);
    this.notifications.push({ type: 'info', title: 'Claim sent to Accounts', body: `${id} is now with ${steps[i + 1]?.assignee} (${steps[i + 1]?.role}).`, requestId: id });
    return of(updated).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  decide(id: string, decision: Decision, remarks: string, values: Record<string, unknown> = {}, extra: Partial<ClaimRequest> = {}): Observable<ClaimRequest> {
    const req = this.get(id)!;
    const now = new Date().toISOString();
    const steps = req.steps.map(s => ({ ...s }));
    const i = steps.findIndex(s => s.status === 'current');
    const step = steps[i];
    let status = req.status;
    let action = '';
    if (decision === 'approve') {
      steps[i] = { ...step, status: 'done', date: now, values };
      if (steps[i + 1]) {
        steps[i + 1].status = 'current';
        status = 'In Review';
      } else {
        status = 'Approved';
      }
      action = 'approved';
    } else if (decision === 'reject') {
      steps[i] = { ...step, status: 'rejected', date: now };
      status = 'Rejected';
      action = 'rejected';
    } else {
      steps[i] = { ...step, status: 'returned', date: now };
      status = 'Sent back';
      action = 'sent back for changes';
    }
    const updated: ClaimRequest = {
      ...req,
      ...extra,
      steps,
      status,
      history: [...req.history, { by: step.assignee, role: step.role, action, date: now, remarks: remarks || undefined }],
    };
    this.upsert(updated);
    if (req.employee.code === CURRENT_EMPLOYEE.code) {
      const next = steps[i + 1];
      this.notifications.push({
        type: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'action',
        title: decision === 'approve'
          ? (next ? `${step.role} approved ${id}` : `${moduleDef(req.module).type} request approved`)
          : decision === 'reject' ? `${id} was rejected` : `${id} was sent back to you`,
        body: decision === 'approve'
          ? (next ? `It is now with ${next.assignee} (${next.role}).` : 'All approvals are complete.')
          : remarks || 'Open the request to see the remarks.',
        requestId: id,
      });
    }
    return of(updated).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  withdraw(id: string): Observable<ClaimRequest> {
    const req = this.get(id)!;
    const updated: ClaimRequest = {
      ...req,
      status: 'Withdrawn',
      steps: req.steps.map(s => (s.status === 'current' ? { ...s, status: 'pending' } : s)),
      history: [...req.history, { by: CURRENT_EMPLOYEE.name, role: 'Employee', action: 'withdrew the request', date: new Date().toISOString() }],
    };
    this.upsert(updated);
    return of(updated).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  /** A sent-back request goes back to the step that returned it. */
  resubmit(id: string): Observable<ClaimRequest> {
    const req = this.get(id)!;
    const steps = req.steps.map(s => (s.status === 'returned' ? { ...s, status: 'current' as const } : s));
    const updated: ClaimRequest = {
      ...req,
      steps,
      status: 'Pending',
      history: [...req.history, { by: CURRENT_EMPLOYEE.name, role: 'Employee', action: 'resubmitted', date: new Date().toISOString() }],
    };
    this.upsert(updated);
    return of(updated).pipe(delay(MOCK_CONFIG.latencyMs));
  }

  deleteDraft(id: string): void {
    this.store.update(list => list.filter(r => r.id !== id));
    this.persist();
  }

  /** Restores the sample data (handy while demoing). */
  resetDemoData(): void {
    this.store.set(seedRequests());
    this.persist();
  }

  private me(): ClaimRequest['employee'] {
    const { name, initials, code, department, designation } = CURRENT_EMPLOYEE;
    return { name, initials, code, department, designation };
  }

  private upsert(req: ClaimRequest): void {
    this.store.update(list => {
      const i = list.findIndex(r => r.id === req.id);
      if (i === -1) return [req, ...list];
      const copy = [...list];
      copy[i] = req;
      return copy;
    });
    this.persist();
  }

  private persist(): void {
    storage.set(STORE_KEY, this.store());
  }
}

export function currentStep(r: ClaimRequest): StepState | undefined {
  return r.steps.find(s => s.status === 'current');
}
