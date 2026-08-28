import { IsArray, IsDefined, IsObject, IsOptional, IsString } from 'class-validator';

export class QuickOrderDto {
  @IsDefined()
  @IsObject()
  customerInfo: Record<string, any>;

  @IsDefined()
  @IsArray()
  items: any[];

  @IsOptional()
  @IsString()
  paymentMethod?: string;

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
  @IsString()
  deliveryType?: string;

  @IsOptional()
  soldFromStore?: boolean;
}
