import { Logger } from '@nestjs/common';

import { DeliveryError, SmsSender } from './senders.js';

export interface NetgsmConfig {
  usercode: string;
  password: string;
  msgheader: string;
  /** Overridable for tests. */
  baseUrl?: string;
}

// Netgsm's result codes, as mapped by community clients. Netgsm's own table
// (netgsm.com.tr/dokuman) must be checked against a live account before
// launch; see docs/adr/0008.
const ERRORS: Record<string, string> = {
  '20': 'message text invalid or too long',
  '30': 'invalid credentials or no API permission',
  '40': 'sender header (msgheader) not defined',
  '41': 'sender header (msgheader) not defined',
  '50': 'blocked by the İYS filter',
  '51': 'blocked by the İYS filter',
  '70': 'invalid or missing parameters',
  '85': 'duplicate send limit reached',
  '100': 'Netgsm system error',
};

/**
 * Netgsm OTP route (REST v2): priority delivery within 3 minutes, one
 * recipient, no scheduling, outside İYS because the content is not
 * commercial. Requires an OTP package on the Netgsm account.
 */
export class NetgsmSmsSender extends SmsSender {
  private readonly logger = new Logger('Netgsm');

  constructor(private readonly config: NetgsmConfig) {
    super();
  }

  async send(to: string, text: string) {
    const baseUrl = this.config.baseUrl ?? 'https://api.netgsm.com.tr';
    const auth = Buffer.from(
      `${this.config.usercode}:${this.config.password}`,
    ).toString('base64');
    const response = await fetch(`${baseUrl}/sms/rest/v2/otp`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        msgheader: this.config.msgheader,
        encoding: 'TR',
        // Netgsm wants the number without the leading "+".
        messages: [{ msg: text, no: to.replace(/^\+/, '') }],
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch((error: unknown) => {
      throw new DeliveryError(`Netgsm unreachable: ${String(error)}`);
    });

    const body = (await response.json().catch(() => ({}))) as {
      code?: string | number;
      jobid?: string;
    };
    const code = String(body.code ?? '');
    if (!response.ok || (code !== '00' && code !== '0')) {
      const reason = ERRORS[code] ?? `HTTP ${response.status}, code ${code}`;
      this.logger.error(`OTP SMS rejected: ${reason}`);
      throw new DeliveryError(reason);
    }
    this.logger.log(`OTP SMS accepted, jobid ${body.jobid ?? '?'}`);
  }
}
