import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type AssetUrl,
  assetUrlBuilder,
  plantInclude,
  toLegacyBanner,
  toLegacyCategory,
  toLegacyColor,
  toLegacyLookup,
  toLegacyPlant,
  toLegacySlide,
} from './legacy.mapper.js';

@Injectable()
export class CatalogService {
  private readonly assetUrl: AssetUrl;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.assetUrl = assetUrlBuilder(
      config.get('ASSET_BASE_URL', { infer: true }),
    );
  }

  /**
   * Active plants that can be bought. The app has no out-of-stock UI yet,
   * so sold-out plants are left out instead of failing at checkout.
   */
  async plants() {
    const plants = await this.prisma.plant.findMany({
      where: { active: true, stock: { gt: 0 } },
      include: plantInclude,
      orderBy: { id: 'asc' },
    });
    return plants.map((plant) => toLegacyPlant(plant, this.assetUrl));
  }

  async categories() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    return categories.map((category) =>
      toLegacyCategory(category, this.assetUrl),
    );
  }

  async colors() {
    const colors = await this.prisma.color.findMany({ orderBy: { id: 'asc' } });
    return colors.map(toLegacyColor);
  }

  async potTypes() {
    const types = await this.prisma.potType.findMany({
      orderBy: { id: 'asc' },
    });
    return types.map(toLegacyLookup);
  }

  async plantTypes() {
    const types = await this.prisma.plantType.findMany({
      orderBy: { id: 'asc' },
    });
    return types.map(toLegacyLookup);
  }

  async slides() {
    const slides = await this.prisma.slide.findMany({
      where: { active: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    return slides.map((slide) => toLegacySlide(slide, this.assetUrl));
  }

  async banners() {
    const banners = await this.prisma.banner.findMany({
      where: { active: true },
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });
    return banners.map((banner) => toLegacyBanner(banner, this.assetUrl));
  }
}
