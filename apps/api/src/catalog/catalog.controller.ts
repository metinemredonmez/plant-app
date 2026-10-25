import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/auth.decorators.js';
import { CatalogService } from './catalog.service.js';

/**
 * The catalog endpoints of the legacy contract. Every list is a bare JSON
 * array: the app turns anything else into an empty screen.
 */
@Public()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('plants')
  plants() {
    return this.catalog.plants();
  }

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get('colors')
  colors() {
    return this.catalog.colors();
  }

  @Get('pot/types')
  potTypes() {
    return this.catalog.potTypes();
  }

  @Get('plant/types')
  plantTypes() {
    return this.catalog.plantTypes();
  }

  @Get('slides')
  slides() {
    return this.catalog.slides();
  }

  @Get('banners')
  banners() {
    return this.catalog.banners();
  }
}
