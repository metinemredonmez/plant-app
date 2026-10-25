import { Module } from '@nestjs/common';

import { BillingModule } from '../billing/billing.module.js';
import {
  CitiesController,
  MyPlantsController,
  SpeciesController,
} from './care.controller.js';
import { MyPlantsService } from './my-plants.service.js';
import { SpeciesService } from './species.service.js';

@Module({
  imports: [BillingModule],
  controllers: [SpeciesController, CitiesController, MyPlantsController],
  providers: [SpeciesService, MyPlantsService],
  exports: [SpeciesService, MyPlantsService],
})
export class CareModule {}
