import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { ProductsService } from '../products/products.service';
import { NearbyStoresQueryDto } from './dto/nearby-stores-query.dto';
import { StoresGeoService } from './stores-geo.service';
import { StoresRepository } from './stores.repository';
import { NotFoundException } from '@nestjs/common';

const DEFAULT_CUSTOMER_RADIUS_KM = 10;

@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesRepo: StoresRepository,
    private readonly productsService: ProductsService,
    private readonly storesGeo: StoresGeoService,
  ) {}

  @Public()
  @Get()
  list() {
    return this.storesRepo.findAllActive();
  }

  @Public()
  @Get('nearby')
  nearby(@Query() query: NearbyStoresQueryDto) {
    const lat = Number(query.lat);
    const lng = Number(query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat and lng query parameters are required');
    }
    const radiusKm = query.radiusKm ?? DEFAULT_CUSTOMER_RADIUS_KM;
    return this.storesGeo.findNearby(lat, lng, radiusKm, query.partnerType);
  }

  @Public()
  @Get(':id/products')
  async storeProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('productType') productType?: 'food' | 'retail',
  ) {
    const store = await this.storesRepo.findById(id);
    if (!store) {
      throw new NotFoundException({
        message: 'Store not found',
        errorCode: 'STORE_NOT_FOUND',
      });
    }
    return this.productsService.listByStore(id, productType);
  }
}
