import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { MemberRole } from '@prisma/client';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly invitationsService: InvitationsService,
  ) {}

  /**
   * Dohvati trenutnu organizaciju korisnika
   */
  @Get('current')
  @ApiOperation({ summary: 'Dohvati organizaciju trenutnog korisnika' })
  @ApiResponse({ status: 200, description: 'Organizacija' })
  @ApiResponse({ status: 404, description: 'Nema organizacije' })
  async getCurrentOrganization(@CurrentUser() user: JwtPayload) {
    const organization = await this.organizationsService.getCurrentOrganization(
      user.sub,
    );
    return {
      success: true,
      data: organization,
    };
  }

  /**
   * Dohvati organizaciju po ID-u
   */
  @Get(':id')
  @ApiOperation({ summary: 'Dohvati organizaciju po ID-u' })
  @ApiResponse({ status: 200, description: 'Organizacija' })
  @ApiResponse({ status: 403, description: 'Nema pristupa' })
  async getOrganization(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const organization = await this.organizationsService.findById(id, user.sub);
    return {
      success: true,
      data: organization,
    };
  }

  /**
   * Ažuriraj organizaciju
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Ažuriraj organizaciju' })
  @ApiResponse({ status: 200, description: 'Organizacija ažurirana' })
  @ApiResponse({ status: 403, description: 'Nema ovlasti' })
  async updateOrganization(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() data: { name?: string },
  ) {
    const organization = await this.organizationsService.update(
      id,
      user.sub,
      data,
    );
    return {
      success: true,
      data: organization,
    };
  }

  /**
   * Dohvati članove trenutne organizacije
   */
  @Get('current/members')
  @ApiOperation({ summary: 'Dohvati članove organizacije' })
  @ApiResponse({ status: 200, description: 'Lista članova' })
  async getMembers(@CurrentUser() user: JwtPayload) {
    const organization = await this.organizationsService.getCurrentOrganization(
      user.sub,
    );
    const members = await this.organizationsService.getMembers(
      organization.id,
      user.sub,
    );
    return {
      success: true,
      data: members,
    };
  }

  /**
   * Ukloni člana iz organizacije
   */
  @Delete('current/members/:memberId')
  @ApiOperation({ summary: 'Ukloni člana iz organizacije' })
  @ApiResponse({ status: 200, description: 'Član uklonjen' })
  @ApiResponse({ status: 403, description: 'Nema ovlasti' })
  async removeMember(
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const organization = await this.organizationsService.getCurrentOrganization(
      user.sub,
    );
    return this.organizationsService.removeMember(
      organization.id,
      memberId,
      user.sub,
    );
  }

  /**
   * Promijeni ulogu člana
   */
  @Patch('current/members/:memberId/role')
  @ApiOperation({ summary: 'Promijeni ulogu člana' })
  @ApiResponse({ status: 200, description: 'Uloga promijenjena' })
  @ApiResponse({ status: 403, description: 'Nema ovlasti' })
  async updateMemberRole(
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() data: { role: MemberRole },
  ) {
    const organization = await this.organizationsService.getCurrentOrganization(
      user.sub,
    );
    const member = await this.organizationsService.updateMemberRole(
      organization.id,
      memberId,
      data.role,
      user.sub,
    );
    return {
      success: true,
      data: member,
    };
  }

  /**
   * Dohvati pozivnice organizacije
   */
  @Get('current/invitations')
  @ApiOperation({ summary: 'Dohvati pozivnice organizacije' })
  @ApiResponse({ status: 200, description: 'Lista pozivnica' })
  async getInvitations(@CurrentUser() user: JwtPayload) {
    const organization = await this.organizationsService.getCurrentOrganization(
      user.sub,
    );
    const invitations = await this.invitationsService.getOrganizationInvitations(
      organization.id,
      user.sub,
    );
    return {
      success: true,
      data: invitations,
    };
  }

  /**
   * Pošalji pozivnicu
   */
  @Post('current/invitations')
  @ApiOperation({ summary: 'Pošalji pozivnicu novom članu' })
  @ApiResponse({ status: 201, description: 'Pozivnica poslana' })
  @ApiResponse({ status: 403, description: 'Nema ovlasti' })
  async sendInvitation(
    @CurrentUser() user: JwtPayload,
    @Body() data: { email: string; role?: MemberRole },
  ) {
    const organization = await this.organizationsService.getCurrentOrganization(
      user.sub,
    );
    const invitation = await this.invitationsService.createInvitation(
      organization.id,
      user.sub,
      data.email,
      data.role || MemberRole.MEMBER,
    );
    return {
      success: true,
      data: invitation,
    };
  }
}
