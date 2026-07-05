import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
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
  @ApiOperation({ summary: 'Lister les ingrédients (admin)' })
  findAll() {
    return this.ingredientsService.findAll();
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
