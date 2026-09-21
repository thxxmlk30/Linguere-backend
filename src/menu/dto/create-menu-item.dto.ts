import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealCategory } from '../../common/enums/meal-category.enum';

export class RecipeItemDto {
  @ApiProperty({ example: 'uuid-de-l-ingredient' })
  @IsString()
  ingredientId: string;

  @ApiProperty({ example: 0.3, description: 'Quantité consommée par plat' })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantityRequired: number;
}

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

  @ApiProperty({ enum: MealCategory, example: MealCategory.PLAT })
  @IsEnum(MealCategory)
  category: MealCategory;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ example: 'https://.../thieb.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: 'lunch' })
  @IsOptional()
  @IsString()
  meal?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prepTimeMinutes?: number;

  @ApiPropertyOptional({
    type: [RecipeItemDto],
    description:
      'Ingrédients consommés par ce plat (optionnel). Un tableau vide efface la recette existante.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  recipe?: RecipeItemDto[];
}
