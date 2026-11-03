import { Module } from '@nestjs/common';

import { LegalController, MyLegalController } from './legal.controller.js';
import { LegalService } from './legal.service.js';

@Module({
  controllers: [LegalController, MyLegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
