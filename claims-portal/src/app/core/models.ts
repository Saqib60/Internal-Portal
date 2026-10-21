export type ModuleKey =
  | 'medical' | 'pf-loan' | 'advance-salary' | 'fuel' | 'mobile'
  | 'child-fee' | 'nesp' | 'courier' | 'stationery';

export type ModuleGroup = 'Reimbursements' | 'Loans & advances' | 'Requests';

export type RequestStatus =
  | 'Draft' | 'Pending' | 'In Review' | 'Action needed'
  | 'Approved' | 'Disbursed' | 'Rejected' | 'Sent back' | 'Withdrawn';

export interface ModuleDef {
  key: ModuleKey;
  label: string;        // sidebar / card title
  type: string;         // short type shown in tables
  prefix: string;       // request id prefix
  icon: string;         // material icon name
  group: ModuleGroup;
  description: string;
  route: string;
}

export interface StepField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
  prefix?: string;
}

export interface WorkflowStep {
  role: string;
  assignee: string;
  note: string;
  approveLabel?: string;
  fields?: StepField[];
  /** Employee steps (e.g. IPD physician form upload) are completed by the requester, not an approver. */
  employeeStep?: boolean;
}

export type StepStatus = 'done' | 'current' | 'pending' | 'rejected' | 'returned';

export interface StepState extends WorkflowStep {
  status: StepStatus;
  date?: string;
  values?: Record<string, unknown>;
}

export interface HistoryEntry {
  by: string;
  role: string;
  action: string;
  date: string;
  remarks?: string;
}

export interface Attachment {
  name: string;
  size: number; // bytes
}

export interface DetailRow {
  label: string;
  value: string;
}

export interface Employee {
  name: string;
  initials: string;
  code: string;
  department: string;
  designation: string;
  location: string;
  grade: string;
  joined: string;
  email: string;
  username: string;
}

export interface ClaimRequest {
  id: string;
  module: ModuleKey;
  title: string;
  amount: number | null;
  createdOn: string;
  submittedOn: string | null;
  status: RequestStatus;
  steps: StepState[];
  details: DetailRow[];
  attachments: Attachment[];
  history: HistoryEntry[];
  employee: Pick<Employee, 'name' | 'initials' | 'code' | 'department' | 'designation'>;
  /** Raw form value, kept so drafts can be reopened and approvers can see line items. */
  data: Record<string, any>;
}

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'danger';

export interface AppNotification {
  id: number;
  type: 'approved' | 'action' | 'info' | 'rejected' | 'disbursed';
  title: string;
  body: string;
  date: string;
  read: boolean;
  requestId?: string;
}

export interface FamilyMember {
  name: string;
  initials: string;
  relation: 'Self' | 'Spouse' | 'Son' | 'Daughter' | 'Father' | 'Mother';
  gender: 'Male' | 'Female';
  dob: string;
}
