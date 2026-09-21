import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '../../common/enums/service-type.enum';

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
  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiPropertyOptional({ example: 4 })
  @ValidateIf(
    (order: CreateOrderDto) => order.serviceType === ServiceType.DINE_IN,
  )
  @IsInt()
  @Min(1)
  tableNumber?: number;

  @ApiPropertyOptional({ example: 'dkr-plateau-centre' })
  @ValidateIf(
    (order: CreateOrderDto) => order.serviceType === ServiceType.DELIVERY,
  )
  @IsString()
  deliveryZoneId?: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (order: CreateOrderDto) => order.serviceType === ServiceType.DELIVERY,
  )
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
