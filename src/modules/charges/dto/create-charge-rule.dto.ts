import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ChargeType } from '../../../common/enums';

export class ChargeConditionsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCartTotal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minCartValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minDistanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistanceKm?: number;

  @IsOptional()
  @IsString()
  zoneId?: string;
}

export class CreateChargeRuleDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(ChargeType)
  type!: ChargeType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsObject()
  conditions?: ChargeConditionsDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateChargeRuleDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ChargeType)
  type?: ChargeType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsObject()
  conditions?: ChargeConditionsDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
