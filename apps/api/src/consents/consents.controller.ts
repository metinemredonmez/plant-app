import { Body, Controller, Get, Post } from '@nestjs/common';

import { type AuthUser, CurrentUser } from '../auth/auth.decorators.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import {
  type ConsentBody,
  consentSchema,
  ConsentsService,
} from './consents.service.js';

@Controller('v1/my/consents')
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Get('ai')
  status(@CurrentUser() caller: AuthUser) {
    return this.consents.status(caller);
  }

  @Post()
  record(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(consentSchema)) body: ConsentBody,
  ) {
    return this.consents.record(caller, body);
  }
}
