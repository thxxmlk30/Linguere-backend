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
import { TopItemsQueryDto } from './dto/top-items-query.dto';
import { RevenueTrendQueryDto } from './dto/revenue-trend-query.dto';
import { CancellationsQueryDto } from './dto/cancellations-query.dto';

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
  topItems(@Query() query: TopItemsQueryDto) {
    return this.reportsService.topItems(query.limit ?? 5);
  }

  @Get('revenue-trend')
  @ApiOperation({
    summary: "Tendance du chiffre d'affaires sur N jours (admin, cache 60s)",
  })
  revenueTrend(@Query() query: RevenueTrendQueryDto) {
    return this.reportsService.revenueTrend(query.days ?? 7);
  }

  @Get('cancellations')
  @ApiOperation({
    summary: "Taux d'annulation sur N jours (admin, cache 60s)",
  })
  cancellations(@Query() query: CancellationsQueryDto) {
    return this.reportsService.cancellationStats(query.days ?? 30);
  }

  @Get('profitability')
  @ApiOperation({ summary: 'Plats les plus rentables (admin, cache 60s)' })
  profitability(@Query() query: TopItemsQueryDto) {
    return this.reportsService.profitability(query.limit ?? 10);
  }
}
