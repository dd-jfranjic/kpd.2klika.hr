import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Reset token iz emaila',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Nova lozinka (min 8 znakova, veliko slovo, malo slovo, broj, specijalni znak)',
  })
  @IsString()
  @MinLength(8, { message: 'Lozinka mora imati najmanje 8 znakova' })
  @MaxLength(50, { message: 'Lozinka može imati najviše 50 znakova' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Lozinka mora sadržavati veliko slovo, malo slovo, broj i specijalni znak (!@#$%^&*...)',
  })
  password!: string;
}
