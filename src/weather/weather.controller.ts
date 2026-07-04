import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('weather')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir la météo pour une ville' })
  @ApiQuery({ name: 'city', required: true, example: 'Dakar' })
  getWeather(@Query('city') city: string) {
    return this.weatherService.getWeather(city);
  }
}