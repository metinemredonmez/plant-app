import { Module } from '@nestjs/common';

import { LegalModule } from '../legal/legal.module.js';
import { ConsentsController } from './consents.controller.js';
import { ConsentsService } from './consents.service.js';

@Module({
  imports: [LegalModule],
  controllers: [ConsentsController],
  providers: [ConsentsService],
  exports: [ConsentsService],
})
export class ConsentsModule {}
