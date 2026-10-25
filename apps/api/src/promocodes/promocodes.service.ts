import { Injectable, NotFoundException } from '@nestjs/common';

import type { AuthUser } from '../auth/auth.decorators.js';
import { toLegacyPromocode } from '../catalog/legacy.mapper.js';
import type { Prisma, Promocode } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const NOT_FOUND = 'Promosyon kodu bulunamadı';

/** Codes are stored upper case (ASCII, so no Turkish İ/ı surprises). */
export const normalizeCode = (code: string) => code.trim().toUpperCase();

@Injectable()
export class PromocodesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Usable now: active, not expired and not used up. */
  private usableWhere(): Prisma.PromocodeWhereInput {
    return {
      active: true,
      expiresAt: { gt: new Date() },
      OR: [
        { usageLimit: null },
        { usedCount: { lt: this.prisma.promocode.fields.usageLimit } },
      ],
    };
  }

  /**
   * Public codes plus the caller's personal ones. The cart tab still checks
   * codes against this list on the device until orders are priced on the
   * server (week 5), so expired codes must never appear here.
   */
  async list(caller?: AuthUser) {
    const promocodes = await this.prisma.promocode.findMany({
      where: {
        AND: [
          this.usableWhere(),
          {
            OR: [{ userId: null }, ...(caller ? [{ userId: caller.id }] : [])],
          },
        ],
      },
      orderBy: { id: 'asc' },
    });
    return promocodes.map(toLegacyPromocode);
  }

  /**
   * The single check for a typed code, also used by order creation. Another
   * user's personal code answers like an unknown one.
   */
  async findUsable(code: string, caller?: AuthUser): Promise<Promocode> {
    const promo = await this.prisma.promocode.findUnique({
      where: { code: normalizeCode(code) },
    });
    if (
      !promo ||
      !promo.active ||
      (promo.userId !== null && promo.userId !== caller?.id)
    ) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (promo.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Bu promosyon kodunun süresi dolmuş');
    }
    if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
      throw new NotFoundException(
        'Bu promosyon kodunun kullanım limiti dolmuş',
      );
    }
    return promo;
  }

  async show(voucher: string, caller?: AuthUser) {
    return {
      promocode: toLegacyPromocode(await this.findUsable(voucher, caller)),
    };
  }
}
