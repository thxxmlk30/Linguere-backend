import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryZoneDto {
  @ApiProperty({ example: 'dkr-plateau-centre' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Plateau' })
  @IsString()
  commune: string;

  @ApiProperty({ example: 'Dakar' })
  @IsString()
  department: string;

  @ApiProperty({ example: 'Plateau centre' })
  @IsString()
  sector: string;

  @ApiPropertyOptional({ example: 'Centre-ville et quartiers proches' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber()
  fee: number;

  @ApiProperty({ example: 25 })
  @Type(() => Number)
  @IsNumber()
  etaMinutes: number;

  @ApiProperty({ example: 14.6937 })
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -17.4441 })
  @Type(() => Number)
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber()
  mapX: number;

  @ApiProperty({ example: 80 })
  @Type(() => Number)
  @IsNumber()
  mapY: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  landmarks: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
