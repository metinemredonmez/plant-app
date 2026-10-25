import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { type AuthUser, CurrentUser } from '../auth/auth.decorators.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import {
  type AskBody,
  askSchema,
  AssistantService,
} from './assistant.service.js';

@Controller('v1/assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Get('messages')
  history(
    @CurrentUser() caller: AuthUser,
    @Query('userPlantId', new ParseIntPipe({ optional: true }))
    userPlantId?: number,
  ) {
    return this.assistant.history(caller, userPlantId);
  }

  @Post('messages')
  ask(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(askSchema)) body: AskBody,
  ) {
    return this.assistant.ask(caller, body);
  }
}
