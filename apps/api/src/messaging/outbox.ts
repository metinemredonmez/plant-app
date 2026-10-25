import { Injectable } from '@nestjs/common';

export interface OutboxMessage {
  channel: 'sms' | 'email';
  to: string;
  subject?: string;
  text: string;
  sentAt: Date;
}

const KEEP = 50;

/**
 * Where the `log` drivers put messages instead of sending them, so a
 * developer can read a code without a real SMS or mailbox and e2e tests
 * can complete the OTP flows. Never used in production (env validation).
 */
@Injectable()
export class Outbox {
  private readonly messages: OutboxMessage[] = [];

  push(message: Omit<OutboxMessage, 'sentAt'>) {
    this.messages.push({ ...message, sentAt: new Date() });
    if (this.messages.length > KEEP) this.messages.shift();
  }

  /** The newest message sent to `to`, if any. */
  latestTo(to: string) {
    return this.messages.findLast((message) => message.to === to);
  }
}
