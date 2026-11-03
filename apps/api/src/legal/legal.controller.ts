import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';

import { type AuthUser, CurrentUser, Public } from '../auth/auth.decorators.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import {
  type AcceptBody,
  acceptSchema,
  LegalService,
  toPublicDoc,
} from './legal.service.js';

/** Public: the texts must be readable before there is an account. */
@Controller('v1/legal')
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Public()
  @Get()
  async list() {
    return (await this.legal.currentAll()).map(toPublicDoc);
  }

  @Public()
  @Get(':slug')
  async doc(@Param('slug') slug: string) {
    return toPublicDoc(await this.legal.current(slug));
  }
}

@Controller('v1/my/legal')
export class MyLegalController {
  constructor(private readonly legal: LegalService) {}

  @Get('pending')
  async pending(@CurrentUser() caller: AuthUser) {
    return { pending: await this.legal.pendingFor(caller.id) };
  }

  @Post('accept')
  @HttpCode(200)
  accept(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(acceptSchema)) body: AcceptBody,
  ) {
    return this.legal.accept(caller, body);
  }
}
