import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingredient } from './entities/ingredient.entity';
import { MenuItemIngredient } from '../menu/entities/menu-item-ingredient.entity';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(Ingredient)
    private ingredientsRepository: Repository<Ingredient>,
    @InjectRepository(MenuItemIngredient)
    private recipeRepository: Repository<MenuItemIngredient>,
  ) {}

  findAll() {
    return this.ingredientsRepository.find({ order: { name: 'ASC' } });
  }

  async findLowStock() {
    const all = await this.ingredientsRepository.find({
      order: { name: 'ASC' },
    });
    return all.filter(
      (ingredient) => ingredient.currentStock <= ingredient.reorderThreshold,
    );
  }

  async findOne(id: string) {
    const ingredient = await this.ingredientsRepository.findOne({
      where: { id },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingrédient introuvable (id: ${id})`);
    }

    return ingredient;
  }

  create(dto: CreateIngredientDto) {
    return this.ingredientsRepository.save(
      this.ingredientsRepository.create({
        ...dto,
        lastRestockedAt: dto.lastRestockedAt
          ? new Date(dto.lastRestockedAt)
          : null,
        lastCountedAt: dto.lastCountedAt ? new Date(dto.lastCountedAt) : null,
      }),
    );
  }

  async update(id: string, dto: UpdateIngredientDto) {
    const ingredient = await this.findOne(id);
    Object.assign(ingredient, dto);

    // Ne toucher ces deux champs que si le DTO les fournit explicitement :
    // sinon Object.assign écraserait la date existante avec `undefined`
    // (silencieusement, sans que la mise à jour partielle en soit responsable).
    if (dto.lastRestockedAt !== undefined) {
      ingredient.lastRestockedAt = new Date(dto.lastRestockedAt);
    }
    if (dto.lastCountedAt !== undefined) {
      ingredient.lastCountedAt = new Date(dto.lastCountedAt);
    }

    return this.ingredientsRepository.save(ingredient);
  }

  async remove(id: string) {
    const ingredient = await this.findOne(id);

    const referencedByRecipes = await this.recipeRepository.count({
      where: { ingredientId: id },
    });
    if (referencedByRecipes > 0) {
      throw new ConflictException(
        `"${ingredient.name}" est utilisé dans la recette d'au moins un plat et ne peut pas être supprimé`,
      );
    }

    await this.ingredientsRepository.remove(ingredient);
  }
}
