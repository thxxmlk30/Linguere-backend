import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MealCategory } from '../common/enums/meal-category.enum';

const MENU_CACHE_KEY = 'menu:all';
const MENU_CACHE_TTL = 60; // secondes

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem) private menuRepository: Repository<MenuItem>,
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

  async create(dto: CreateMenuItemDto): Promise<MenuItem> {
    const item = this.menuRepository.create(dto);
    const saved = await this.menuRepository.save(item);
    await this.invalidateCache();
    return saved;
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    const saved = await this.menuRepository.save(item);
    await this.invalidateCache();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.menuRepository.remove(item);
    await this.invalidateCache();
  }

  private async invalidateCache() {
    await this.cacheManager.del(MENU_CACHE_KEY);
  }
}
