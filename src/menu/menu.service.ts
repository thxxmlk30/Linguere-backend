import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MenuItem } from './entities/menu-item.entity';
import { MenuItemIngredient } from './entities/menu-item-ingredient.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Ingredient } from '../ingredients/entities/ingredient.entity';
import { CreateMenuItemDto, RecipeItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MealCategory } from '../common/enums/meal-category.enum';

const MENU_CACHE_KEY = 'menu:all';
const MENU_CACHE_TTL = 60; // secondes

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem) private menuRepository: Repository<MenuItem>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(MenuItemIngredient)
    private recipeRepository: Repository<MenuItemIngredient>,
    @InjectRepository(Ingredient)
    private ingredientsRepository: Repository<Ingredient>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(category?: MealCategory): Promise<MenuItem[]> {
    // Le cache ne s'applique que sur la liste complète (cas le plus fréquent
    // pour le dashboard / la carte du restaurant)
    if (!category) {
      const cached = await this.cacheManager.get<MenuItem[]>(MENU_CACHE_KEY);
      if (cached) return cached;

      const items = await this.menuRepository.find({
        order: { category: 'ASC', name: 'ASC' },
      });
      await this.cacheManager.set(MENU_CACHE_KEY, items, MENU_CACHE_TTL * 1000);
      return items;
    }

    return this.menuRepository.find({
      where: { category },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<MenuItem> {
    const item = await this.menuRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Plat introuvable (id: ${id})`);
    }
    return item;
  }

  async findOneWithRecipe(id: string): Promise<MenuItem> {
    const item = await this.menuRepository.findOne({
      where: { id },
      relations: { recipe: { ingredient: true } },
    });
    if (!item) {
      throw new NotFoundException(`Plat introuvable (id: ${id})`);
    }
    return item;
  }

  async create(dto: CreateMenuItemDto): Promise<MenuItem> {
    const { recipe, ...itemData } = dto;
    const item = this.menuRepository.create(itemData);
    const saved = await this.menuRepository.save(item);
    await this.replaceRecipe(saved.id, recipe);
    await this.invalidateCache();
    return this.findOneWithRecipe(saved.id);
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.findOne(id);
    const { recipe, ...itemData } = dto;
    Object.assign(item, itemData);
    const saved = await this.menuRepository.save(item);
    if (recipe !== undefined) {
      await this.replaceRecipe(saved.id, recipe);
    }
    await this.invalidateCache();
    return this.findOneWithRecipe(saved.id);
  }

  /**
   * Remplace entierement la recette d'un plat. `undefined` => on ne touche
   * pas a la recette existante ; `[]` => on l'efface.
   */
  private async replaceRecipe(
    menuItemId: string,
    recipe: RecipeItemDto[] | undefined,
  ) {
    if (recipe === undefined) {
      return;
    }

    if (recipe.length > 0) {
      const uniqueIngredientIds = [
        ...new Set(recipe.map((line) => line.ingredientId)),
      ];
      const found = await this.ingredientsRepository.find({
        where: { id: In(uniqueIngredientIds) },
      });
      if (found.length !== uniqueIngredientIds.length) {
        const foundIds = new Set(found.map((ingredient) => ingredient.id));
        const missing = uniqueIngredientIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Ingrédient(s) introuvable(s) : ${missing.join(', ')}`,
        );
      }
    }

    await this.recipeRepository.delete({ menuItemId });

    if (recipe.length > 0) {
      const rows = recipe.map((line) =>
        this.recipeRepository.create({
          menuItemId,
          ingredientId: line.ingredientId,
          quantityRequired: line.quantityRequired,
        }),
      );
      await this.recipeRepository.save(rows);
    }
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);

    const referencedByOrders = await this.orderItemsRepository.count({
      where: { menuItemId: id },
    });
    if (referencedByOrders > 0) {
      throw new ConflictException(
        `"${item.name}" a déjà été commandé et ne peut pas être supprimé ` +
          '(marquez-le indisponible à la place)',
      );
    }

    await this.menuRepository.remove(item);
    await this.invalidateCache();
  }

  private async invalidateCache() {
    await this.cacheManager.del(MENU_CACHE_KEY);
  }
}
