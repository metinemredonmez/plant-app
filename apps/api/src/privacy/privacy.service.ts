import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { AuditService } from '../admin/audit.service.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { DAY_MS, istanbulDayStart } from '../care/season.js';
import type { Env } from '../config/env.js';
import type { PrivacyRequestType } from '../generated/prisma/client.js';
import { maskedPhone, phoneHash, turkishMobile } from '../identity/phone.js';
import { EmailSender, SmsSender } from '../messaging/senders.js';
import { OtpService } from '../otp/otp.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { email as emailSchema } from '../users/users.schemas.js';
import { UsersService } from '../users/users.service.js';

/** KVKK m.13: the answer is due within 30 days. */
const ANSWER_DAYS = 30;
const PURPOSE = 'PRIVACY_REQUEST' as const;

export interface Contact {
  kind: 'email' | 'phone';
  /** What the code is stored under: the address, or the number's hash. */
  target: string;
  /** Where it is sent; never stored for a phone number. */
  address: string;
  /** Safe to keep and show. */
  hint: string;
}

export const respondSchema = z.object({
  status: z.enum(['DONE', 'REJECTED']),
  response: z.string().trim().min(2).max(4000),
});
export type RespondBody = z.output<typeof respondSchema>;

const maskEmail = (address: string) => {
  const [name, domain] = address.split('@');
  return `${name.slice(0, 1)}•••@${domain}`;
};

/**
 * The public side of KVKK rights (ADR 0016): account deletion and requests
 * from the web, proved by a code sent to the person's own e-mail or phone.
 * Answers never tell whether an account exists.
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly mail: EmailSender,
    private readonly sms: SmsSender,
    private readonly users: UsersService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** An e-mail address or a +90 mobile; null when it is neither. */
  parseContact(input: string, { emailOnly = false } = {}): Contact | null {
    const value = input.trim();
    const address = emailSchema.safeParse(value);
    if (address.success) {
      return {
        kind: 'email',
        target: address.data,
        address: address.data,
        hint: maskEmail(address.data),
      };
    }
    if (emailOnly) return null;
    const pepper = this.config.get('PHONE_PEPPER', { infer: true });
    const e164 = turkishMobile(value);
    if (!e164 || !pepper) return null;
    return {
      kind: 'phone',
      target: phoneHash(pepper, e164),
      address: e164,
      hint: maskedPhone(e164.slice(-2)),
    };
  }

  /** Codes cost money and can annoy: capped per contact and per day. */
  async sendCode(contact: Contact) {
    const [forContact, today] = await Promise.all([
      this.prisma.otpCode.count({
        where: {
          target: contact.target,
          purpose: PURPOSE,
          createdAt: { gte: new Date(Date.now() - DAY_MS) },
        },
      }),
      this.prisma.otpCode.count({
        where: { purpose: PURPOSE, createdAt: { gte: istanbulDayStart() } },
      }),
    ]);
    if (
      forContact >=
      this.config.get('PHONE_CODES_PER_NUMBER_PER_DAY', { infer: true })
    ) {
      throw new HttpException(
        'Bu adrese bugün çok kod gönderildi. Lütfen yarın yeniden dene.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (today >= this.config.get('PHONE_CODES_PER_DAY', { infer: true })) {
      this.logger.error('daily privacy code cap reached');
      throw new HttpException(
        'Şu an kod gönderilemiyor. Lütfen biraz sonra yeniden dene.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const code = await this.otp.issue({
      target: contact.target,
      purpose: PURPOSE,
    });
    const text = `EverBloom doğrulama kodun: ${code}. 10 dakika geçerli. Bu işlemi sen başlatmadıysan dikkate alma.`;
    if (contact.kind === 'phone') {
      await this.sms.send(contact.address, text);
    } else {
      await this.mail.send({
        to: contact.address,
        subject: 'EverBloom doğrulama kodun',
        text,
      });
    }
  }

  private verify(contact: Contact, code: string) {
    return this.otp.verify({ target: contact.target, purpose: PURPOSE }, code);
  }

  private async accountOf(contact: Contact) {
    if (contact.kind === 'email') {
      return this.prisma.user.findFirst({
        where: { email: contact.target, anonymizedAt: null },
      });
    }
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_subject: { provider: 'PHONE', subject: contact.target },
      },
      select: { user: true },
    });
    return identity?.user ?? null;
  }

  /**
   * The web deletion page (Google Play requires one). Same work as "Hesabı
   * sil" in the app. The team's own accounts wait for a person.
   */
  async deleteAccount(contact: Contact, code: string) {
    await this.verify(contact, code);
    const account = await this.accountOf(contact);
    const now = new Date();
    const base = {
      type: 'DELETE' as const,
      contactHint: contact.hint,
      message: 'Web hesap silme sayfası',
      userId: account?.id ?? null,
      dueAt: new Date(now.getTime() + ANSWER_DAYS * DAY_MS),
    };
    if (account && account.role !== 'CUSTOMER') {
      await this.prisma.privacyRequest.create({ data: base });
      return;
    }
    if (account) await this.users.anonymize(account.id);
    await this.prisma.privacyRequest.create({
      data: {
        ...base,
        status: 'DONE',
        respondedAt: now,
        response: account ? 'Hesap silindi' : 'Bu bilgiyle hesap bulunamadı',
      },
    });
    if (account && contact.kind === 'email') {
      await this.mail
        .send({
          to: contact.address,
          subject: 'EverBloom hesabın silindi',
          text: 'Hesabın, bitkilerin, fotoğrafların ve sohbetlerin silindi. Aboneliğin varsa App Store ya da Google Play ayarlarından ayrıca iptal etmelisin.',
        })
        .catch(() => undefined);
    }
  }

  /** The KVKK form: a verified request with a 30-day clock. */
  async createRequest(
    contact: Contact,
    code: string,
    body: { name: string; type: PrivacyRequestType; message: string },
  ) {
    await this.verify(contact, code);
    const account = await this.accountOf(contact);
    const request = await this.prisma.privacyRequest.create({
      data: {
        type: body.type,
        name: body.name,
        email: contact.address,
        contactHint: contact.hint,
        message: body.message,
        userId: account?.id ?? null,
        dueAt: new Date(Date.now() + ANSWER_DAYS * DAY_MS),
      },
    });
    const due = request.dueAt.toLocaleDateString('tr-TR', {
      dateStyle: 'long',
      timeZone: 'Europe/Istanbul',
    });
    await this.mail
      .send({
        to: contact.address,
        subject: `EverBloom KVKK başvurun alındı (#${request.id})`,
        text: `Başvurun alındı. Numarası: #${request.id}. En geç ${due} tarihine kadar yanıtlanacak.`,
      })
      .catch(() => undefined);
    const owners = (this.config.get('ADMIN_ALERT_EMAIL', { infer: true }) ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    for (const owner of owners) {
      await this.mail
        .send({
          to: owner,
          subject: `Yeni KVKK başvurusu (#${request.id})`,
          text: `Son gün: ${due}. Admin panelinde, KVKK başvuruları sayfasında.`,
        })
        .catch(() => undefined);
    }
    return { id: request.id, due };
  }

  /** The admin queue: nearest deadline first. */
  list(state: 'open' | 'closed') {
    return this.prisma.privacyRequest.findMany({
      where: { status: state === 'open' ? 'OPEN' : { not: 'OPEN' } },
      orderBy: state === 'open' ? { dueAt: 'asc' } : { id: 'desc' },
      take: 200,
    });
  }

  async respond(actor: AuthUser, id: number, body: RespondBody) {
    const request = await this.prisma.privacyRequest.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Başvuru bulunamadı');
    const done = await this.prisma.privacyRequest.update({
      where: { id },
      data: {
        status: body.status,
        response: body.response,
        respondedAt: new Date(),
        respondedById: actor.id,
      },
    });
    if (request.email) {
      await this.mail.send({
        to: request.email,
        subject: `EverBloom KVKK başvurun yanıtlandı (#${id})`,
        text: body.response,
      });
    }
    await this.audit.log(
      actor,
      'privacy.respond',
      { type: 'privacy_request', id },
      {
        status: body.status,
      },
    );
    return done;
  }
}
