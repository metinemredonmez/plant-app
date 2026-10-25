import { Module } from '@nestjs/common';

import { PromocodesController } from './promocodes.controller.js';
import { PromocodesService } from './promocodes.service.js';

@Module({
  controllers: [PromocodesController],
  providers: [PromocodesService],
  exports: [PromocodesService],
})
export class PromocodesModule {}
