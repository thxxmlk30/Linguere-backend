import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'client@linguere.sn' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Code à 6 chiffres reçu par email',
  })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir 6 chiffres' })
  code: string;

  @ApiProperty({ example: 'NouveauMotDePasse123' })
  @IsString()
  @MinLength(6, {
    message: 'Le mot de passe doit contenir au moins 6 caractères',
  })
  newPassword: string;
}
