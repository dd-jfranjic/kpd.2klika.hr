import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
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
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from '../admin/admin.guard';
import { ThreadStatus } from '@prisma/client';

// =====================================
// USER ENDPOINTS
// =====================================

@ApiTags('support')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Dohvati moj thread (ili kreiraj ako ne postoji)
   */
  @Get('thread')
  @ApiOperation({ summary: 'Dohvati svoj support thread' })
  @ApiResponse({ status: 200, description: 'Thread info' })
  async getMyThread(@CurrentUser() user: JwtPayload) {
    const thread = await this.supportService.getOrCreateThread(user.sub);
    return {
      success: true,
      data: thread,
    };
  }

  /**
   * Dohvati moje poruke
   */
  @Get('messages')
  @ApiOperation({ summary: 'Dohvati svoje poruke' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista poruka' })
  async getMyMessages(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const result = await this.supportService.getUserMessages(user.sub, {
      limit: limit ? parseInt(limit, 10) : undefined,
      before,
    });
    return {
      success: true,
      data: result.messages,
      meta: { hasMore: result.hasMore },
    };
  }

  /**
   * Pošalji poruku
   */
  @Post('messages')
  @ApiOperation({ summary: 'Pošalji poruku podršci' })
  @ApiResponse({ status: 201, description: 'Poruka poslana' })
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() data: { body: string },
  ) {
    const message = await this.supportService.sendUserMessage(user.sub, data);
    return {
      success: true,
      data: message,
    };
  }

  /**
   * Broj nepročitanih poruka
   */
  @Get('unread')
  @ApiOperation({ summary: 'Broj nepročitanih poruka od podrške' })
  @ApiResponse({ status: 200, description: 'Broj nepročitanih' })
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.supportService.getUserUnreadCount(user.sub);
    return {
      success: true,
      data: { count },
    };
  }
}

// =====================================
// ADMIN ENDPOINTS
// =====================================

@ApiTags('admin/support')
@Controller('admin/support')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  /**
   * Dohvati inbox (sve threadove)
   */
  @Get('inbox')
  @ApiOperation({ summary: 'Dohvati support inbox' })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'CLOSED', 'ARCHIVED'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista threadova' })
  async getInbox(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.supportService.getAdminInbox({
      status: status as ThreadStatus | undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.threads,
      meta: { total: result.total },
    };
  }

  /**
   * Ukupno nepročitanih
   */
  @Get('unread')
  @ApiOperation({ summary: 'Ukupno nepročitanih poruka' })
  @ApiResponse({ status: 200, description: 'Broj nepročitanih' })
  async getTotalUnread() {
    const count = await this.supportService.getAdminTotalUnread();
    return {
      success: true,
      data: { count },
    };
  }

  /**
   * Dohvati thread
   */
  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Dohvati thread' })
  @ApiResponse({ status: 200, description: 'Thread info' })
  async getThread(@Param('threadId') threadId: string) {
    const thread = await this.supportService.getAdminThread(threadId);
    return {
      success: true,
      data: thread,
    };
  }

  /**
   * Dohvati poruke threada
   */
  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'Dohvati poruke threada' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista poruka' })
  async getThreadMessages(
    @Param('threadId') threadId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const result = await this.supportService.getAdminThreadMessages(threadId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      before,
    });
    return {
      success: true,
      data: result.messages,
      meta: { hasMore: result.hasMore },
    };
  }

  /**
   * Pošalji odgovor
   */
  @Post('threads/:threadId/messages')
  @ApiOperation({ summary: 'Odgovori na thread' })
  @ApiResponse({ status: 201, description: 'Poruka poslana' })
  async sendReply(
    @Param('threadId') threadId: string,
    @CurrentUser() user: JwtPayload,
    @Body() data: { body: string },
  ) {
    const message = await this.supportService.sendAdminMessage(
      threadId,
      user.sub,
      data,
    );
    return {
      success: true,
      data: message,
    };
  }

  /**
   * Promijeni status threada
   */
  @Patch('threads/:threadId/status')
  @ApiOperation({ summary: 'Promijeni status threada' })
  @ApiResponse({ status: 200, description: 'Status promijenjen' })
  async updateStatus(
    @Param('threadId') threadId: string,
    @Body() data: { status: ThreadStatus },
  ) {
    const thread = await this.supportService.updateThreadStatus(
      threadId,
      data.status,
    );
    return {
      success: true,
      data: thread,
    };
  }
}
