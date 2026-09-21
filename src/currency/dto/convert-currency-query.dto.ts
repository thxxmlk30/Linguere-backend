import { Type } from 'class-transformer';
import { IsNumber, IsPositive, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertCurrencyQueryDto {
  @ApiProperty({ example: 'XOF' })
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'from doit etre un code devise ISO-4217 (3 lettres)',
  })
  from: string;

  @ApiProperty({ example: 'EUR' })
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'to doit etre un code devise ISO-4217 (3 lettres)',
  })
  to: string;

  @ApiProperty({ example: 1000 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;
}
