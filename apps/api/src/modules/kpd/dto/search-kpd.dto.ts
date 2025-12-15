import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SearchKpdDto {
  @IsString()
  @IsNotEmpty({ message: 'Upit je obavezan' })
  @MinLength(3, { message: 'Upit mora imati najmanje 3 znaka' })
  @MaxLength(500, { message: 'Upit ne smije biti dulji od 500 znakova' })
  query!: string;

  @IsOptional()
  @IsString()
  language?: 'hr' | 'en';
}

export class GetKpdByIdDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class SearchKpdByCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;
}
