import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { GdprService } from './gdpr.service';
import {
  UpdateCookieConsentDto,
  UpdateConsentDto,
  RequestDataExportDto,
  RequestDataDeletionDto,
  ProcessGdprRequestDto,
  ListGdprRequestsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole, ConsentType } from '@prisma/client';

@ApiTags('GDPR')
@Controller('gdpr')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  // ===========================================
  // PUBLIC: Cookie Consent (no auth required)
  // ===========================================

  @Public()
  @Get('cookies/:visitorId')
  @ApiOperation({ summary: 'Get cookie consent for visitor' })
  @ApiResponse({ status: 200, description: 'Cookie consent preferences' })
  async getCookieConsent(@Param('visitorId') visitorId: string) {
    return this.gdprService.getCookieConsent(visitorId);
  }

  @Public()
  @Post('cookies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cookie consent for visitor' })
  @ApiResponse({ status: 200, description: 'Cookie consent updated' })
  async updateCookieConsent(
    @Body() dto: UpdateCookieConsentDto,
    @Req() req: Request,
  ) {
    const metadata = {
      ipAddress: req.ip || req.headers['x-real-ip'] as string,
      userAgent: req.headers['user-agent'],
    };
    return this.gdprService.updateCookieConsent(dto, metadata);
  }

  // ===========================================
  // USER: Consent Management (auth required)
  // ===========================================

  @UseGuards(JwtAuthGuard)
  @Get('consents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my consents' })
  @ApiResponse({ status: 200, description: 'List of user consents' })
  async getMyConsents(@CurrentUser() user: any) {
    return this.gdprService.getUserConsents(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('consents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a consent preference' })
  @ApiResponse({ status: 201, description: 'Consent updated' })
  async updateMyConsent(
    @CurrentUser() user: any,
    @Body() dto: UpdateConsentDto,
    @Req() req: Request,
  ) {
    const metadata = {
      ipAddress: req.ip || req.headers['x-real-ip'] as string,
      userAgent: req.headers['user-agent'],
    };
    return this.gdprService.updateConsent(user.id, dto, metadata);
  }

  // ===========================================
  // USER: Data Export & Deletion Requests
  // ===========================================

  @UseGuards(JwtAuthGuard)
  @Get('requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my GDPR requests' })
  @ApiResponse({ status: 200, description: 'List of GDPR requests' })
  async getMyGdprRequests(@CurrentUser() user: any) {
    return this.gdprService.getUserGdprRequests(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request data export (Article 15)' })
  @ApiResponse({ status: 201, description: 'Data export request created' })
  async requestDataExport(
    @CurrentUser() user: any,
    @Body() dto: RequestDataExportDto,
  ) {
    return this.gdprService.requestDataExport(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('requests/deletion')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request data deletion (Article 17)' })
  @ApiResponse({ status: 201, description: 'Data deletion request created' })
  async requestDataDeletion(
    @CurrentUser() user: any,
    @Body() dto: RequestDataDeletionDto,
  ) {
    return this.gdprService.requestDataDeletion(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('requests/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a pending GDPR request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  async cancelMyGdprRequest(
    @CurrentUser() user: any,
    @Param('id') requestId: string,
  ) {
    return this.gdprService.cancelGdprRequest(user.id, requestId);
  }

  // ===========================================
  // ADMIN: GDPR Request Management
  // ===========================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] List all GDPR requests' })
  @ApiResponse({ status: 200, description: 'Paginated list of GDPR requests' })
  async listAllGdprRequests(@Query() query: ListGdprRequestsQueryDto) {
    return this.gdprService.listGdprRequests(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Patch('admin/requests/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Process a GDPR request' })
  @ApiResponse({ status: 200, description: 'Request processed' })
  async processGdprRequest(
    @Param('id') requestId: string,
    @CurrentUser() admin: any,
    @Body() dto: ProcessGdprRequestDto,
  ) {
    return this.gdprService.processGdprRequest(requestId, admin.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/users/:id/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Generate user data export' })
  @ApiResponse({ status: 200, description: 'User data JSON' })
  async generateUserExport(@Param('id') userId: string) {
    return this.gdprService.generateUserDataExport(userId);
  }

  // ===========================================
  // ADMIN: Consent Audit
  // ===========================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/consents')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] List all user consents' })
  @ApiResponse({ status: 200, description: 'Paginated list of consents' })
  async listAllConsents(
    @Query('consentType') consentType?: ConsentType,
    @Query('granted') granted?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gdprService.listAllConsents({
      consentType,
      granted: granted === 'true' ? true : granted === 'false' ? false : undefined,
      userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/consents/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Export all consents to CSV' })
  @ApiResponse({ status: 200, description: 'CSV file' })
  async exportConsentsCSV(@Res() res: Response) {
    const csv = await this.gdprService.exportConsentsToCSV();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=consents-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send(csv);
  }

  // ===========================================
  // INTERNAL: Link cookie consent after login
  // ===========================================

  @UseGuards(JwtAuthGuard)
  @Post('cookies/link')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link cookie consent to logged-in user' })
  @ApiResponse({ status: 200, description: 'Cookie consent linked' })
  async linkCookieConsent(
    @CurrentUser() user: any,
    @Body('visitorId') visitorId: string,
  ) {
    return this.gdprService.linkCookieConsentToUser(visitorId, user.id);
  }
}
