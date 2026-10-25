import { applyDecorators, HttpCode, HttpStatus, Post } from '@nestjs/common';

/**
 * POST that answers 200 instead of Nest's default 201: the app checks
 * `response.status === 200` and treats 201 as a failure (sign-up would show
 * an error, checkout would open OrderFailed).
 */
export const LegacyPost = (path: string) =>
  applyDecorators(Post(path), HttpCode(HttpStatus.OK));
