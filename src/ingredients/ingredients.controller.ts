import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('ingredients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CHEF)
  @ApiOperation({ summary: 'Lister les ingrédients (admin, chef en lecture)' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data, total } = await this.ingredientsService.findAll(pagination);
    res.set('X-Total-Count', String(total));
    return data;
  }

  @Get('low-stock')
  @Roles(Role.ADMIN, Role.CHEF)
  @ApiOperation({
    summary:
      'Lister les ingrédients sous leur seuil de réapprovisionnement (admin, chef en lecture)',
  })
  findLowStock() {
    return this.ingredientsService.findLowStock();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un ingrédient (admin)' })
  findOne(@Param('id') id: string) {
    return this.ingredientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un ingrédient (admin)' })
  create(@Body() dto: CreateIngredientDto) {
    return this.ingredientsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un ingrédient (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.ingredientsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un ingrédient (admin)' })
  remove(@Param('id') id: string) {
    return this.ingredientsService.remove(id);
  }
}
