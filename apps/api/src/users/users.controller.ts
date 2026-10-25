import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';

import {
  type AuthUser,
  AuthRateLimited,
  CurrentUser,
  Public,
} from '../auth/auth.decorators.js';
import { LegacyPost } from '../common/legacy-post.decorator.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import {
  type LoginBody,
  loginSchema,
  type SignUpBody,
  signUpSchema,
  type UpdateProfileBody,
  updateProfileSchema,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

/** The legacy `/api/user/...` routes, now behind real sessions. */
@Controller('user')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Public()
  @AuthRateLimited()
  @LegacyPost('create')
  signUp(@Body(new ZodBody(signUpSchema)) body: SignUpBody) {
    return this.users.signUp(body);
  }

  @Public()
  @AuthRateLimited()
  @LegacyPost('login')
  login(@Body(new ZodBody(loginSchema)) body: LoginBody) {
    return this.users.login(body);
  }

  @Get(':id')
  findOne(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.users.findSelf(caller, id);
  }

  @Put('update/:id')
  update(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodBody(updateProfileSchema)) body: UpdateProfileBody,
  ) {
    return this.users.updateProfile(caller, id, body);
  }

  @Delete('delete/:id')
  remove(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.users.deleteAccount(caller, id);
  }
}
