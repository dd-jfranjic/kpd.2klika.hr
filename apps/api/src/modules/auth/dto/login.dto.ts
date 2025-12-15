import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email adresa',
  })
  @IsEmail({}, { message: 'Unesite ispravnu email adresu' })
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Lozinka',
  })
  @IsString()
  @MinLength(1, { message: 'Unesite lozinku' })
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token (kratkotrajan, 15 min)' })
  accessToken!: string;

  @ApiProperty({ description: 'Refresh token za obnovu access tokena (7 dana)' })
  refreshToken!: string;

  @ApiProperty({ description: 'Vrijeme isteka access tokena u sekundama' })
  expiresIn!: number;

  @ApiProperty({ description: 'Korisnik' })
  user!: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };

  @ApiProperty({ description: 'Defaultna organizacija' })
  organization!: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ description: 'Poruka o uspješnoj registraciji' })
  message!: string;

  @ApiProperty({ description: 'Email na koji je poslan verifikacijski link' })
  email!: string;

  @ApiProperty({ description: 'Je li potrebna email verifikacija' })
  requiresVerification!: boolean;
}
