import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStoreCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UpdateStoreCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
