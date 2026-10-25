import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';

import { type AuthUser, CurrentUser } from '../auth/auth.decorators.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import { ScansService, type UploadedImage } from './scans.service.js';

// Phones resize to ~1024 px before upload; 8 MB leaves room for HEIC.
const upload = FileInterceptor('image', {
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

const diagnoseSchema = z.looseObject({
  userPlantId: z.coerce.number().int().positive().optional(),
});

@Controller('v1/scans')
export class ScansController {
  constructor(private readonly scans: ScansService) {}

  @Post('identify')
  @UseInterceptors(upload)
  identify(
    @CurrentUser() caller: AuthUser,
    @UploadedFile() file: UploadedImage | undefined,
  ) {
    return this.scans.identify(caller, file);
  }

  @Post('diagnose')
  @UseInterceptors(upload)
  diagnose(
    @CurrentUser() caller: AuthUser,
    @UploadedFile() file: UploadedImage | undefined,
    @Body(new ZodBody(diagnoseSchema)) body: z.output<typeof diagnoseSchema>,
  ) {
    return this.scans.diagnose(caller, file, body.userPlantId);
  }

  @Get()
  list(@CurrentUser() caller: AuthUser) {
    return this.scans.list(caller);
  }

  @Get(':id')
  detail(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.scans.detail(caller, id);
  }
}
