import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockPartnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
