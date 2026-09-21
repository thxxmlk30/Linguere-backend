import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { RequestUser } from '../common/types/request-user.type';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Lister tous les utilisateurs (admin uniquement)' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data, total } = await this.usersService.findAll(pagination);
    res.set('X-Total-Count', String(total));
    return data;
  }

  @Get('me')
  @ApiOperation({ summary: "Obtenir le profil de l'utilisateur connecté" })
  getProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtenir un utilisateur par ID (admin uniquement)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
