import { Injectable } from '@nestjs/common';

import { assertSelf } from '../auth/assert-self.js';
import type { AuthUser } from '../auth/auth.decorators.js';
import { displayDate } from '../common/display-date.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const orderInclude = {
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;

type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const toLira = (kurus: number) => kurus / 100;

/** OrderHistory's shape. The line `id` is the PLANT id (review gate). */
export const toLegacyOrder = (order: OrderWithItems) => ({
  id: order.id,
  total: toLira(order.totalKurus),
  delivery: toLira(order.deliveryKurus),
  orderStatus: order.status,
  createdAt: displayDate(order.createdAt),
  products: order.items.map((item) => ({
    id: item.plantId,
    name: item.nameSnapshot,
    price: toLira(item.unitPriceKurus),
    quantity: item.quantity,
    ...(item.color ? { color: item.color } : {}),
  })),
});

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Always `{orders}`, even when empty: OrderHistory reads `.length`. */
  async listForUser(caller: AuthUser, userId: number) {
    assertSelf(caller, userId);
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { orders: orders.map(toLegacyOrder) };
  }
}
