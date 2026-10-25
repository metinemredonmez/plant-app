import { Body, Controller, Get } from '@nestjs/common';
import { z } from 'zod';

import {
  type AuthUser,
  OptionalAuth,
  OptionalUser,
} from '../auth/auth.decorators.js';
import { LegacyPost } from '../common/legacy-post.decorator.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import { PromocodesService } from './promocodes.service.js';

const showSchema = z.object({ voucher: z.string().trim().min(1).max(40) });

/** Signed-in callers also see and can use their personal codes. */
@OptionalAuth()
@Controller()
export class PromocodesController {
  constructor(private readonly promocodes: PromocodesService) {}

  @Get('promocodes')
  list(@OptionalUser() caller: AuthUser | undefined) {
    return this.promocodes.list(caller);
  }

  @LegacyPost('promocode/show')
  show(
    @OptionalUser() caller: AuthUser | undefined,
    @Body(new ZodBody(showSchema)) body: z.output<typeof showSchema>,
  ) {
    return this.promocodes.show(body.voucher, caller);
  }
}
