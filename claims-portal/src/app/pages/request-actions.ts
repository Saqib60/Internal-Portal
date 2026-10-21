import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ClaimRequest } from '../core/models';
import { RequestService } from '../core/request.service';
import { FeedbackService } from '../core/feedback.service';
import { moduleDef } from '../core/modules';

/** Employee-side actions shared by the My Requests panel and the request page. */
@Injectable({ providedIn: 'root' })
export class RequestActions {
  private readonly requests = inject(RequestService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  continueDraft(r: ClaimRequest): void {
    this.router.navigate([moduleDef(r.module).route], { queryParams: { draft: r.id } });
  }

  deleteDraft(r: ClaimRequest, after?: () => void): void {
    this.feedback.confirmDelete('draft', `${r.id} and everything you entered in it will be deleted. This can’t be undone.`).subscribe(ok => {
      if (!ok) return;
      this.requests.deleteDraft(r.id);
      this.feedback.toast('success', 'Draft deleted', `${r.id} was removed.`);
      after?.();
    });
  }

  withdraw(r: ClaimRequest): void {
    this.feedback.popup({
      type: 'warning', title: 'Withdraw this request?',
      message: `${r.id} will be taken out of the approval queue. You can submit a new request later.`,
      primary: 'Yes, withdraw', secondary: 'Keep it',
    }).subscribe(ok => {
      if (!ok) return;
      this.requests.withdraw(r.id).subscribe(() => this.feedback.toast('info', 'Request withdrawn', `${r.id} is no longer with approvers.`));
    });
  }

  resubmit(r: ClaimRequest): void {
    this.requests.resubmit(r.id).subscribe(() => this.feedback.toast('success', 'Request resubmitted', `${r.id} is back with the approver.`));
  }

  uploadPhysicianForm(r: ClaimRequest): void {
    this.router.navigate(['/medical/ipd', r.id]);
  }

  messageHr(r: ClaimRequest): void {
    this.feedback.toast('info', 'Message sent to HR', `We’ve shared ${r.id} with the HR helpdesk. They’ll reply by email.`);
  }
}
