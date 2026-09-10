import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { AdminProductsService } from './admin-products.service';
import { RejectSellerProductDto } from './dto/reject-seller-product.dto';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Post(':id/reject')
  rejectIndependentProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectSellerProductDto,
  ) {
    return this.adminProductsService.rejectIndependentProduct(id, dto.reason);
  }
}
