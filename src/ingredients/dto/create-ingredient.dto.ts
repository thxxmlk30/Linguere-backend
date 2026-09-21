import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IngredientUnit } from '../../common/enums/ingredient-unit.enum';

export class CreateIngredientDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock: number;

  @ApiProperty({ enum: IngredientUnit })
  @IsEnum(IngredientUnit)
  unit: IngredientUnit;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderThreshold: number;

  @ApiProperty({ example: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  criticalStock: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastRestockedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastCountedAt?: string;
}
