import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { LogEmailSender, LogSmsSender } from './log.senders.js';
import { NetgsmSmsSender } from './netgsm.sms-sender.js';
import { Outbox } from './outbox.js';
import { EmailSender, SmsSender } from './senders.js';
import { SmtpEmailSender } from './smtp.email-sender.js';

// Picks the SMS and e-mail drivers from the environment. env.ts guarantees
// the credentials exist for the real drivers and forbids `log` in
// production.
@Global()
@Module({
  providers: [
    Outbox,
    {
      provide: SmsSender,
      inject: [ConfigService, Outbox],
      useFactory: (config: ConfigService<Env, true>, outbox: Outbox) =>
        config.get('SMS_DRIVER', { infer: true }) === 'netgsm'
          ? new NetgsmSmsSender({
              usercode: config.get('NETGSM_USERCODE', { infer: true })!,
              password: config.get('NETGSM_PASSWORD', { infer: true })!,
              msgheader: config.get('NETGSM_MSGHEADER', { infer: true })!,
            })
          : new LogSmsSender(outbox),
    },
    {
      provide: EmailSender,
      inject: [ConfigService, Outbox],
      useFactory: (config: ConfigService<Env, true>, outbox: Outbox) =>
        config.get('EMAIL_DRIVER', { infer: true }) === 'smtp'
          ? new SmtpEmailSender(
              config.get('SMTP_URL', { infer: true })!,
              config.get('EMAIL_FROM', { infer: true }),
            )
          : new LogEmailSender(outbox),
    },
  ],
  exports: [Outbox, SmsSender, EmailSender],
})
export class MessagingModule {}
