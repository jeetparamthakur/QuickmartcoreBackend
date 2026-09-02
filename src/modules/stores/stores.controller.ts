import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { ProductsService } from '../products/products.service';
import { StoresRepository } from './stores.repository';
import { NotFoundException } from '@nestjs/common';

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesRepo: StoresRepository,
    private readonly productsService: ProductsService,
  ) {}

  @Public()
  @Get()
  list() {
    return this.storesRepo.findAllActive();
  }

  @Public()
  @Get(':id/products')
  async storeProducts(@Param('id', ParseUUIDPipe) id: string) {
    const store = await this.storesRepo.findById(id);
    if (!store) {
      throw new NotFoundException({
        message: 'Store not found',
        errorCode: 'STORE_NOT_FOUND',
      });
    }
    return this.productsService.listByStore(id);
  }
}
