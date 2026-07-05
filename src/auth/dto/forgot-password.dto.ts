import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'client@linguere.sn' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;
}
