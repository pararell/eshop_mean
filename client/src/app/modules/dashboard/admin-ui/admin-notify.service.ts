import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Short confirmations and errors after admin saves (bottom toast, announced to screen readers) */
@Injectable({ providedIn: 'root' })
export class AdminNotifyService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000, politeness: 'polite' });
  }

  /** `error` is what ApiService returns on failure ({ error }), shown with the server's message */
  error(message: string, error?: unknown): void {
    const detail =
      (error as { error?: { message?: string | string[] }; message?: string } | undefined)?.error?.message ??
      (error as { message?: string })?.message;
    const text = Array.isArray(detail) ? detail.join(', ') : detail;
    this.snackBar.open(text ? `${message}: ${text}` : message, 'Close', { duration: 8000, politeness: 'assertive' });
  }
}
