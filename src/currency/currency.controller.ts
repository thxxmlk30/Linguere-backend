import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { GetRatesQueryDto } from './dto/get-rates-query.dto';
import { ConvertCurrencyQueryDto } from './dto/convert-currency-query.dto';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('rates')
  @ApiOperation({
    summary: 'Taux de change actuels pour une devise de base (ex: XOF)',
  })
  getRates(@Query() query: GetRatesQueryDto) {
    return this.currencyService.getRates(query.base);
  }

  @Get('convert')
  @ApiOperation({
    summary: "Convertir un montant d'une devise vers une autre",
  })
  convert(@Query() query: ConvertCurrencyQueryDto) {
    return this.currencyService.convert(query.from, query.to, query.amount);
  }
}
