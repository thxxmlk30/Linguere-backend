import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrderItemInputDto {
  @ApiProperty({ example: 'uuid-du-menu-item' })
  @IsString()
  menuItemId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1, { message: 'La quantité doit être au moins 1' })
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ enum: ['dine_in', 'delivery'] })
  @IsIn(['dine_in', 'delivery'])
  serviceType: 'dine_in' | 'delivery';

  @ApiPropertyOptional({ example: 4 })
  @ValidateIf((order: CreateOrderDto) => order.serviceType === 'dine_in')
  @IsInt()
  @Min(1)
  tableNumber?: number;

  @ApiPropertyOptional({ example: 'dkr-plateau-centre' })
  @ValidateIf((order: CreateOrderDto) => order.serviceType === 'delivery')
  @IsString()
  deliveryZoneId?: string;

  @ApiPropertyOptional()
  @ValidateIf((order: CreateOrderDto) => order.serviceType === 'delivery')
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deliveryNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'La commande doit contenir au moins un article' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}
