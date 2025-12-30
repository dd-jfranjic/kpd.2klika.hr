import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Dohvati nepročitane CLASSIC notifikacije
   */
  @Get('unread')
  @ApiOperation({ summary: 'Dohvati nepročitane notifikacije' })
  @ApiResponse({ status: 200, description: 'Lista nepročitanih notifikacija' })
  async getUnread(@CurrentUser() user: JwtPayload) {
    const notifications = await this.notificationService.getUnreadClassic(
      user.sub,
    );
    return {
      success: true,
      data: notifications,
    };
  }

  /**
   * Dohvati broj nepročitanih notifikacija
   */
  @Get('unread/count')
  @ApiOperation({ summary: 'Broj nepročitanih notifikacija' })
  @ApiResponse({ status: 200, description: 'Broj nepročitanih' })
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationService.getUnreadCount(user.sub);
    return {
      success: true,
      data: { count },
    };
  }

  /**
   * Dohvati sve notifikacije (s paginacijom)
   */
  @Get()
  @ApiOperation({ summary: 'Dohvati sve notifikacije' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista notifikacija' })
  async getAll(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.notificationService.getAllClassic(user.sub, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    };
  }

  /**
   * Dohvati neprikazane LOGIN_POPUP notifikacije
   * Poziva se na loginu da se prikaže popup
   */
  @Get('login-popups')
  @ApiOperation({ summary: 'Dohvati popupe za prikaz pri loginu' })
  @ApiResponse({ status: 200, description: 'Lista popupa za prikaz' })
  async getLoginPopups(@CurrentUser() user: JwtPayload) {
    const popups = await this.notificationService.getUnshownLoginPopups(
      user.sub,
    );
    return {
      success: true,
      data: popups,
    };
  }

  /**
   * Označi notifikaciju kao prikazanu (za LOGIN_POPUP)
   */
  @Patch(':id/shown')
  @ApiOperation({ summary: 'Označi popup kao prikazan' })
  @ApiResponse({ status: 200, description: 'Popup označen' })
  async markAsShown(
    @CurrentUser() user: JwtPayload,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.markAsShown(notificationId, user.sub);
    return {
      success: true,
      message: 'Notifikacija označena kao prikazana',
    };
  }

  /**
   * Označi notifikaciju kao pročitanu
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Označi notifikaciju kao pročitanu' })
  @ApiResponse({ status: 200, description: 'Notifikacija označena' })
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.markAsRead(notificationId, user.sub);
    return {
      success: true,
      message: 'Notifikacija označena kao pročitana',
    };
  }

  /**
   * Označi sve notifikacije kao pročitane
   */
  @Post('read-all')
  @ApiOperation({ summary: 'Označi sve notifikacije kao pročitane' })
  @ApiResponse({ status: 200, description: 'Sve notifikacije označene' })
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationService.markAllAsRead(user.sub);
    return {
      success: true,
      message: `${count} notifikacija označeno kao pročitano`,
      data: { count },
    };
  }
}
