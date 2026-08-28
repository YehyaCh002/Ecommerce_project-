import { IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  updateData?: any;

  @IsOptional()
  @IsString()
  note?: string;
}