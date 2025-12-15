import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email adresa za reset lozinke',
  })
  @IsEmail({}, { message: 'Unesite ispravnu email adresu' })
  email!: string;
}
