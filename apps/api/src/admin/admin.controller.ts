import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';

import { type AuthUser, CurrentUser, Roles } from '../auth/auth.decorators.js';
import { ZodBody } from '../common/zod-body.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminService, resolveSchema } from './admin.service.js';
import { AuditService } from './audit.service.js';
import {
  draftSchema,
  type SpeciesBody,
  type SpeciesPatch,
  SpeciesAdminService,
  speciesPatchSchema,
  speciesSchema,
} from './species-admin.service.js';

/**
 * Admin panel API (ADR 0015). Experts (STAFF) edit care cards and the
 * reports queue; people, costs and the audit log are ADMIN only. A customer
 * token gets 403 on every route here.
 */
@Controller('v1/admin')
@Roles('ADMIN', 'STAFF')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly species: SpeciesAdminService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  /** Who is signed in to the panel. */
  @Get('me')
  async me(@CurrentUser() caller: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: caller.id },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  }

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  // Care cards
  @Get('species')
  listSpecies(@Query('q') q?: string, @Query('status') status?: string) {
    return this.species.list(
      q,
      status === 'DRAFT' || status === 'PUBLISHED' ? status : undefined,
    );
  }

  @Get('species/:id')
  speciesDetail(@Param('id', ParseIntPipe) id: number) {
    return this.species.detail(id);
  }

  @Post('species')
  createSpecies(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(speciesSchema)) body: SpeciesBody,
  ) {
    return this.species.create(caller, body);
  }

  @Patch('species/:id')
  updateSpecies(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodBody(speciesPatchSchema)) body: SpeciesPatch,
  ) {
    return this.species.update(caller, id, body);
  }

  @Post('species/:id/approve')
  @HttpCode(200)
  approveSpecies(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.species.approve(caller, id);
  }

  @Post('species/drafts')
  draftSpecies(
    @CurrentUser() caller: AuthUser,
    @Body(new ZodBody(draftSchema)) body: z.output<typeof draftSchema>,
  ) {
    return this.species.draft(caller, body.scientificName);
  }

  // Reported answers
  @Get('reports')
  reports(@Query('state') state?: string) {
    return this.admin.reports(state === 'closed' ? 'closed' : 'open');
  }

  @Post('reports/:id/resolve')
  @HttpCode(200)
  resolveReport(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodBody(resolveSchema)) body: z.output<typeof resolveSchema>,
  ) {
    return this.admin.resolveReport(caller, id, body.resolution);
  }

  // People, costs, audit: the owner only
  @Get('users')
  @Roles('ADMIN')
  users(@Query('q') q?: string) {
    return this.admin.findUsers(q);
  }

  @Get('users/:id')
  @Roles('ADMIN')
  user(@Param('id', ParseIntPipe) id: number) {
    return this.admin.user(id);
  }

  @Post('users/:id/anonymize')
  @Roles('ADMIN')
  @HttpCode(200)
  anonymize(
    @CurrentUser() caller: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.admin.anonymize(caller, id);
  }

  @Get('costs')
  @Roles('ADMIN')
  costs(@Query('days') days?: string) {
    return this.admin.costs(Number(days) || 30);
  }

  @Get('audit')
  @Roles('ADMIN')
  auditLog(@Query('take') take?: string) {
    return this.audit.list(Number(take) || 100);
  }
}
