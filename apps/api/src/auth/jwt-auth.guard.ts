import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { type AuthenticatedRequest, IS_PUBLIC } from './auth.decorators.js';
import { TokenService } from './token.service.js';

/**
 * Global guard: every route needs a valid access token unless it is marked
 * @Public(). Deny by default, so a new endpoint cannot leak data by accident.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Bu işlem için giriş yapmalısınız');
    }
    request.user = await this.tokens.verifyAccess(token);
    return true;
  }
}
