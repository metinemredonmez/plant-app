import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { type AuthUser, CurrentUser } from '../auth/auth.decorators.js';
import { OrdersService } from './orders.service.js';

@Controller('order')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(':userId')
  list(
    @CurrentUser() caller: AuthUser,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.orders.listForUser(caller, userId);
  }
}
