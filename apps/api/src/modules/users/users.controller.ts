import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Dohvati trenutnog korisnika
   */
  @Get('me')
  @ApiOperation({ summary: 'Dohvati profil trenutnog korisnika' })
  @ApiResponse({ status: 200, description: 'Profil korisnika' })
  @ApiResponse({ status: 401, description: 'Neautoriziran' })
  async getProfile(@CurrentUser() user: JwtPayload) {
    const userData = await this.usersService.findById(user.sub);
    return {
      success: true,
      data: userData,
    };
  }

  /**
   * Ažuriraj profil korisnika
   */
  @Patch('me')
  @ApiOperation({ summary: 'Ažuriraj profil korisnika' })
  @ApiResponse({ status: 200, description: 'Profil ažuriran' })
  @ApiResponse({ status: 401, description: 'Neautoriziran' })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() data: { firstName?: string; lastName?: string; avatarUrl?: string },
  ) {
    const userData = await this.usersService.updateProfile(user.sub, data);
    return {
      success: true,
      data: userData,
    };
  }

  /**
   * Dohvati statistike za dashboard
   */
  @Get('me/stats')
  @ApiOperation({ summary: 'Dohvati statistike korisnika za dashboard' })
  @ApiResponse({ status: 200, description: 'Statistike korisnika' })
  @ApiResponse({ status: 401, description: 'Neautoriziran' })
  async getStats(@CurrentUser() user: JwtPayload) {
    const stats = await this.usersService.getUserStats(user.sub);
    return {
      success: true,
      data: stats,
    };
  }
}
