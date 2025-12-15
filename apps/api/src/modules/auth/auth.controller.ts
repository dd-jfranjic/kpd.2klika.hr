import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  LoginResponseDto,
  RegisterResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto';
import { LocalAuthGuard, JwtAuthGuard } from './guards';
import { CurrentUser, Public } from './decorators';
import { JwtPayload } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registracija novog korisnika
   * SECURITY: Strogi rate limit - 5 zahtjeva po satu
   * Nakon registracije korisnik mora verificirati email prije logina
   */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 per hour
  @ApiOperation({ summary: 'Registracija novog korisnika' })
  @ApiResponse({
    status: 201,
    description: 'Korisnik uspješno registriran - potrebna email verifikacija',
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email već postoji' })
  @ApiResponse({ status: 429, description: 'Previše zahtjeva - pokušajte kasnije' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Login korisnika
   * SECURITY: Strogi rate limit - 5 zahtjeva po minuti (brute force zaštita)
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Prijava korisnika' })
  @ApiResponse({
    status: 200,
    description: 'Uspješna prijava',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Pogrešni podaci za prijavu' })
  @ApiResponse({ status: 429, description: 'Previše pokušaja prijave - pokušajte za minutu' })
  async login(
    @Body() _dto: LoginDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.login(user, userAgent, ipAddress);
  }

  /**
   * Refresh access token
   * SECURITY: Rate limit - 30 zahtjeva po minuti
   */
  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obnovi access token korištenjem refresh tokena' })
  @ApiResponse({
    status: 200,
    description: 'Token obnovljen',
  })
  @ApiResponse({ status: 401, description: 'Nevažeći ili istekli refresh token' })
  @ApiResponse({ status: 429, description: 'Previše zahtjeva - pokušajte kasnije' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.refreshAccessToken(dto.refreshToken, userAgent, ipAddress);
  }

  /**
   * Logout - revocira refresh token
   * SECURITY: Sada zapravo invalidira token
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Odjava korisnika (revocira refresh token)' })
  @ApiResponse({ status: 200, description: 'Uspješna odjava' })
  async logout(@Body() body: { refreshToken?: string }): Promise<{ message: string }> {
    if (body.refreshToken) {
      await this.authService.revokeRefreshToken(body.refreshToken);
    }
    return { message: 'Uspješno ste se odjavili' };
  }

  /**
   * Logout everywhere - revocira sve refresh tokene korisnika
   * SECURITY: Zahtijeva autentifikaciju
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Odjava sa svih uređaja' })
  @ApiResponse({ status: 200, description: 'Svi tokeni revokirani' })
  @ApiResponse({ status: 401, description: 'Neautoriziran' })
  async logoutAll(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    await this.authService.revokeAllUserTokens(user.sub);
    return { message: 'Odjavljeni ste sa svih uređaja' };
  }

  /**
   * Zahtjev za reset lozinke
   * SECURITY: Strogi rate limit - 3 zahtjeva po satu (spam zaštita)
   */
  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Zahtjev za reset lozinke' })
  @ApiResponse({ status: 200, description: 'Email poslan (ako postoji račun)' })
  @ApiResponse({ status: 429, description: 'Previše zahtjeva - pokušajte kasnije' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * Reset lozinke s tokenom
   * SECURITY: Rate limit - 5 zahtjeva po satu
   */
  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 per hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset lozinke s tokenom' })
  @ApiResponse({ status: 200, description: 'Lozinka promijenjena' })
  @ApiResponse({ status: 400, description: 'Nevažeći ili istekli token' })
  @ApiResponse({ status: 429, description: 'Previše zahtjeva - pokušajte kasnije' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  /**
   * Email verifikacija
   */
  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verifikacija email adrese' })
  @ApiResponse({ status: 200, description: 'Email verificiran' })
  @ApiResponse({ status: 400, description: 'Nevažeći ili istekli token' })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(token);
  }

  /**
   * Ponovo pošalji verifikacijski email
   * SECURITY: Rate limit - 3 zahtjeva po satu
   */
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 per hour
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ponovo pošalji verifikacijski email' })
  @ApiResponse({ status: 200, description: 'Email poslan' })
  @ApiResponse({ status: 400, description: 'Email već verificiran' })
  @ApiResponse({ status: 429, description: 'Previše zahtjeva' })
  async resendVerification(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(user.sub);
  }

  /**
   * Dohvati trenutnog korisnika
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dohvati profil trenutnog korisnika' })
  @ApiResponse({ status: 200, description: 'Profil korisnika' })
  @ApiResponse({ status: 401, description: 'Neautoriziran' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  /**
   * Ažuriraj profil
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ažuriraj profil korisnika' })
  @ApiResponse({ status: 200, description: 'Profil ažuriran' })
  @ApiResponse({ status: 401, description: 'Neautoriziran' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() data: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    return this.authService.updateProfile(user.sub, data);
  }
}
