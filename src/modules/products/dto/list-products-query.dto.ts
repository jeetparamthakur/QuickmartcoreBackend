import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PartnerType } from '../../../common/enums';

export class ListProductsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['food', 'retail'])
  productType?: 'food' | 'retail';

  @IsOptional()
  @IsEnum(PartnerType)
  partnerType?: PartnerType;

  /** Comma-separated store UUIDs */
  @IsOptional()
  @IsString()
  storeIds?: string;
}
