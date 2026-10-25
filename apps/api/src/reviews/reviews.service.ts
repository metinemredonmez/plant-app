import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';

import type { AuthUser } from '../auth/auth.decorators.js';
import { displayDate } from '../common/display-date.js';
import { Prisma, type Review, type User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

// The app also sends `name` and `email`; both are ignored; the reviewer
// is the session's user.
export const createReviewSchema = z.looseObject({
  plantId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(500),
});
export type CreateReviewBody = z.output<typeof createReviewSchema>;

/**
 * Public name of a reviewer: first name and the initial of the last name
 * ("Ayşe Y."). The e-mail address is never published.
 */
export function reviewerName(user: Pick<User, 'name' | 'anonymizedAt'>) {
  if (user.anonymizedAt) return 'Eski müşteri';
  const [first, ...rest] = user.name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toLocaleUpperCase('tr-TR')}.` : first;
}

export const toLegacyReview = (
  review: Review & { user: Pick<User, 'name' | 'anonymizedAt'> },
) => ({
  id: review.id,
  name: reviewerName(review.user),
  rating: review.rating,
  comment: review.comment,
  createdAt: displayDate(review.createdAt),
});

const reviewerSelect = { select: { name: true, anonymizedAt: true } } as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Oldest first: the Product screen reverses the list to show the newest. */
  async listForPlant(plantId: number) {
    const reviews = await this.prisma.review.findMany({
      where: { plantId, hidden: false },
      include: { user: reviewerSelect },
      orderBy: { createdAt: 'asc' },
    });
    return { reviews: reviews.map(toLegacyReview) };
  }

  async create(caller: AuthUser, body: CreateReviewBody) {
    const plant = await this.prisma.plant.findUnique({
      where: { id: body.plantId },
    });
    if (!plant) throw new NotFoundException('Bitki bulunamadı');

    // Verified purchase: the plant was in one of the caller's delivered orders.
    const delivered = await this.prisma.orderItem.findFirst({
      where: {
        plantId: plant.id,
        order: { userId: caller.id, status: 'delivered' },
      },
    });
    if (!delivered) {
      throw new ForbiddenException(
        'Yorum yapabilmek için bu bitkiyi teslim almış olmalısınız',
      );
    }

    const review = await this.prisma
      .$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            userId: caller.id,
            plantId: plant.id,
            rating: body.rating,
            comment: body.comment,
          },
          include: { user: reviewerSelect },
        });
        await refreshPlantRating(tx, plant.id);
        return created;
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Bu bitkiye zaten yorum yaptınız');
        }
        throw error;
      });
    return { review: toLegacyReview(review) };
  }
}

/** Recomputes the plant's rating from its visible reviews. */
export async function refreshPlantRating(
  tx: Prisma.TransactionClient,
  plantId: number,
) {
  const stats = await tx.review.aggregate({
    where: { plantId, hidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await tx.plant.update({
    where: { id: plantId },
    data: { ratingAvg: stats._avg.rating ?? 0, ratingCount: stats._count },
  });
}
