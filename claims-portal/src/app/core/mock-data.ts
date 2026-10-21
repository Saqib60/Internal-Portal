import { AppNotification, ClaimRequest, Employee, FamilyMember, HistoryEntry, ModuleKey, RequestStatus, StepState } from './models';
import { moduleDef, workflowFor } from './modules';

/** Mock configuration. Replace with real services when the backend is ready. */
export const MOCK_CONFIG = {
  /** Demo credentials accepted by the mock AuthService. */
  username: 'ahmed.raza',
  password: 'Password@123',
  maxAttempts: 5,
  /** Simulated Microsoft Authenticator approval delay. Set to 0 to never auto-approve (lets you see the timeout state). */
  mfaAutoApproveMs: 6000,
  /** How long a push request stays valid before it times out. */
  mfaTimeoutMs: 60000,
  /** Any 6-digit code works except this one, which simulates a wrong code. */
  mfaInvalidCode: '000000',
  /** Simulated network latency for mock calls. */
  latencyMs: 600,
};

export const CURRENT_EMPLOYEE: Employee = {
  name: 'Ahmed Raza',
  initials: 'AR',
  code: 'EMP-10482',
  department: 'Software Engineering',
  designation: 'Software Engineer',
  location: 'Lahore',
  grade: 'G-7',
  joined: '2019-03-03',
  email: 'ahmed.raza@netsoltech.com',
  username: 'ahmed.raza',
};

export const FAMILY: FamilyMember[] = [
  { name: 'Ahmed Raza', initials: 'AR', relation: 'Self', gender: 'Male', dob: '1990-06-12' },
  { name: 'Fatima Ahmed', initials: 'FA', relation: 'Spouse', gender: 'Female', dob: '1993-02-20' },
  { name: 'Ayesha Ahmed', initials: 'AA', relation: 'Daughter', gender: 'Female', dob: '2017-09-04' },
  { name: 'Hamza Ahmed', initials: 'HA', relation: 'Son', gender: 'Male', dob: '2020-01-15' },
  { name: 'Muhammad Raza', initials: 'MR', relation: 'Father', gender: 'Male', dob: '1958-11-02' },
  { name: 'Nasreen Raza', initials: 'NR', relation: 'Mother', gender: 'Female', dob: '1962-04-27' },
];

export const ENTITLEMENTS = {
  opdLimit: 100000,
  opdUsed: 42300,
  ipdPerAdmission: 600000,
  room: 'Semi-private',
  mobileLimit: 3500,
  mobileYearLimit: 42000,
  mobileUsed: 31500,
  fuelLimitLitres: 150,
  fuelUsedLitres: 58,
  childFeeLimit: 120000,
  childFeeUsed: 45000,
  pfBalance: 1245000,
  pfEmployee: 622500,
  pfCompany: 622500,
  stationeryMonthly: 10,
  stationeryUsed: 7,
};

const COLLEAGUES = {
  zainab: { name: 'Zainab Hussain', initials: 'ZH', code: 'EMP-10233', department: 'Quality Assurance', designation: 'QA Lead' },
  omar: { name: 'Omar Farooq', initials: 'OF', code: 'EMP-10611', department: 'Product Management', designation: 'Product Manager' },
  hina: { name: 'Hina Javed', initials: 'HJ', code: 'EMP-10377', department: 'Sales', designation: 'Account Manager' },
  ali: { name: 'Ali Hassan', initials: 'AH', code: 'EMP-10702', department: 'Human Resources', designation: 'HR Officer' },
};

const ME = {
  name: CURRENT_EMPLOYEE.name, initials: CURRENT_EMPLOYEE.initials, code: CURRENT_EMPLOYEE.code,
  department: CURRENT_EMPLOYEE.department, designation: CURRENT_EMPLOYEE.designation,
};

interface Seed {
  id: string;
  module: ModuleKey;
  title: string;
  amount: number | null;
  submitted: string | null;
  status: RequestStatus;
  /** Number of workflow steps already completed. */
  done: number;
  details: [string, string][];
  attachments?: [string, number][];
  data?: Record<string, any>;
  employee?: ClaimRequest['employee'];
  remarks?: string;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildSeed(s: Seed): ClaimRequest {
  const employee = s.employee ?? ME;
  const flow = workflowFor(s.module, s.data ?? {});
  const history: HistoryEntry[] = [];
  if (s.submitted) {
    history.push({ by: employee.name, role: 'Employee', action: 'submitted', date: s.submitted, remarks: s.remarks });
  }
  const steps: StepState[] = flow.map((step, i) => {
    let status: StepState['status'] = 'pending';
    let date: string | undefined;
    if (s.status === 'Draft') return { ...step, status };
    if (i < s.done) {
      status = 'done';
      date = addDays(s.submitted!, i + 1);
      history.push({ by: step.employeeStep ? employee.name : step.assignee, role: step.role, action: step.employeeStep ? 'uploaded the physician form' : 'approved', date, remarks: step.employeeStep ? undefined : 'Checked and forwarded.' });
    } else if (i === s.done) {
      if (s.status === 'Rejected') {
        status = 'rejected';
        date = addDays(s.submitted!, i + 1);
        history.push({ by: step.assignee, role: step.role, action: 'rejected', date, remarks: 'Outstanding advance from last quarter must be cleared first.' });
      } else if (!['Approved', 'Disbursed'].includes(s.status)) {
        status = 'current';
      }
    }
    return { ...step, status, date };
  });
  return {
    id: s.id,
    module: s.module,
    title: s.title,
    amount: s.amount,
    createdOn: s.submitted ?? '2026-10-16T09:00:00.000Z',
    submittedOn: s.submitted,
    status: s.status,
    steps,
    details: s.details.map(([label, value]) => ({ label, value })),
    attachments: (s.attachments ?? []).map(([name, size]) => ({ name, size })),
    history,
    employee,
    data: s.data ?? {},
  };
}

export function seedRequests(): ClaimRequest[] {
  const seeds: Seed[] = [
    {
      id: 'MED-2026-0142', module: 'medical', title: 'Medical claim · 3 family members', amount: 15500, submitted: '2026-10-14T05:42:00.000Z', status: 'In Review', done: 1,
      details: [['Treatment', 'Outpatient (OPD)'], ['Patients', 'Self, Father, Mother'], ['Billing month', 'Oct 2026'], ['Expected payout', 'October payroll']],
      attachments: [['prescription_14oct.pdf', 245760], ['pharmacy_receipt.jpg', 1153434]],
      data: {
        treatment: 'OPD',
        lineItems: {
          columns: ['Patient', 'Detail', 'Date', 'Receipt', 'Amount (PKR)'],
          rows: [
            ['Ahmed Raza (Self)', 'Diagnostic tests · Chughtai Lab', '08 Oct 2026', 'LB-11870', '3,200'],
            ['Ahmed Raza (Self)', 'Diagnostic tests · Chughtai Lab', '09 Oct 2026', 'LB-11902', '1,800'],
            ['Muhammad Raza (Father)', 'Doctor’s fee · Dr. Sana Malik', '10 Oct 2026', 'RC-55812', '3,000'],
            ['Muhammad Raza (Father)', 'Medicines · Fazal Din Pharma Plus', '10 Oct 2026', 'PH-90231', '4,650'],
            ['Nasreen Raza (Mother)', 'Medicines · Servaid Pharmacy', '12 Oct 2026', 'PH-90377', '2,850'],
          ],
        },
      },
    },
    {
      id: 'MOB-2026-0097', module: 'mobile', title: 'Mobile bill · Sep 2026', amount: 3500, submitted: '2026-10-05T07:10:00.000Z', status: 'Disbursed', done: 1,
      details: [['Billing month', 'Sep 2026'], ['Expenses', '2'], ['Paid with', 'October payroll']], attachments: [['jazz_bill_sep.pdf', 412000]],
    },
    {
      id: 'FUL-2026-0088', module: 'fuel', title: 'Fuel claim · Sep 2026', amount: 14825, submitted: '2026-10-02T06:00:00.000Z', status: 'Pending', done: 0,
      details: [['Claim month', 'Sep 2026'], ['Vehicle', 'Car · LEA-19-4471'], ['Official km', '106 km'], ['Fuel rate', 'PKR 265 / litre']],
      attachments: [['fuel_receipts_sep.pdf', 820000], ['trip_log_sep.xlsx', 48000]],
    },
    {
      id: 'STN-2026-0051', module: 'stationery', title: 'Stationery · 7 items', amount: null, submitted: '2026-09-30T08:30:00.000Z', status: 'Approved', done: 1,
      details: [['Company', 'NETSOL Technologies Limited'], ['Items', '4 lines · 7 units'], ['Large quantity', 'No']],
    },
    {
      id: 'CHF-2026-0023', module: 'child-fee', title: 'Child fee · Sep 2026', amount: 22500, submitted: '2026-09-22T09:00:00.000Z', status: 'Approved', done: 2,
      details: [['Billing month', 'Sep 2026'], ['Expenses', '2']], attachments: [['fee_challan_hamza.pdf', 330000]],
    },
    {
      id: 'COU-2026-0110', module: 'courier', title: 'Courier · 2 shipments', amount: 650, submitted: '2026-09-18T10:00:00.000Z', status: 'Approved', done: 2,
      details: [['Shipment type', 'Official'], ['Chargeable to', 'NETSOL Technologies Limited'], ['Shipments', '2']], data: { shipmentType: 'Official' },
    },
    {
      id: 'NSP-2026-0002', module: 'nesp', title: 'NESP claim · 2 children', amount: 12000, submitted: null, status: 'Draft', done: 0,
      details: [['Billing month(s)', 'Aug – Sep 2026'], ['Children', '2']],
    },
    {
      id: 'ADV-2026-0007', module: 'advance-salary', title: 'Advance salary', amount: 100000, submitted: '2026-08-02T06:00:00.000Z', status: 'Rejected', done: 0,
      details: [['Reason', 'House repair'], ['Recovery', '3 installments'], ['Required by', '15 Aug 2026']],
    },
    {
      id: 'PFL-2026-0004', module: 'pf-loan', title: 'PF loan · House renovation', amount: 500000, submitted: '2026-07-10T06:00:00.000Z', status: 'Disbursed', done: 3,
      details: [['On account of', 'Building / renovation of house'], ['Installments', '36 × PKR 13,889'], ['Company', 'NETSOL Technologies Limited']],
      attachments: [['renovation_quotation.pdf', 419840]],
    },
    {
      id: 'MOB-2026-0089', module: 'mobile', title: 'Mobile bill · Aug 2026', amount: 3500, submitted: '2026-09-04T06:00:00.000Z', status: 'Disbursed', done: 1,
      details: [['Billing month', 'Aug 2026'], ['Expenses', '1']],
    },
    {
      id: 'MED-2026-0118', module: 'medical', title: 'Medical claim · 1 family member', amount: 8200, submitted: '2026-09-02T06:00:00.000Z', status: 'Approved', done: 3,
      details: [['Treatment', 'Outpatient (OPD)'], ['Patients', 'Hamza Ahmed (Son)']], data: { treatment: 'OPD' },
    },
    {
      id: 'MOB-2026-0081', module: 'mobile', title: 'Mobile bill · Jul 2026', amount: 3200, submitted: '2026-08-05T06:00:00.000Z', status: 'Disbursed', done: 1,
      details: [['Billing month', 'Jul 2026'], ['Expenses', '2']],
    },
    // Colleagues' requests waiting in the approvals inbox
    {
      id: 'PFL-2026-0011', module: 'pf-loan', title: 'PF loan · House renovation', amount: 500000, submitted: '2026-10-14T06:00:00.000Z', status: 'In Review', done: 2,
      employee: COLLEAGUES.zainab, remarks: 'Loan for house renovation, quotation attached.',
      details: [['Loan required', 'PKR 500,000'], ['On account of', 'Building / renovation of house'], ['Number of installments', '36'], ['Installment amount', 'PKR 13,889'], ['Company', 'NETSOL Technologies Limited']],
      attachments: [['renovation_quotation.pdf', 419840], ['property_documents.pdf', 1887436]],
    },
    {
      id: 'MED-2026-0150', module: 'medical', title: 'Inpatient claim · Spouse', amount: 186500, submitted: '2026-10-15T06:00:00.000Z', status: 'Pending', done: 1,
      employee: COLLEAGUES.omar, data: { treatment: 'IPD' },
      details: [['Treatment', 'Inpatient (IPD)'], ['Patient', 'Spouse'], ['Hospital', 'Doctors Hospital, Lahore'], ['Admission', '03 – 06 Oct 2026']],
      attachments: [['hospital_bill_itemized.pdf', 2516582], ['discharge_summary.pdf', 1153434], ['physician_form_signed.pdf', 734003]],
    },
    {
      id: 'COU-2026-0114', module: 'courier', title: 'Courier · 1 shipment', amount: null, submitted: '2026-10-17T06:00:00.000Z', status: 'Pending', done: 0,
      employee: COLLEAGUES.hina, data: { shipmentType: 'Official' },
      details: [['Shipment type', 'Official'], ['Chargeable to', 'Client project · Orient Leasing'], ['Shipments', '1 · DHL International']],
    },
    {
      id: 'STN-2026-0056', module: 'stationery', title: 'Stationery · 12 items', amount: null, submitted: '2026-10-18T06:00:00.000Z', status: 'Pending', done: 0,
      employee: COLLEAGUES.ali,
      details: [['Company', 'NETSOL Technologies Limited'], ['Items', '3 lines · 12 units']],
      data: { items: [{ name: 'A4 paper ream', qty: 5, remarks: 'Onboarding packs' }, { name: 'Blue ball pens (box of 10)', qty: 4, remarks: '' }, { name: 'Spiral notebook', qty: 3, remarks: '' }] },
    },
    {
      id: 'FUL-2026-0091', module: 'fuel', title: 'Fuel claim · Sep 2026', amount: 9540, submitted: '2026-10-08T06:00:00.000Z', status: 'Pending', done: 0,
      employee: COLLEAGUES.hina,
      details: [['Claim month', 'Sep 2026'], ['Vehicle', 'Car · LEC-21-118'], ['Official km', '72 km']],
    },
  ];
  return seeds.map(buildSeed);
}

export function seedNotifications(): AppNotification[] {
  const now = new Date();
  const ago = (days: number, hours = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(d.getHours() - hours);
    return d.toISOString();
  };
  return [
    { id: 1, type: 'approved', title: 'Accounts Officer verified your medical claim', body: 'MED-2026-0142 is now with Rabia Noor (Senior Accounts Officer).', date: ago(0, 1), read: false, requestId: 'MED-2026-0142' },
    { id: 2, type: 'action', title: 'Fuel claim is waiting on Admin', body: 'FUL-2026-0088 has been with Imran Shah for 3 days.', date: ago(0, 4), read: false, requestId: 'FUL-2026-0088' },
    { id: 3, type: 'disbursed', title: 'Mobile reimbursement paid', body: 'PKR 3,500 for MOB-2026-0097 was added to your October payroll.', date: ago(1, 2), read: false, requestId: 'MOB-2026-0097' },
    { id: 4, type: 'info', title: 'Your NESP draft is still open', body: 'NSP-2026-0002 has not been submitted. Claims must be filed within 45 days.', date: ago(1, 6), read: true, requestId: 'NSP-2026-0002' },
    { id: 5, type: 'approved', title: 'Stationery request approved', body: 'Head of Admin issued 7 items for STN-2026-0051.', date: ago(3), read: true, requestId: 'STN-2026-0051' },
    { id: 6, type: 'approved', title: 'Child fee claim approved', body: 'CHF-2026-0023 was approved by Finance.', date: ago(5), read: true, requestId: 'CHF-2026-0023' },
    { id: 7, type: 'approved', title: 'Courier shipment dispatched', body: 'Admin booked the pickup for COU-2026-0110.', date: ago(9), read: true, requestId: 'COU-2026-0110' },
    { id: 8, type: 'disbursed', title: 'PF loan disbursed', body: 'PKR 500,000 for PFL-2026-0004 was transferred to your account.', date: ago(20), read: true, requestId: 'PFL-2026-0004' },
    { id: 9, type: 'rejected', title: 'Advance salary request rejected', body: 'HR rejected ADV-2026-0007. Open it to see the remarks.', date: ago(40), read: true, requestId: 'ADV-2026-0007' },
    { id: 10, type: 'info', title: 'Medical policy updated for 2026', body: 'OPD family pool is now PKR 100,000 per year.', date: ago(60), read: true },
  ];
}

export function nextId(module: ModuleKey, existing: ClaimRequest[]): string {
  const prefix = moduleDef(module).prefix;
  const year = new Date().getFullYear();
  const nums = existing.filter(r => r.id.startsWith(`${prefix}-${year}-`)).map(r => +r.id.split('-')[2]);
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}
