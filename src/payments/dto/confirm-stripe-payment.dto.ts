import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmStripePaymentDto {
  @ApiProperty({ example: 'cs_test_a1b2c3' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
