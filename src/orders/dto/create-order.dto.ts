import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MinLength(1)
  shippingAddress: string;

  @IsString()
  @MinLength(1)
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  internalComment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}
