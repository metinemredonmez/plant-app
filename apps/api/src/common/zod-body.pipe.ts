import {
  type PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates a request body with a zod schema. Invalid bodies become
 * 422 {message}: the status the app's verify screens already handle.
 */
export class ZodBody<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path.join('.');
      throw new UnprocessableEntityException(
        field
          ? `${field}: ${issue.message}`
          : (issue?.message ?? 'Geçersiz istek'),
      );
    }
    return result.data;
  }
}
