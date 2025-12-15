import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Verificiraj da korisnik još uvijek postoji i aktivan je
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Korisnik ne postoji');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Korisnički račun je deaktiviran');
    }

    // SECURITY FIX: Vraćamo svježe podatke iz baze, ne iz JWT-a
    // Ovo osigurava da ako se rola promijeni, nova vrijednost će se koristiti
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: payload.organizationId, // Ovo ostaje iz tokena
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
