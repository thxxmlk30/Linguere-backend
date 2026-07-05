import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingredient } from './entities/ingredient.entity';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(Ingredient)
    private ingredientsRepository: Repository<Ingredient>,
  ) {}

  findAll() {
    return this.ingredientsRepository.find({ order: { name: 'ASC' } });
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
    Object.assign(ingredient, {
      ...dto,
      lastRestockedAt: dto.lastRestockedAt
        ? new Date(dto.lastRestockedAt)
        : dto.lastRestockedAt,
      lastCountedAt: dto.lastCountedAt
        ? new Date(dto.lastCountedAt)
        : dto.lastCountedAt,
    });
    return this.ingredientsRepository.save(ingredient);
  }

  async remove(id: string) {
    const ingredient = await this.findOne(id);
    await this.ingredientsRepository.remove(ingredient);
  }
}
