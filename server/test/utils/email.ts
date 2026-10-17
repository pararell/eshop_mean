// Replaces the Resend transport in API tests: nothing is sent, every message is recorded.
import { EmailMessage, mailTransport } from '../../src/shared/utils/email/resend-transport';

export const emailSpy = jest.spyOn(mailTransport, 'send').mockImplementation(async (messages) => messages.map((_, i) => `email_test_${i}`));

/** Every message passed to Resend since the last `jest.clearAllMocks()` */
export const sentEmails = (): EmailMessage[] => emailSpy.mock.calls.flatMap(([messages]) => messages);
