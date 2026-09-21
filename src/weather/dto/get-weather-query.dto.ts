import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetWeatherQueryDto {
  @ApiProperty({ example: 'Dakar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(85)
  city: string;
}
