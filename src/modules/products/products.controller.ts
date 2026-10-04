import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductsService } from './products.service';
import { ProductListFilters } from './products.repository';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Public()
  @Get()
  list(@Query() query: ListProductsQueryDto) {
    const storeIds = query.storeIds
      ? query.storeIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;

    const filters: ProductListFilters = {
      categoryId: query.categoryId,
      storeId: query.storeId,
      q: query.q,
      productType: query.productType,
      partnerType: query.partnerType,
      storeIds,
    };

    return this.service.list(query.page ?? 1, query.limit ?? 20, filters);
  }

  @Public()
  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }
}
