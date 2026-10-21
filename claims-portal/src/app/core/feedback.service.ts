import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map } from 'rxjs';
import { FeedbackDialogComponent, FeedbackDialogData } from '../shared/feedback-dialog.component';
import { ToastComponent, ToastData } from '../shared/toast.component';

/** One place for popups (MatDialog) and toasts (MatSnackBar). */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  popup(data: FeedbackDialogData): Observable<boolean> {
    return this.dialog
      .open(FeedbackDialogComponent, { data, panelClass: 'feedback-panel', autoFocus: false, maxWidth: '92vw' })
      .afterClosed()
      .pipe(map(v => !!v));
  }

  confirmDelete(thing: string, detail: string): Observable<boolean> {
    return this.popup({
      type: 'danger', title: `Remove this ${thing}?`, message: detail, primary: 'Yes, remove', secondary: 'Keep it',
    });
  }

  confirmLeave(): Observable<boolean> {
    return this.popup({
      type: 'warning', title: 'Leave without submitting?',
      message: 'You have unsaved changes. If you leave now, anything you haven’t saved as a draft will be lost.',
      primary: 'Leave anyway', secondary: 'Keep editing',
    });
  }

  toast(type: ToastData['type'], title: string, message?: string): void {
    this.snack.openFromComponent(ToastComponent, {
      data: { type, title, message },
      duration: type === 'error' ? 6000 : 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: 'ess-toast',
    });
  }
}
