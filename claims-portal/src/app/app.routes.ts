import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { authGuard, guestGuard, pendingGuard } from './core/auth.guard';
import { AuthService } from './core/auth.service';
import { AuthLayoutComponent } from './auth/auth-layout.component';
import { ShellComponent } from './layout/shell.component';

const resetVerifiedGuard = () => (inject(AuthService).resetVerified() ? true : inject(Router).createUrlTree(['/forgot-password']));

export const routes: Routes = [
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent), title: 'Sign in · ESS Portal' },
      { path: 'login/verify', canActivate: [pendingGuard], loadComponent: () => import('./auth/mfa.component').then(m => m.MfaComponent), title: 'Verify sign-in · ESS Portal' },
      { path: 'forgot-password', loadComponent: () => import('./auth/forgot-password.component').then(m => m.ForgotPasswordComponent), title: 'Forgot password · ESS Portal' },
      { path: 'forgot-password/verify', canActivate: [pendingGuard], loadComponent: () => import('./auth/mfa.component').then(m => m.MfaComponent), title: 'Verify it’s you · ESS Portal' },
      { path: 'forgot-password/new', canActivate: [resetVerifiedGuard], loadComponent: () => import('./auth/new-password.component').then(m => m.NewPasswordComponent), title: 'New password · ESS Portal' },
    ],
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard.component').then(m => m.DashboardComponent), title: 'Dashboard · ESS Portal' },
      { path: 'requests', loadComponent: () => import('./pages/my-requests.component').then(m => m.MyRequestsComponent), title: 'My Requests · ESS Portal' },
      { path: 'requests/:id', loadComponent: () => import('./pages/request-detail.component').then(m => m.RequestDetailComponent), title: 'Request · ESS Portal' },
      { path: 'approvals', loadComponent: () => import('./pages/approvals.component').then(m => m.ApprovalsComponent), title: 'Approvals · ESS Portal' },
      { path: 'approvals/:id', loadComponent: () => import('./pages/approval-review.component').then(m => m.ApprovalReviewComponent), title: 'Review request · ESS Portal' },
      { path: 'notifications', loadComponent: () => import('./pages/notifications.component').then(m => m.NotificationsComponent), title: 'Notifications · ESS Portal' },
      { path: 'mobile', data: { module: 'mobile' }, loadComponent: () => import('./forms/expense-form.component').then(m => m.ExpenseFormComponent), title: 'Mobile reimbursement · ESS Portal' },
      { path: 'child-fee', data: { module: 'child-fee' }, loadComponent: () => import('./forms/expense-form.component').then(m => m.ExpenseFormComponent), title: 'Child fee reimbursement · ESS Portal' },
      { path: 'medical', loadComponent: () => import('./forms/medical.component').then(m => m.MedicalComponent), title: 'Medical reimbursement · ESS Portal' },
      { path: 'medical/ipd/:id', loadComponent: () => import('./forms/ipd-claim.component').then(m => m.IpdClaimComponent), title: 'Inpatient claim · ESS Portal' },
      { path: 'fuel', loadComponent: () => import('./forms/fuel.component').then(m => m.FuelComponent), title: 'Fuel reimbursement · ESS Portal' },
      { path: 'nesp', loadComponent: () => import('./forms/nesp.component').then(m => m.NespComponent), title: 'NESP reimbursement · ESS Portal' },
      { path: 'pf-loan', loadComponent: () => import('./forms/pf-loan.component').then(m => m.PfLoanComponent), title: 'PF loan · ESS Portal' },
      { path: 'advance-salary', loadComponent: () => import('./forms/advance-salary.component').then(m => m.AdvanceSalaryComponent), title: 'Advance salary · ESS Portal' },
      { path: 'courier', loadComponent: () => import('./forms/courier.component').then(m => m.CourierComponent), title: 'Courier approval · ESS Portal' },
      { path: 'stationery', loadComponent: () => import('./forms/stationery.component').then(m => m.StationeryComponent), title: 'Stationery request · ESS Portal' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
