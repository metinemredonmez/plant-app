import { Body, Controller } from '@nestjs/common';
import { z } from 'zod';

import { LegacyPost } from '../common/legacy-post.decorator.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import { AuthRateLimited, Public } from './auth.decorators.js';
import { TokenService } from './token.service.js';

const refreshSchema = z.object({ refreshToken: z.string().min(1).max(200) });
type RefreshBody = z.output<typeof refreshSchema>;

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly tokens: TokenService) {}

  @AuthRateLimited()
  @LegacyPost('refresh')
  refresh(@Body(new ZodBody(refreshSchema)) body: RefreshBody) {
    return this.tokens.rotate(body.refreshToken);
  }

  /** Always 200: logging out an unknown session is not an error. */
  @LegacyPost('logout')
  async logout(@Body(new ZodBody(refreshSchema)) body: RefreshBody) {
    await this.tokens.revoke(body.refreshToken);
    return { message: 'Çıkış yapıldı' };
  }
}
