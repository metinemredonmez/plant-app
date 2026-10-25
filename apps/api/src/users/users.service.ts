import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { assertSelf } from '../auth/assert-self.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { PasswordService } from '../auth/password.service.js';
import { TokenService } from '../auth/token.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toLegacyUser } from './legacy-user.mapper.js';
import type {
  LoginBody,
  SignUpBody,
  UpdateProfileBody,
} from './users.schemas.js';

const EMAIL_TAKEN = 'Bu e-posta ile kayıtlı bir hesap var';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async signUp({ name, email, password }: SignUpBody) {
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException(EMAIL_TAKEN);
    }
    const passwordHash = await this.passwords.hash(password);
    const user = await this.prisma.user
      .create({ data: { name, email, passwordHash } })
      .catch((error: unknown) => {
        // Lost a race with a concurrent sign-up for the same e-mail.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(EMAIL_TAKEN);
        }
        throw error;
      });
    return { user: toLegacyUser(user), ...(await this.tokens.issue(user)) };
  }

  async login({ email, password }: LoginBody) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await this.passwords.verify(user?.passwordHash, password);
    if (!user || user.anonymizedAt || !valid) {
      throw new UnauthorizedException('E-posta veya parola hatalı');
    }
    return { user: toLegacyUser(user), ...(await this.tokens.issue(user)) };
  }

  /** Bare user object: GET /api/user/:id has no wrapper. */
  async findSelf(caller: AuthUser, id: number) {
    assertSelf(caller, id);
    const user = await this.prisma.user.findUnique({ where: { id } });
    // 404 makes the app log out, which is right for a deleted account.
    if (!user || user.anonymizedAt) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }
    return toLegacyUser(user);
  }

  async updateProfile(caller: AuthUser, id: number, body: UpdateProfileBody) {
    assertSelf(caller, id);
    const user = await this.prisma.user.update({
      where: { id, anonymizedAt: null },
      data: { name: body.name, location: body.location || null },
    });
    return { user: toLegacyUser(user) };
  }

  /**
   * Account deletion (Apple 5.1.1(v), Google Play): personal data is blanked
   * and every session ends. The row stays because invoiced orders must be
   * kept for tax law; see the MVP report, KVKK section.
   */
  async deleteAccount(caller: AuthUser, id: number) {
    assertSelf(caller, id);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          name: 'Silinmiş kullanıcı',
          email: `deleted-${id}@invalid.everbloom`,
          passwordHash: '',
          phoneNumber: null,
          location: null,
          emailVerified: false,
          phoneVerified: false,
          anonymizedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.otpCode.deleteMany({ where: { userId: id } }),
    ]);
    return { message: 'Hesap silindi' };
  }
}
