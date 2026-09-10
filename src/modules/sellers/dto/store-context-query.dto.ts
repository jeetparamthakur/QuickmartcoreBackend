import { IsOptional, IsUUID } from 'class-validator';

export class StoreContextQueryDto {
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
