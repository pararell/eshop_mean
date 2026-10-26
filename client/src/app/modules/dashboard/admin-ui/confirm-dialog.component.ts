import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Label of the confirming button, e.g. "Delete" */
  confirm: string;
  /** Destructive action: the confirm button is red */
  danger?: boolean;
}

/** "Are you sure?" before deleting or other irreversible actions; the cancel button has focus */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="confirm-message">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn btn-outline" [mat-dialog-close]="false" cdkFocusInitial>Cancel</button>
      <button type="button" class="btn" [class.btn-danger]="data.danger" [class.btn-primary]="!data.danger" [mat-dialog-close]="true">
        {{ data.confirm }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .confirm-message {
      margin: 0;
      color: var(--color-text);
    }
  `,
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmOptions>(MAT_DIALOG_DATA);
}

/** Opens the confirm dialog; resolves true only when confirmed */
export async function confirmAction(dialog: MatDialog, options: ConfirmOptions): Promise<boolean> {
  const ref = dialog.open<ConfirmDialogComponent, ConfirmOptions, boolean>(ConfirmDialogComponent, {
    data: options,
    width: '420px',
    autoFocus: 'dialog',
  });
  return (await firstValueFrom(ref.afterClosed())) === true;
}
