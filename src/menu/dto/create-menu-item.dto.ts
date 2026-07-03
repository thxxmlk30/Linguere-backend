import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealCategory } from '../../common/enums/meal-category.enum';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Thiéboudienne' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Riz au poisson, plat national sénégalais' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 3500 })
  @IsNumber()
  @Min(0, { message: 'Le prix ne peut pas être négatif' })
  price: number;

  @ApiProperty({ enum: MealCategory, example: MealCategory.LUNCH })
  @IsEnum(MealCategory)
  category: MealCategory;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ example: 'https://.../thieb.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
