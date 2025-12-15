import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, Public } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * Dohvati pozivnicu po tokenu (za prikaz detalja prije prihvaćanja)
   */
  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Dohvati detalje pozivnice' })
  @ApiResponse({ status: 200, description: 'Detalji pozivnice' })
  @ApiResponse({ status: 404, description: 'Pozivnica nije pronađena' })
  async getInvitation(@Param('token') token: string) {
    const invitation = await this.invitationsService.getInvitationByToken(token);
    return {
      success: true,
      data: invitation,
    };
  }

  /**
   * Prihvati pozivnicu
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':token/accept')
  @ApiOperation({ summary: 'Prihvati pozivnicu' })
  @ApiResponse({ status: 200, description: 'Pozivnica prihvaćena' })
  @ApiResponse({ status: 403, description: 'Pozivnica nije za ovog korisnika' })
  @ApiResponse({ status: 409, description: 'Pozivnica više nije aktivna' })
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationsService.acceptInvitation(token, user.sub);
  }

  /**
   * Otkaži pozivnicu
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Otkaži pozivnicu' })
  @ApiResponse({ status: 200, description: 'Pozivnica otkazana' })
  @ApiResponse({ status: 403, description: 'Nema ovlasti' })
  async cancelInvitation(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const invitation = await this.invitationsService.cancelInvitation(
      id,
      user.sub,
    );
    return {
      success: true,
      data: invitation,
    };
  }
}
