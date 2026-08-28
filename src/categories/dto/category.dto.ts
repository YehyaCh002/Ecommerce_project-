import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  parentCategoryId?: number;
}