import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { AuthRateLimited, Public } from '../auth/auth.decorators.js';
import type { PrivacyRequestType } from '../generated/prisma/client.js';
import { LegalService, toPublicDoc } from '../legal/legal.service.js';
import { esc, page } from './html.js';
import { type Contact, PrivacyService } from './privacy.service.js';

type Form = Record<string, string | undefined>;

/** No script at all: plain forms, so nothing can inject one either. */
const Html = () =>
  applyDecorators(
    Header('Content-Type', 'text/html; charset=utf-8'),
    Header(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    ),
    Header('X-Content-Type-Options', 'nosniff'),
    Header('Referrer-Policy', 'no-referrer'),
    Header('Cache-Control', 'no-store'),
  );

const REQUEST_TYPES: Record<PrivacyRequestType, string> = {
  ACCESS: 'Hakkımdaki verileri öğrenmek istiyorum',
  CORRECT: 'Verilerimin düzeltilmesini istiyorum',
  DELETE: 'Verilerimin silinmesini istiyorum',
  OBJECT: 'İşlenmesine itiraz ediyorum',
  OTHER: 'Başka bir talep',
};

const problem = (message: string) =>
  `<p class="bad" role="alert">${esc(message)}</p>`;
const hidden = (name: string, value: unknown) =>
  `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`;
/** Bots fill every field; people never see this one. */
const TRAP = `<div class="trap" aria-hidden="true"><label>Web siteniz<input name="web_sitesi" tabindex="-1" autocomplete="off"></label></div>`;

const errorText = (error: unknown) => {
  if (error instanceof HttpException) {
    const body = error.getResponse();
    if (typeof body === 'string') return body;
    const { message } = body as { message?: unknown };
    if (typeof message === 'string') return message;
  }
  return 'Bir sorun oldu, lütfen yeniden dene.';
};

/**
 * Public pages, served from the API so the texts have one source and there
 * is nothing else to deploy (ADR 0016): the legal texts, account deletion and
 * the KVKK form. Outside the /api prefix.
 */
@Controller()
export class WebController {
  constructor(
    private readonly legal: LegalService,
    private readonly privacy: PrivacyService,
  ) {}

  // Legal texts
  @Public()
  @Get('yasal')
  @Html()
  async legalIndex() {
    const docs = await this.legal.currentAll();
    const items = docs
      .map(
        (doc) =>
          `<p><a href="/yasal/${esc(doc.slug)}">${esc(doc.title)}</a></p>`,
      )
      .join('');
    return page('Yasal metinler', `<div class="card">${items}</div>`);
  }

  @Public()
  @Get('yasal/:slug')
  @Html()
  async legalDoc(
    @Param('slug') slug: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    let doc;
    try {
      doc = toPublicDoc(await this.legal.current(slug));
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      res.status(HttpStatus.NOT_FOUND);
      return page(
        'Metin bulunamadı',
        '<p><a href="/yasal">Yasal metinler</a></p>',
      );
    }
    const draft = doc.draft
      ? '<p class="muted">Taslak: hukuk onaylı metin yayımlanınca değişecek.</p>'
      : '';
    const sections = doc.sections
      .map(
        (section) =>
          `<h2>${esc(section.heading)}</h2><p>${esc(section.body)}</p>`,
      )
      .join('');
    return page(
      doc.title,
      `<p class="muted">Sürüm ${esc(doc.version)}</p>${draft}${sections}`,
    );
  }

  // Account deletion
  private deletionStart(message?: string, contact = '') {
    return page(
      'Hesabını sil',
      `${message ? problem(message) : ''}
<p>Hesabın, bitkilerin, bakım kayıtların, fotoğrafların ve sohbetlerin kalıcı olarak silinir. Bu geri alınamaz.</p>
<p class="muted">Aboneliğin varsa App Store ya da Google Play ayarlarından ayrıca iptal etmelisin. Hesabını uygulamadan da silebilirsin: Profil, Hesabı sil.</p>
<form class="card" method="post" action="/hesap-silme">
<label for="iletisim">Hesabındaki e-posta ya da telefon (+90)</label>
<input id="iletisim" name="iletisim" value="${esc(contact)}" autocomplete="username" required>
${TRAP}
<button type="submit">Doğrulama kodu gönder</button>
</form>
<p class="muted">Apple ile girip e-postanı gizlediysen kod bu adrese ulaşamaz: uygulamadan sil ya da <a href="/kvkk-basvuru">KVKK başvurusu</a> yap.</p>`,
    );
  }

  private deletionCode(contact: Contact, raw: string, message?: string) {
    return page(
      'Kodu gir',
      `${message ? problem(message) : `<p>${esc(contact.hint)} adresine bir kod gönderdik. Bu adresle bir hesap yoksa da aynı ekranı görürsün.</p>`}
<form class="card" method="post" action="/hesap-silme/onay">
${hidden('iletisim', raw)}
<label for="kod">Doğrulama kodu</label>
<input id="kod" name="kod" inputmode="numeric" autocomplete="one-time-code" required>
<label class="check"><input type="checkbox" name="onay" value="evet" required> Hesabımın kalıcı olarak silineceğini anladım.</label>
<button class="danger" type="submit">Hesabımı sil</button>
</form>`,
    );
  }

  @Public()
  @Get('hesap-silme')
  @Html()
  deletionPage() {
    return this.deletionStart();
  }

  @Public()
  @AuthRateLimited()
  @Post('hesap-silme')
  @HttpCode(200)
  @Html()
  async deletionSend(@Body() form: Form) {
    const raw = form.iletisim ?? '';
    const contact = this.privacy.parseContact(raw);
    if (!contact) {
      return this.deletionStart(
        'Geçerli bir e-posta ya da +90 ile başlayan cep telefonu yaz.',
        raw,
      );
    }
    // A bot filled the hidden field: same screen, nothing sent.
    if (form.web_sitesi) return this.deletionCode(contact, raw);
    try {
      await this.privacy.sendCode(contact);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() < 500) {
        // Asked again within a minute: the code sent earlier still works.
        if (errorText(error).includes('saniye')) {
          return this.deletionCode(contact, raw, errorText(error));
        }
        return this.deletionStart(errorText(error), raw);
      }
      return this.deletionStart(
        'Kod gönderilemedi, lütfen biraz sonra yeniden dene.',
        raw,
      );
    }
    return this.deletionCode(contact, raw);
  }

  @Public()
  @AuthRateLimited()
  @Post('hesap-silme/onay')
  @HttpCode(200)
  @Html()
  async deletionConfirm(@Body() form: Form) {
    const raw = form.iletisim ?? '';
    const contact = this.privacy.parseContact(raw);
    if (!contact) return this.deletionStart();
    if (form.onay !== 'evet') {
      return this.deletionCode(
        contact,
        raw,
        'Silmek için kutuyu işaretlemelisin.',
      );
    }
    try {
      await this.privacy.deleteAccount(contact, (form.kod ?? '').trim());
    } catch (error) {
      if (!(error instanceof HttpException)) throw error;
      return this.deletionCode(contact, raw, errorText(error));
    }
    return page(
      'Talebin işlendi',
      `<div class="card"><p>Bu bilgiyle bir hesap varsa silindi. Bitkiler, fotoğraflar ve sohbetler de silindi.</p>
<p class="muted">Aboneliğin varsa App Store ya da Google Play ayarlarından iptal etmeyi unutma.</p></div>`,
    );
  }

  // KVKK request
  private requestStart(message?: string, form: Form = {}) {
    const options = Object.entries(REQUEST_TYPES)
      .map(
        ([value, label]) =>
          `<option value="${value}"${form.tur === value ? ' selected' : ''}>${esc(label)}</option>`,
      )
      .join('');
    return page(
      'KVKK başvurusu',
      `${message ? problem(message) : ''}
<p>KVKK m.11 kapsamındaki taleplerini buradan iletebilirsin. E-postanı bir kodla doğrularız; başvurun en geç 30 gün içinde yanıtlanır. Metin: <a href="/yasal/kvkk">KVKK Aydınlatma Metni</a>.</p>
<form class="card" method="post" action="/kvkk-basvuru">
<label for="ad">Ad soyad</label>
<input id="ad" name="ad" value="${esc(form.ad)}" maxlength="120" autocomplete="name" required>
<label for="eposta">E-posta (yanıt buraya gelir)</label>
<input id="eposta" name="eposta" type="email" value="${esc(form.eposta)}" autocomplete="email" required>
<label for="tur">Talebin</label>
<select id="tur" name="tur">${options}</select>
<label for="mesaj">Açıklama</label>
<textarea id="mesaj" name="mesaj" rows="5" maxlength="2000" required>${esc(form.mesaj)}</textarea>
${TRAP}
<button type="submit">Doğrulama kodu gönder</button>
</form>`,
    );
  }

  private requestCode(form: Form, hint: string, message?: string) {
    return page(
      'Kodu gir',
      `${message ? problem(message) : `<p>${esc(hint)} adresine bir kod gönderdik.</p>`}
<form class="card" method="post" action="/kvkk-basvuru/onay">
${hidden('ad', form.ad)}${hidden('eposta', form.eposta)}${hidden('tur', form.tur)}${hidden('mesaj', form.mesaj)}
<label for="kod">Doğrulama kodu</label>
<input id="kod" name="kod" inputmode="numeric" autocomplete="one-time-code" required>
<button type="submit">Başvurumu gönder</button>
</form>`,
    );
  }

  /** The fields, checked; a Turkish message when something is off. */
  private checkRequest(form: Form) {
    const name = (form.ad ?? '').trim();
    const message = (form.mesaj ?? '').trim();
    const type = form.tur as PrivacyRequestType;
    if (name.length < 2 || name.length > 120) return { error: 'Adını yaz.' };
    if (!(type in REQUEST_TYPES)) return { error: 'Talep türünü seç.' };
    if (message.length < 5 || message.length > 2000) {
      return { error: 'Talebini birkaç kelimeyle açıkla.' };
    }
    const contact = this.privacy.parseContact(form.eposta ?? '', {
      emailOnly: true,
    });
    if (!contact) return { error: 'Geçerli bir e-posta yaz.' };
    return { contact, body: { name, type, message } };
  }

  @Public()
  @Get('kvkk-basvuru')
  @Html()
  requestPage() {
    return this.requestStart();
  }

  @Public()
  @AuthRateLimited()
  @Post('kvkk-basvuru')
  @HttpCode(200)
  @Html()
  async requestSend(@Body() form: Form) {
    const checked = this.checkRequest(form);
    if (!checked.contact) return this.requestStart(checked.error, form);
    if (form.web_sitesi) return this.requestCode(form, checked.contact.hint);
    try {
      await this.privacy.sendCode(checked.contact);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() < 500) {
        if (errorText(error).includes('saniye')) {
          return this.requestCode(form, checked.contact.hint, errorText(error));
        }
        return this.requestStart(errorText(error), form);
      }
      return this.requestStart(
        'Kod gönderilemedi, lütfen biraz sonra yeniden dene.',
        form,
      );
    }
    return this.requestCode(form, checked.contact.hint);
  }

  @Public()
  @AuthRateLimited()
  @Post('kvkk-basvuru/onay')
  @HttpCode(200)
  @Html()
  async requestConfirm(@Body() form: Form) {
    const checked = this.checkRequest(form);
    if (!checked.contact) return this.requestStart(checked.error, form);
    try {
      const { id, due } = await this.privacy.createRequest(
        checked.contact,
        (form.kod ?? '').trim(),
        checked.body,
      );
      return page(
        'Başvurun alındı',
        `<div class="card"><p>Başvuru numaran: <strong>#${id}</strong></p><p>En geç <strong>${esc(due)}</strong> tarihine kadar e-postayla yanıtlanacak.</p></div>`,
      );
    } catch (error) {
      if (!(error instanceof HttpException)) throw error;
      return this.requestCode(form, checked.contact.hint, errorText(error));
    }
  }
}
