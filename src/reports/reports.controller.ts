import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@UseInterceptors(CacheInterceptor)
@CacheTTL(60_000)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Statistiques du dashboard (admin, cache 60s)' })
  dashboard() {
    return this.reportsService.dashboard();
  }

  @Get('top-items')
  @ApiOperation({ summary: 'Plats les plus vendus (admin, cache 60s)' })
  topItems(@Query('limit') limit?: string) {
    return this.reportsService.topItems(limit ? Number(limit) : 5);
  }
}
