import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @ApiProperty({
    enum: UserRole,
    example: 'MEMBER',
    description: 'Nova uloga korisnika',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Role mora biti MEMBER ili SUPER_ADMIN',
  })
  role?: UserRole;
}

export class SuspendUserDto {
  @ApiProperty({
    example: true,
    description: 'Da li suspendirati korisnika',
  })
  @IsBoolean({ message: 'suspended mora biti boolean (true/false)' })
  suspended!: boolean;
}
