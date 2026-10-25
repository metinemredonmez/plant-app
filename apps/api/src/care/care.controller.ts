import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { type AuthUser, CurrentUser, Public } from '../auth/auth.decorators.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import {
  type CareEventBody,
  careEventSchema,
  type CreatePlantBody,
  createPlantSchema,
  MyPlantsService,
  type UpdatePlantBody,
  updatePlantSchema,
} from './my-plants.service.js';
import { SpeciesService } from './species.service.js';

@Public()
@Controller('v1/species')
export class SpeciesController {
  constructor(private readonly species: SpeciesService) {}

  @Get()
  search(@Query('q') q?: string) {
    return this.species.search(q);
  }

  @Get(':id')
  card(@Param('id', ParseIntPipe) id: number) {
    return this.species.card(id);
  }
}

@Controller('v1/my')
export class MyPlantsController {
  constructor(private readonly plants: MyPlantsService) {}

  @Get('plants')
  list(@CurrentUser() caller: AuthUser) {
    return this.plants.list(caller);
  }

  @Get('today')
  today(@CurrentUser() caller: AuthUser) {
    return this.plants.today(caller);
  }

  @Post('plants')
  create(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(createPlantSchema)) body: CreatePlantBody,
  ) {
    return this.plants.create(caller, body);
  }

  @Get('plants/:id')
  detail(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.plants.detail(caller, id);
  }

  @Patch('plants/:id')
  update(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodBody(updatePlantSchema)) body: UpdatePlantBody,
  ) {
    return this.plants.update(caller, id, body);
  }

  @Delete('plants/:id')
  remove(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.plants.remove(caller, id);
  }

  @Post('plants/:id/care')
  logCare(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodBody(careEventSchema)) body: CareEventBody,
  ) {
    return this.plants.logCare(caller, id, body);
  }
}
