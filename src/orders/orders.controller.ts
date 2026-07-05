import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

interface RequestUser {
  id: string;
  role: Role;
}

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une commande (client connecté)' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les commandes (les siennes, ou toutes si admin)',
  })
  findAll(@CurrentUser() user: RequestUser) {
    return this.ordersService.findAllForUser(user);
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Mes commandes (client connecté)' })
  myOrders(@CurrentUser() user: RequestUser) {
    return this.ordersService.findMine(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une commande" })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.ordersService.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Changer le statut d'une commande (admin uniquement)",
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
