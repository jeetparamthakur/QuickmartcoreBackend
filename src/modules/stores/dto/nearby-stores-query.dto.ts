import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PartnerType } from '../../../common/enums';

export class NearbyStoresQueryDto {
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number;

  @IsOptional()
  @IsEnum(PartnerType)
  partnerType?: PartnerType;
}
