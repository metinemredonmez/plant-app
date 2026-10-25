import { Logger } from '@nestjs/common';

import type { Outbox } from './outbox.js';
import { type Email, EmailSender, SmsSender } from './senders.js';

// Development and test drivers: nothing leaves the machine.

export class LogSmsSender extends SmsSender {
  private readonly logger = new Logger('SMS');

  constructor(private readonly outbox: Outbox) {
    super();
  }

  async send(to: string, text: string) {
    this.outbox.push({ channel: 'sms', to, text });
    this.logger.warn(`[not sent, SMS_DRIVER=log] ${to}: ${text}`);
  }
}

export class LogEmailSender extends EmailSender {
  private readonly logger = new Logger('Email');

  constructor(private readonly outbox: Outbox) {
    super();
  }

  async send({ to, subject, text }: Email) {
    this.outbox.push({ channel: 'email', to, subject, text });
    this.logger.warn(
      `[not sent, EMAIL_DRIVER=log] ${to}: ${subject} / ${text}`,
    );
  }
}
