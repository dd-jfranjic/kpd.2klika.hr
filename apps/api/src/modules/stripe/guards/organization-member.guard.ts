import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

/**
 * SECURITY: Guard koji provjerava da korisnik ima pravo pristupa organizaciji
 *
 * Provjerava:
 * 1. Da li je organizationId proslijeđen (iz body ili params)
 * 2. Da li korisnik pripada toj organizaciji (member of organization)
 * 3. SUPER_ADMIN ima pristup svim organizacijama
 *
 * VAŽNO: Mora se koristiti NAKON JwtAuthGuard
 */
@Injectable()
export class OrganizationMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Korisnik nije autentificiran');
    }

    // Dohvati organizationId iz body ili params
    const organizationId =
      request.body?.organizationId ||
      request.params?.organizationId ||
      request.query?.organizationId;

    if (!organizationId) {
      throw new BadRequestException('organizationId je obavezan');
    }

    // SUPER_ADMIN ima pristup svim organizacijama
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, isActive: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('Korisnik ne postoji');
    }

    if (!dbUser.isActive) {
      throw new ForbiddenException('Korisnički račun je deaktiviran');
    }

    // SUPER_ADMIN bypass
    if (dbUser.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Provjeri da li korisnik pripada organizaciji
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organizationId,
          userId: user.sub,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Nemate pristup ovoj organizaciji. Morate biti član organizacije.',
      );
    }

    // Dodatno: možeš provjeriti role unutar organizacije ako trebaš (OWNER, ADMIN, MEMBER)
    // if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') { ... }

    return true;
  }
}
