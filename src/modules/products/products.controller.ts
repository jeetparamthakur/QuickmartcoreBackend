import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Public()
  @Get()
  list(@Query() query: ListProductsQueryDto) {
    return this.service.list(
      query.page ?? 1,
      query.limit ?? 20,
      query.categoryId,
      query.storeId,
      query.q,
    );
  }

  @Public()
  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }
}
