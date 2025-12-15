import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Ako nema @Roles() dekoratora, i dalje dozvoli pristup
    // (JwtAuthGuard već osigurava da je korisnik autentificiran)
    // Za strožu kontrolu, endpoint mora eksplicitno imati @Roles()
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Autentificirani korisnici mogu pristupiti
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('Nemate pristup ovom resursu');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        'Nemate potrebne privilegije za ovu akciju',
      );
    }

    return true;
  }
}
