import { Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import { DeliveryError, type Email, EmailSender } from './senders.js';

/** Any SMTP provider (SES, Brevo, Postmark, Yandex, a Turkish host...). */
export class SmtpEmailSender extends EmailSender {
  private readonly logger = new Logger('SMTP');
  private readonly transport: Transporter;

  constructor(
    smtpUrl: string | Transporter,
    private readonly from: string,
  ) {
    super();
    this.transport =
      typeof smtpUrl === 'string' ? createTransport(smtpUrl) : smtpUrl;
  }

  async send({ to, subject, text }: Email) {
    try {
      await this.transport.sendMail({ from: this.from, to, subject, text });
    } catch (error) {
      this.logger.error(`E-mail to ${to} failed: ${String(error)}`);
      throw new DeliveryError('SMTP delivery failed');
    }
  }
}
