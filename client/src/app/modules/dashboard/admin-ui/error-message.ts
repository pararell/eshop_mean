import { HttpErrorResponse } from '@angular/common/http';

/** The server's message for a failed admin request (Nest error body), or the fallback */
export const errorMessage = (error: unknown, fallback: string): string => {
  const body = (error as HttpErrorResponse)?.error as { message?: string | string[] } | undefined;
  const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
  return message || fallback;
};
