import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Niste prijavljeni');
    }

    // SECURITY FIX: Provjeri svježe podatke iz baze (defense in depth)
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, isActive: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Korisnik ne postoji');
    }

    if (!dbUser.isActive) {
      throw new ForbiddenException('Korisnički račun je deaktiviran');
    }

    if (dbUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Pristup odbijen - potrebna SUPER_ADMIN ovlast');
    }

    return true;
  }
}
