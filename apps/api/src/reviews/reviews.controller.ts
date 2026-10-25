import { Body, Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { type AuthUser, CurrentUser, Public } from '../auth/auth.decorators.js';
import { LegacyPost } from '../common/legacy-post.decorator.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import {
  type CreateReviewBody,
  createReviewSchema,
  ReviewsService,
} from './reviews.service.js';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('reviews/:plantId')
  list(@Param('plantId', ParseIntPipe) plantId: number) {
    return this.reviews.listForPlant(plantId);
  }

  @LegacyPost('review/create')
  create(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(createReviewSchema)) body: CreateReviewBody,
  ) {
    return this.reviews.create(caller, body);
  }
}
