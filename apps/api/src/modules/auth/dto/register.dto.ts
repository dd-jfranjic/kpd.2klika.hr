import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email adresa korisnika',
  })
  @IsEmail({}, { message: 'Unesite ispravnu email adresu' })
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Lozinka (min 8 znakova, veliko slovo, malo slovo, broj, specijalni znak)',
  })
  @IsString()
  @MinLength(8, { message: 'Lozinka mora imati najmanje 8 znakova' })
  @MaxLength(50, { message: 'Lozinka može imati najviše 50 znakova' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Lozinka mora sadržavati veliko slovo, malo slovo, broj i specijalni znak (!@#$%^&*...)',
  })
  password!: string;

  @ApiPropertyOptional({
    example: 'Ivan',
    description: 'Ime korisnika',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Horvat',
    description: 'Prezime korisnika',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;
}
