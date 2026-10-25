/** Sends a transactional SMS (OTP, order status). No marketing content. */
export abstract class SmsSender {
  abstract send(to: string, text: string): Promise<void>;
}

export interface Email {
  to: string;
  subject: string;
  text: string;
}

/** Sends a transactional e-mail (OTP, order status). */
export abstract class EmailSender {
  abstract send(email: Email): Promise<void>;
}

/** The provider rejected the message; the caller answers 502. */
export class DeliveryError extends Error {}
