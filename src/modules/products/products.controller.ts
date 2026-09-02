import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Public()
  @Get()
  list(
    @Query() pagination: PaginationDto,
    @Query('categoryId') categoryId?: string,
    @Query('storeId') storeId?: string,
    @Query('q') q?: string,
  ) {
    return this.service.list(
      pagination.page ?? 1,
      pagination.limit ?? 20,
      categoryId,
      storeId,
      q,
    );
  }

  @Public()
  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }
}
