import { ModuleDef, ModuleGroup, ModuleKey, WorkflowStep } from './models';

export const MODULES: ModuleDef[] = [
  { key: 'medical', label: 'Medical (OPD / IPD)', type: 'Medical', prefix: 'MED', icon: 'favorite_border', group: 'Reimbursements', description: 'One claim for you, spouse, children & parents', route: '/medical' },
  { key: 'fuel', label: 'Fuel', type: 'Fuel', prefix: 'FUL', icon: 'local_gas_station', group: 'Reimbursements', description: 'Official travel mileage claims', route: '/fuel' },
  { key: 'mobile', label: 'Mobile', type: 'Mobile', prefix: 'MOB', icon: 'smartphone', group: 'Reimbursements', description: 'Monthly mobile bill reimbursement', route: '/mobile' },
  { key: 'child-fee', label: 'Child Fee', type: 'Child Fee', prefix: 'CHF', icon: 'school', group: 'Reimbursements', description: 'School tuition fee reimbursement', route: '/child-fee' },
  { key: 'nesp', label: 'NESP', type: 'NESP', prefix: 'NSP', icon: 'workspace_premium', group: 'Reimbursements', description: 'NESP reimbursement claims', route: '/nesp' },
  { key: 'pf-loan', label: 'PF Loan', type: 'PF Loan', prefix: 'PFL', icon: 'account_balance', group: 'Loans & advances', description: 'Borrow against your provident fund', route: '/pf-loan' },
  { key: 'advance-salary', label: 'Advance Salary', type: 'Advance Salary', prefix: 'ADV', icon: 'account_balance_wallet', group: 'Loans & advances', description: 'Salary advance, recovered in installments', route: '/advance-salary' },
  { key: 'courier', label: 'Courier Approval', type: 'Courier Approval', prefix: 'COU', icon: 'inventory_2', group: 'Requests', description: 'Send documents or parcels officially', route: '/courier' },
  { key: 'stationery', label: 'Stationery Request', type: 'Stationery', prefix: 'STN', icon: 'edit', group: 'Requests', description: 'Order supplies from the admin store', route: '/stationery' },
];

export const MODULE_GROUPS: ModuleGroup[] = ['Reimbursements', 'Loans & advances', 'Requests'];

export function moduleDef(key: ModuleKey): ModuleDef {
  return MODULES.find(m => m.key === key)!;
}

const MEDICAL_FINANCE: WorkflowStep[] = [
  {
    role: 'Accounts Officer', assignee: 'Bilal Ahmed', note: 'Receives and checks against limits', approveLabel: 'Verify & forward',
    fields: [
      { key: 'receivedOn', label: 'Received on', type: 'date', required: true },
      { key: 'availableLimit', label: 'Available limit', type: 'number', prefix: 'PKR', required: true },
      { key: 'currentBill', label: 'Current bill', type: 'number', prefix: 'PKR', required: true },
      { key: 'balanceLimit', label: 'Balance limit', type: 'number', prefix: 'PKR', required: true },
      { key: 'amountToBePaid', label: 'Amount to be paid', type: 'number', prefix: 'PKR', required: true },
    ],
  },
  { role: 'Senior Accounts Officer', assignee: 'Rabia Noor', note: 'Verifies the claim', approveLabel: 'Verify claim' },
  { role: 'Manager Finance & Accounts', assignee: 'Usman Tariq', note: 'Approves payment', approveLabel: 'Approve payment' },
];

/**
 * Approval chains per module. There is no line-manager approval in any module.
 * `data` is the submitted form value, used for conditional steps.
 */
export function workflowFor(module: ModuleKey, data: Record<string, any> = {}): WorkflowStep[] {
  switch (module) {
    case 'medical':
      if (data['treatment'] === 'IPD') {
        return [
          { role: 'Physician form', assignee: 'You', note: 'Download, get signed, upload', employeeStep: true },
          ...MEDICAL_FINANCE,
        ];
      }
      return MEDICAL_FINANCE;
    case 'pf-loan':
      return [
        {
          role: 'Officer Accounts', assignee: 'Bilal Ahmed', note: 'Verifies your PF balance', approveLabel: 'Verify & forward',
          fields: [
            { key: 'pfBalance', label: 'Provident Fund balance', type: 'number', prefix: 'PKR', required: true },
            { key: 'toDateBalance', label: 'To-date balance (with est. profit)', type: 'number', prefix: 'PKR', required: true },
            { key: 'monthlyContribution', label: 'Monthly contribution', type: 'number', prefix: 'PKR', required: true },
            { key: 'membershipDate', label: 'Date of PF membership', type: 'date', required: true },
            { key: 'previousLoanEnded', label: 'Date previous loan ended', type: 'text' },
            { key: 'loanBalance', label: 'Loan balance (if any)', type: 'number', prefix: 'PKR' },
          ],
        },
        { role: 'Manager Accounts', assignee: 'Asif Mehmood', note: 'Reviews the verification', approveLabel: 'Approve verification' },
        {
          role: 'PF Trust', assignee: 'Kamran Ali', note: 'Sanctions and disburses the loan', approveLabel: 'Sanction loan',
          fields: [
            { key: 'loanSanctioned', label: 'Loan sanctioned', type: 'number', prefix: 'PKR', required: true },
            { key: 'installmentAmount', label: 'Installment amount', type: 'number', prefix: 'PKR', required: true },
            { key: 'installments', label: 'No. of installments', type: 'select', options: ['12', '24', '36', '48', '60'], required: true },
            { key: 'deductionFrom', label: 'Deduction from', type: 'text', required: true },
            { key: 'deductionTo', label: 'Deduction to', type: 'text', required: true },
            { key: 'disbursementDate', label: 'Date of disbursement', type: 'date', required: true },
          ],
        },
      ];
    case 'advance-salary':
    case 'child-fee':
    case 'nesp':
      return [
        { role: 'HR', assignee: 'Sara Khan', note: 'Checks eligibility and policy', approveLabel: 'Approve' },
        { role: 'Finance', assignee: 'Usman Tariq', note: 'Processes the payment', approveLabel: 'Approve payment' },
      ];
    case 'fuel':
      return [
        {
          role: 'Admin', assignee: 'Imran Shah', note: 'Verifies the mileage log', approveLabel: 'Verify mileage',
          fields: [{ key: 'verifiedKm', label: 'Verified official km', type: 'number', required: true }],
        },
        { role: 'Finance', assignee: 'Usman Tariq', note: 'Processes the payment', approveLabel: 'Approve payment' },
      ];
    case 'mobile':
      return [{ role: 'Finance', assignee: 'Usman Tariq', note: 'Checks the limit and pays', approveLabel: 'Approve payment' }];
    case 'courier': {
      const steps: WorkflowStep[] = [];
      if (data['shipmentType'] === 'Official') {
        steps.push({ role: 'PM / Head of Department', assignee: 'Faisal Qureshi', note: 'Approves official shipments', approveLabel: 'Approve shipment' });
      }
      steps.push({
        role: 'Admin (dispatch)', assignee: 'Imran Shah', note: 'Books the pickup', approveLabel: 'Book pickup',
        fields: [
          { key: 'trackingNo', label: 'Tracking / AWB number', type: 'text', required: true },
          { key: 'pickupDate', label: 'Pickup date', type: 'date', required: true },
        ],
      });
      return steps;
    }
    case 'stationery': {
      const steps: WorkflowStep[] = [];
      if (data['largeQuantity']) {
        steps.push({ role: 'PM / Head of Department', assignee: 'Faisal Qureshi', note: 'Large quantity requests only', approveLabel: 'Approve request' });
      }
      steps.push({ role: 'Head of Admin', assignee: 'Imran Shah', note: 'Issues the items', approveLabel: 'Issue items' });
      return steps;
    }
  }
}
