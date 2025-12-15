import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards';
import { AdminGuard } from './admin.guard';
import { CurrentUser } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import {
  UpdateUserDto,
  SuspendUserDto,
  UpdateTenantDto,
  UpdateConfigDto,
  UpdateIntegrationDto,
  ToggleFeatureFlagDto,
  UpdateSecuritySettingsDto,
  ClearCacheDto,
  ALLOWED_CONFIG_KEYS,
  ALLOWED_INTEGRATION_KEYS,
  ALLOWED_FEATURE_FLAGS,
} from './dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // =====================================
  // DASHBOARD
  // =====================================

  @Get('stats')
  @ApiOperation({ summary: 'Dohvati statistike sustava' })
  @ApiResponse({ status: 200, description: 'Statistike sustava' })
  async getSystemStats() {
    const data = await this.adminService.getSystemStats();
    return { success: true, data };
  }

  @Get('activity')
  @ApiOperation({ summary: 'Dohvati nedavne aktivnosti' })
  @ApiResponse({ status: 200, description: 'Lista aktivnosti' })
  async getRecentActivity() {
    const data = await this.adminService.getRecentActivity();
    return { success: true, data };
  }

  // =====================================
  // USERS
  // =====================================

  @Get('users')
  @ApiOperation({ summary: 'Dohvati korisnike' })
  @ApiResponse({ status: 200, description: 'Lista korisnika' })
  async getUsers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('suspended') suspended?: string,
    @Query('nearLimit') nearLimit?: string,
    @Query('plan') plan?: string,
  ) {
    const data = await this.adminService.getUsers({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      suspended: suspended !== undefined ? suspended === 'true' : undefined,
      nearLimit: nearLimit === 'true',
      plan,
    });
    return { success: true, data };
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Dohvati korisnika po ID-u' })
  @ApiResponse({ status: 200, description: 'Detalji korisnika' })
  @ApiResponse({ status: 404, description: 'Korisnik nije pronađen' })
  async getUserById(@Param('userId') userId: string) {
    const data = await this.adminService.getUserById(userId);
    if (!data) {
      throw new BadRequestException('Korisnik nije pronađen');
    }
    return { success: true, data };
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Azuriraj korisnika' })
  @ApiResponse({ status: 200, description: 'Korisnik azuriran' })
  async updateUser(
    @Param('userId') userId: string,
    @Body() data: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    // SECURITY: DTO validacija osigurava da se može postaviti samo validan UserRole enum
    const result = await this.adminService.updateUser(userId, data);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: userId,
      newValue: data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  @Post('users/:userId/suspend')
  @ApiOperation({ summary: 'Suspendiraj/aktiviraj korisnika' })
  @ApiResponse({ status: 200, description: 'Status korisnika promijenjen' })
  async suspendUser(
    @Param('userId') userId: string,
    @Body() data: SuspendUserDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    // SECURITY: DTO validacija osigurava da suspended mora biti boolean
    const result = await this.adminService.suspendUser(userId, data.suspended);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: data.suspended ? 'SUSPEND_USER' : 'ACTIVATE_USER',
      entityType: 'User',
      entityId: userId,
      newValue: { suspended: data.suspended },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  @Post('users/:userId/impersonate')
  @ApiOperation({ summary: 'Impersoniraj korisnika' })
  @ApiResponse({ status: 200, description: 'Impersonacija uspješna' })
  @ApiResponse({ status: 404, description: 'Korisnik nije pronađen' })
  async impersonateUser(
    @Param('userId') userId: string,
    @CurrentUser() admin: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminService.impersonateUser(userId, admin.sub);

    // Audit log
    await this.adminService.createAuditLog({
      userId: admin.sub,
      action: 'IMPERSONATE_USER',
      entityType: 'User',
      entityId: userId,
      newValue: { impersonatedUserId: userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Return directly (same format as login response) for frontend compatibility
    return result;
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Obriši korisnika trajno' })
  @ApiResponse({ status: 200, description: 'Korisnik obrisan' })
  @ApiResponse({ status: 400, description: 'Nije moguće obrisati korisnika' })
  @ApiResponse({ status: 404, description: 'Korisnik nije pronađen' })
  async deleteUser(
    @Param('userId') userId: string,
    @CurrentUser() admin: JwtPayload,
    @Req() req: Request,
  ) {
    try {
      const result = await this.adminService.deleteUser(userId, admin.sub);

      // Note: Audit log is created inside deleteUser transaction
      // Additional controller-level audit for IP/UserAgent
      await this.adminService.createAuditLog({
        userId: admin.sub,
        action: 'DELETE_USER_REQUEST',
        entityType: 'User',
        entityId: userId,
        newValue: {
          deletedOrganizations: result.deletedOrganizations,
          initiatedFrom: 'admin_panel',
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return { success: true, data: result };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Greška pri brisanju korisnika',
      );
    }
  }

  // =====================================
  // TENANTS
  // =====================================

  @Get('tenants')
  @ApiOperation({ summary: 'Dohvati tenante' })
  @ApiResponse({ status: 200, description: 'Lista tenanata' })
  async getTenants(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.adminService.getTenants({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
    return { success: true, data };
  }

  @Get('tenants/:tenantId')
  @ApiOperation({ summary: 'Dohvati tenanta po ID-u' })
  @ApiResponse({ status: 200, description: 'Detalji tenanta' })
  @ApiResponse({ status: 404, description: 'Tenant nije pronađen' })
  async getTenantById(@Param('tenantId') tenantId: string) {
    const data = await this.adminService.getTenantById(tenantId);
    if (!data) {
      throw new BadRequestException('Organizacija nije pronađena');
    }
    return { success: true, data };
  }

  @Patch('tenants/:tenantId')
  @ApiOperation({ summary: 'Azuriraj tenanta' })
  @ApiResponse({ status: 200, description: 'Tenant azuriran' })
  async updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() data: UpdateTenantDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    // SECURITY: DTO validacija osigurava da se mogu postaviti samo validni PlanType/SubscriptionStatus enumovi
    const result = await this.adminService.updateTenant(tenantId, data);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'UPDATE_TENANT',
      entityType: 'Organization',
      entityId: tenantId,
      newValue: data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  // =====================================
  // BILLING
  // =====================================

  @Get('billing/stats')
  @ApiOperation({ summary: 'Dohvati billing statistike' })
  @ApiResponse({ status: 200, description: 'Billing statistike' })
  async getBillingStats() {
    const data = await this.adminService.getBillingStats();
    return { success: true, data };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Dohvati sve pretplate' })
  @ApiResponse({ status: 200, description: 'Lista pretplata' })
  async getSubscriptions(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.adminService.getSubscriptions({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, data };
  }

  @Delete('tenants/:tenantId')
  @ApiOperation({ summary: 'Obriši tenanta' })
  @ApiResponse({ status: 200, description: 'Tenant obrisan' })
  @ApiResponse({ status: 404, description: 'Tenant nije pronađen' })
  async deleteTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminService.deleteTenant(tenantId);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'DELETE_TENANT',
      entityType: 'Organization',
      entityId: tenantId,
      newValue: { deleted: true },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  // =====================================
  // KPD CODES
  // =====================================

  @Get('kpd-codes')
  @ApiOperation({ summary: 'Dohvati KPD kodove' })
  @ApiResponse({ status: 200, description: 'Lista KPD kodova' })
  async getKpdCodes(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.adminService.getKpdCodes({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, data };
  }

  @Patch('kpd-codes/:codeId')
  @ApiOperation({ summary: 'Azuriraj KPD kod' })
  @ApiResponse({ status: 200, description: 'KPD kod azuriran' })
  async updateKpdCode(
    @Param('codeId') codeId: string,
    @Body() data: { description: string },
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminService.updateKpdCode(codeId, data);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'UPDATE_KPD_CODE',
      entityType: 'KpdCode',
      entityId: codeId,
      newValue: data,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  // =====================================
  // SYSTEM CONFIG
  // =====================================

  @Get('config')
  @ApiOperation({ summary: 'Dohvati konfiguraciju sustava' })
  @ApiResponse({ status: 200, description: 'Lista konfiguracija' })
  async getSystemConfig() {
    const data = await this.adminService.getSystemConfig();
    return { success: true, data };
  }

  @Patch('config/:key')
  @ApiOperation({ summary: 'Azuriraj konfiguraciju' })
  @ApiResponse({ status: 200, description: 'Konfiguracija azurirana' })
  @ApiResponse({ status: 400, description: 'Nevalidan konfiguracijski ključ' })
  async updateConfig(
    @Param('key') key: string,
    @Body() data: UpdateConfigDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    // SECURITY: Whitelist validacija - samo dozvoljeni ključevi
    // Sprječava injection kritičnih ključeva (STRIPE_SECRET_KEY, DATABASE_URL, itd.)
    if (!ALLOWED_CONFIG_KEYS.includes(key as typeof ALLOWED_CONFIG_KEYS[number])) {
      throw new BadRequestException(
        `Konfiguracijski ključ "${key}" nije dozvoljen. Dozvoljeni ključevi: ${ALLOWED_CONFIG_KEYS.join(', ')}`,
      );
    }

    const result = await this.adminService.updateConfig(key, data.value);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'UPDATE_CONFIG',
      entityType: 'SystemConfig',
      entityId: key,
      newValue: { key, value: '***' }, // Don't log actual values
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  // =====================================
  // FEATURE FLAGS
  // =====================================

  @Get('feature-flags')
  @ApiOperation({ summary: 'Dohvati feature flagove' })
  @ApiResponse({ status: 200, description: 'Lista feature flagova' })
  async getFeatureFlags() {
    const data = await this.adminService.getFeatureFlags();
    return { success: true, data };
  }

  @Patch('feature-flags/:key')
  @ApiOperation({ summary: 'Toggle feature flag' })
  @ApiResponse({ status: 200, description: 'Feature flag azuriran' })
  @ApiResponse({ status: 400, description: 'Nevalidan feature flag ključ' })
  async toggleFeatureFlag(
    @Param('key') key: string,
    @Body() data: ToggleFeatureFlagDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    // SECURITY: Whitelist validacija - samo dozvoljeni feature flagovi
    if (!ALLOWED_FEATURE_FLAGS.includes(key as typeof ALLOWED_FEATURE_FLAGS[number])) {
      throw new BadRequestException(
        `Feature flag "${key}" nije dozvoljen. Dozvoljeni flagovi: ${ALLOWED_FEATURE_FLAGS.join(', ')}`,
      );
    }

    const result = await this.adminService.toggleFeatureFlag(key, data.enabled);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: data.enabled ? 'ENABLE_FEATURE' : 'DISABLE_FEATURE',
      entityType: 'FeatureFlag',
      entityId: key,
      newValue: { enabled: data.enabled },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  // =====================================
  // AUDIT LOGS
  // =====================================

  @Get('audit-logs')
  @ApiOperation({ summary: 'Dohvati revizijske zapise' })
  @ApiResponse({ status: 200, description: 'Lista revizijskih zapisa' })
  async getAuditLogs(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const data = await this.adminService.getAuditLogs({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      action,
      dateFrom,
      dateTo,
    });
    return { success: true, data };
  }

  // =====================================
  // ANALYTICS
  // =====================================

  @Get('analytics')
  @ApiOperation({ summary: 'Dohvati analitiku' })
  @ApiResponse({ status: 200, description: 'Analitika podaci' })
  async getAnalytics(@Query('period') period?: string) {
    const validPeriod = ['7d', '30d', '90d', '1y'].includes(period || '')
      ? (period as '7d' | '30d' | '90d' | '1y')
      : '7d';

    const data = await this.adminService.getAnalytics(validPeriod);
    return { success: true, data };
  }

  // =====================================
  // INTEGRATIONS
  // =====================================

  @Get('integrations')
  @ApiOperation({ summary: 'Dohvati integracije' })
  @ApiResponse({ status: 200, description: 'Lista integracija' })
  async getIntegrations() {
    const data = await this.adminService.getIntegrations();
    return { success: true, data };
  }

  @Patch('integrations/:key')
  @ApiOperation({ summary: 'Azuriraj integraciju' })
  @ApiResponse({ status: 200, description: 'Integracija azurirana' })
  @ApiResponse({ status: 400, description: 'Nevalidan integracijski ključ' })
  async updateIntegration(
    @Param('key') key: string,
    @Body() data: UpdateIntegrationDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    // SECURITY: Whitelist validacija - samo dozvoljeni integracijski ključevi
    // Sprječava injection kritičnih ključeva (STRIPE_SECRET_KEY, itd.)
    if (!ALLOWED_INTEGRATION_KEYS.includes(key as typeof ALLOWED_INTEGRATION_KEYS[number])) {
      throw new BadRequestException(
        `Integracijski ključ "${key}" nije dozvoljen. Dozvoljeni ključevi: ${ALLOWED_INTEGRATION_KEYS.join(', ')}`,
      );
    }

    const result = await this.adminService.updateIntegration(key, data.value);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'UPDATE_INTEGRATION',
      entityType: 'Integration',
      entityId: key,
      newValue: { key, value: '***' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  // =====================================
  // SECURITY
  // =====================================

  @Get('security')
  @ApiOperation({ summary: 'Dohvati sigurnosne postavke' })
  @ApiResponse({ status: 200, description: 'Sigurnosne postavke' })
  async getSecuritySettings() {
    const data = await this.adminService.getSecuritySettings();
    return { success: true, data };
  }

  @Patch('security')
  @ApiOperation({ summary: 'Azuriraj sigurnosne postavke' })
  @ApiResponse({ status: 200, description: 'Sigurnosne postavke azurirane' })
  async updateSecuritySettings(
    @Body() data: UpdateSecuritySettingsDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminService.updateSecuritySettings(data);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'UPDATE_SECURITY_SETTINGS',
      entityType: 'SecuritySettings',
      entityId: 'global',
      newValue: {
        ...data,
        ipWhitelistAddresses: data.ipWhitelistAddresses ? '***' : undefined,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  @Post('security/clear-cache')
  @ApiOperation({ summary: 'Očisti sistemski cache' })
  @ApiResponse({ status: 200, description: 'Cache obrisan' })
  async clearCache(
    @Body() data: ClearCacheDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminService.clearCache(data.type || 'all');

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'CLEAR_CACHE',
      entityType: 'System',
      entityId: 'cache',
      newValue: { type: data.type || 'all' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }

  @Post('security/logout-all')
  @ApiOperation({ summary: 'Odjavi sve korisnike' })
  @ApiResponse({ status: 200, description: 'Svi korisnici odjavljeni' })
  async logoutAllUsers(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const result = await this.adminService.logoutAllUsers(user.sub);

    // Audit log
    await this.adminService.createAuditLog({
      userId: user.sub,
      action: 'LOGOUT_ALL_USERS',
      entityType: 'System',
      entityId: 'sessions',
      newValue: { initiatedBy: user.sub },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { success: true, data: result };
  }
}
