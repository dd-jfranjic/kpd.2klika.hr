import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginResponseDto, RegisterResponseDto } from './dto';
import { PlanType, MemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// SECURITY: Refresh token response tip
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // sekunde do isteka access tokena
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // SECURITY: Konstante za account lockout
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 15;

  // SECURITY: Refresh token konstante
  private readonly REFRESH_TOKEN_EXPIRY_DAYS = 7;
  private readonly ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minuta

  /**
   * Validira korisnika za LocalStrategy
   * SECURITY: Uključuje account lockout nakon 5 neuspjelih pokušaja
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: true,
          },
          take: 1, // Default organizacija
        },
      },
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Korisnički račun je deaktiviran');
    }

    // SECURITY: Provjeri je li račun zaključan
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Račun je zaključan zbog previše neuspjelih pokušaja. Pokušajte ponovno za ${minutesRemaining} minuta.`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // SECURITY: Povećaj broj neuspjelih pokušaja
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;

      if (newFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
        // Zaključaj račun
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newFailedAttempts,
            lockedUntil: new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000),
          },
        });
        throw new UnauthorizedException(
          `Račun je zaključan na ${this.LOCKOUT_DURATION_MINUTES} minuta zbog ${this.MAX_FAILED_ATTEMPTS} neuspjelih pokušaja.`,
        );
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: newFailedAttempts },
        });
      }

      return null;
    }

    // SECURITY: Uspješan login - resetiraj brojač neuspjelih pokušaja
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    // SECURITY: Provjeri je li email verificiran
    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Email adresa nije verificirana. Provjerite inbox i kliknite na link za aktivaciju.',
      );
    }

    // Vrati korisnika bez passwordHash
    const { passwordHash: _, ...result } = user;
    return result;
  }

  /**
   * Registracija novog korisnika
   * Flow po PHASE_2_AUTH.md:
   * 1. Validate input
   * 2. Check if email exists
   * 3. Hash password
   * 4. Create User
   * 5. Create Organization (default workspace)
   * 6. Create OrganizationMember (role: OWNER)
   * 7. Create Subscription (plan: FREE)
   * 8. Create UsageRecord za tekući period
   * 9. TODO: Send verification email
   * 10. Return JWT token
   */
  async register(dto: RegisterDto): Promise<RegisterResponseDto> {
    const email = dto.email.toLowerCase();

    // Provjeri postoji li korisnik
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Korisnik s ovom email adresom već postoji');
    }

    // Hash lozinku
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generiraj slug za organizaciju
    const baseName = dto.firstName || email.split('@')[0];
    const baseSlug = this.generateSlug(`${baseName}s-workspace`);
    const slug = await this.ensureUniqueSlug(baseSlug);

    // Dohvati FREE plan config
    const freePlan = await this.prisma.planConfig.findUnique({
      where: { plan: PlanType.FREE },
    });

    // Transakcija: kreiraj sve povezane entitete
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Kreiraj korisnika
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName || null,
          lastName: dto.lastName || null,
          emailVerified: false, // TODO: Email verifikacija
        },
      });

      // 2. Kreiraj organizaciju (default workspace)
      const organization = await tx.organization.create({
        data: {
          name: dto.firstName
            ? `${dto.firstName}'s Workspace`
            : `${email.split('@')[0]}'s Workspace`,
          slug,
          settings: {},
        },
      });

      // 3. Kreiraj membership (OWNER)
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: MemberRole.OWNER,
        },
      });

      // 4. Kreiraj subscription (FREE plan)
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          plan: PlanType.FREE,
          status: 'ACTIVE',
          dailyQueryLimit: freePlan?.dailyQueryLimit || 5,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // 5. Kreiraj UsageRecord za tekući period
      await tx.usageRecord.create({
        data: {
          organizationId: organization.id,
          periodStart: now,
          periodEnd: periodEnd,
          queryCount: 0,
          aiQueryCount: 0,
        },
      });

      return { user, organization };
    });

    // Pošalji verification email
    await this.sendVerificationEmail(result.user.id, result.user.email, result.user.firstName);

    // SECURITY: Ne vraćamo tokene dok email nije verificiran
    // Korisnik mora prvo kliknuti link u emailu
    return {
      message: 'Registracija uspješna! Provjerite svoj email i kliknite na link za aktivaciju računa.',
      email: result.user.email,
      requiresVerification: true,
    };
  }

  /**
   * Login - vraća JWT token i user data
   * SECURITY: Sada vraća i refresh token
   */
  async login(user: any, userAgent?: string, ipAddress?: string): Promise<LoginResponseDto> {
    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Dohvati default organizaciju
    const defaultOrg = user.memberships?.[0]?.organization || null;

    // SECURITY: Generiraj access + refresh token par
    const tokens = await this.generateTokenPair(
      user,
      defaultOrg?.id || null,
      userAgent,
      ipAddress,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: defaultOrg
        ? {
            id: defaultOrg.id,
            name: defaultOrg.name,
            slug: defaultOrg.slug,
          }
        : null,
    };
  }

  /**
   * Zahtjev za reset lozinke
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Uvijek vraćamo istu poruku (security - ne otkrivamo postoji li email)
    if (!user) {
      return {
        message:
          'Ako postoji račun s tom email adresom, primit ćete link za reset lozinke.',
      };
    }

    // Generiraj reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 sat

    // Spremi token u SystemConfig
    await this.prisma.systemConfig.upsert({
      where: { key: `password_reset:${user.id}` },
      update: {
        value: JSON.stringify({
          hash: resetTokenHash,
          expiry: resetTokenExpiry.toISOString(),
        }),
      },
      create: {
        key: `password_reset:${user.id}`,
        value: JSON.stringify({
          hash: resetTokenHash,
          expiry: resetTokenExpiry.toISOString(),
        }),
        type: 'JSON',
        category: 'auth',
        description: 'Password reset token',
        isSecret: true,
      },
    });

    // Pošalji email s linkom za reset
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.firstName,
      resetToken,
    );

    return {
      message:
        'Ako postoji račun s tom email adresom, primit ćete link za reset lozinke.',
    };
  }

  /**
   * Reset lozinke s tokenom
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Hash token za usporedbu
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Pronađi sve password reset tokene
    const resetConfigs = await this.prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'password_reset:' },
      },
    });

    let userId: string | null = null;

    for (const config of resetConfigs) {
      try {
        const data = JSON.parse(config.value);
        if (data.hash === tokenHash && new Date(data.expiry) > new Date()) {
          userId = config.key.replace('password_reset:', '');
          break;
        }
      } catch {
        continue;
      }
    }

    if (!userId) {
      throw new BadRequestException(
        'Token za reset lozinke je nevažeći ili je istekao',
      );
    }

    // Hash nova lozinka
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update korisnik
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Obriši reset token
    await this.prisma.systemConfig.delete({
      where: { key: `password_reset:${userId}` },
    });

    return { message: 'Lozinka je uspješno promijenjena' };
  }

  /**
   * Email verifikacija
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Hash token za usporedbu
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Pronađi verification token
    const verifyConfigs = await this.prisma.systemConfig.findMany({
      where: {
        key: { startsWith: 'email_verify:' },
      },
    });

    let userId: string | null = null;

    for (const config of verifyConfigs) {
      try {
        const data = JSON.parse(config.value);
        if (data.hash === tokenHash && new Date(data.expiry) > new Date()) {
          userId = config.key.replace('email_verify:', '');
          break;
        }
      } catch {
        continue;
      }
    }

    if (!userId) {
      throw new BadRequestException(
        'Token za verifikaciju je nevažeći ili je istekao',
      );
    }

    // Dohvati korisnika
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Update korisnik
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    // Obriši verification token
    await this.prisma.systemConfig.delete({
      where: { key: `email_verify:${userId}` },
    });

    // Pošalji welcome email
    if (user) {
      await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    }

    return { message: 'Email adresa je uspješno verificirana' };
  }

  /**
   * Helper: Pošalji verifikacijski email
   */
  private async sendVerificationEmail(
    userId: string,
    email: string,
    firstName: string | null,
  ): Promise<void> {
    // Generiraj token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 sata

    // Spremi token
    await this.prisma.systemConfig.upsert({
      where: { key: `email_verify:${userId}` },
      update: {
        value: JSON.stringify({
          hash: tokenHash,
          expiry: expiry.toISOString(),
        }),
      },
      create: {
        key: `email_verify:${userId}`,
        value: JSON.stringify({
          hash: tokenHash,
          expiry: expiry.toISOString(),
        }),
        type: 'JSON',
        category: 'auth',
        description: 'Email verification token',
        isSecret: true,
      },
    });

    // Pošalji email
    await this.emailService.sendVerificationEmail(email, firstName, verifyToken);
  }

  /**
   * Ponovo pošalji verifikacijski email
   */
  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Korisnik nije pronađen');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email adresa je već verificirana');
    }

    await this.sendVerificationEmail(user.id, user.email, user.firstName);

    return { message: 'Verifikacijski email je poslan' };
  }

  /**
   * Dohvati trenutnog korisnika s detaljima
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          include: {
            organization: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Korisnik nije pronađen');
    }

    return user;
  }

  /**
   * Ažuriraj profil korisnika
   */
  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
      },
    });

    return user;
  }

  // =============== HELPERS ===============

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  // =============== REFRESH TOKEN METHODS ===============

  /**
   * SECURITY: Generira novi refresh token i sprema u bazu
   */
  private async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    // Generiraj random token
    const refreshToken = crypto.randomBytes(64).toString('hex');

    // Hash za storage (nikad ne spremamo plaintext!)
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_EXPIRY_DAYS);

    // Spremi u bazu
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    return refreshToken;
  }

  /**
   * SECURITY: Generiraj oba tokena (access + refresh)
   */
  private async generateTokenPair(
    user: { id: string; email: string; role: string },
    organizationId: string | null,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenResponse> {
    // Access token (kratki, 15 min)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId,
    };
    const accessToken = this.jwtService.sign(payload);

    // Refresh token (duži, 7 dana)
    const refreshToken = await this.generateRefreshToken(
      user.id,
      userAgent,
      ipAddress,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  /**
   * POST /auth/refresh
   * SECURITY: Koristi refresh token za dobivanje novog access tokena
   */
  async refreshAccessToken(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenResponse> {
    // Hash za usporedbu
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Pronađi token u bazi
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              include: { organization: true },
              take: 1,
            },
          },
        },
      },
    });

    // Validacije
    if (!storedToken) {
      throw new UnauthorizedException('Nevažeći refresh token');
    }

    if (storedToken.isRevoked) {
      // SECURITY: Ako je token revociran, revokiraj SVE tokene korisnika (possible token theft)
      await this.revokeAllUserTokens(storedToken.userId);
      throw new UnauthorizedException(
        'Token je revociran. Svi tokeni su poništeni iz sigurnosnih razloga.',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      // Obriši istekli token
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token je istekao');
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException('Korisnički račun je deaktiviran');
    }

    // Update lastUsedAt
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { lastUsedAt: new Date() },
    });

    // Generiraj nove tokene (token rotation za dodatnu sigurnost)
    const defaultOrg = storedToken.user.memberships?.[0]?.organization || null;

    // Revokiraj stari refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generiraj novi par tokena
    return this.generateTokenPair(
      storedToken.user,
      defaultOrg?.id || null,
      userAgent,
      ipAddress,
    );
  }

  /**
   * SECURITY: Revokiraj jedan refresh token (logout)
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  /**
   * SECURITY: Revokiraj sve refresh tokene korisnika (logout everywhere)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * SECURITY: Cleanup - obriši istekle tokene (cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, lastUsedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    return result.count;
  }
}
