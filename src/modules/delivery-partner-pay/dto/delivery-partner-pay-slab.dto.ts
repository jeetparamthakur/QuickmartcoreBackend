import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDeliveryPartnerPaySlabDto {
  @IsOptional()
  @IsUUID()
  partnerProfileId?: string | null;

  @IsOptional()
  @IsUUID()
  zoneId?: string | null;

  @IsNumber()
  @Min(0)
  minKm!: number;

  @IsNumber()
  @Min(0)
  maxKm!: number;

  @IsNumber()
  @Min(0)
  fee!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDeliveryPartnerPaySlabDto {
  @IsOptional()
  @IsUUID()
  partnerProfileId?: string | null;

  @IsOptional()
  @IsUUID()
  zoneId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
