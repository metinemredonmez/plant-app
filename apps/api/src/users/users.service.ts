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
import { AppleRevocationsService } from '../identity/apple-revocations.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImageStorage } from '../storage/image-storage.js';
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
    private readonly images: ImageStorage,
    private readonly appleRevocations: AppleRevocationsService,
  ) {}

  async signUp({ name, email, password }: SignUpBody) {
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException(EMAIL_TAKEN);
    }
    const passwordHash = await this.passwords.hash(password);
    const user = await this.prisma.user
      .create({
        data: { name, email, passwordHash, lastSignInMethod: 'EMAIL' },
      })
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
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSignInMethod: 'EMAIL' },
    });
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
   * Account deletion (Apple 5.1.1(v), Google Play, KVKK): plants, care log,
   * scans and their photos, chats, the entitlement and the Apple, Google
   * and phone links are deleted, Apple access is revoked, personal fields
   * blanked and every session ends. The anonymized row stays so
   * billing events from the stores still have something to point at.
   */
  async deleteAccount(caller: AuthUser, id: number) {
    assertSelf(caller, id);
    return this.anonymize(id);
  }

  /**
   * The account's personal data and content gone, the row kept anonymous
   * (orders, audit). Also used by the admin panel (ADR 0015).
   */
  async anonymize(id: number) {
    const apple = await this.prisma.authIdentity.findMany({
      where: {
        userId: id,
        provider: 'APPLE',
        appleRefreshToken: { not: null },
      },
      select: { appleRefreshToken: true },
    });
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
          city: null,
          careProfile: Prisma.DbNull,
          careProfileAt: null,
          lastSignInMethod: null,
          anonymizedAt: new Date(),
        },
      }),
      // Apple, Google and phone links: the same identity later opens a new
      // account. The phone link holds only a hash of the number.
      this.prisma.authIdentity.deleteMany({ where: { userId: id } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.otpCode.deleteMany({ where: { userId: id } }),
      this.prisma.chatMessage.deleteMany({ where: { userId: id } }),
      this.prisma.scan.deleteMany({ where: { userId: id } }),
      this.prisma.userPlant.deleteMany({ where: { userId: id } }),
      this.prisma.entitlement.deleteMany({ where: { userId: id } }),
      // The cost history stays, without the person.
      this.prisma.aiUsage.updateMany({
        where: { userId: id },
        data: { userId: null },
      }),
    ]);
    const { publicId } = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { publicId: true },
    });
    await this.images.removeAll(publicId);
    // App Store 5.1.1(v): end Sign in with Apple access too; retried later
    // if Apple does not answer now.
    await this.appleRevocations.revokeOrQueue(
      apple.flatMap(({ appleRefreshToken }) =>
        appleRefreshToken ? [appleRefreshToken] : [],
      ),
    );
    return { message: 'Hesap silindi' };
  }
}
