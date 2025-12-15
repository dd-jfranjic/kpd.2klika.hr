import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

class CreateApiKeyDto {
  @ApiProperty({
    example: 'Production API Key',
    description: 'Naziv API ključa',
  })
  @IsString()
  @MinLength(1, { message: 'Unesite naziv ključa' })
  name!: string;

  @ApiProperty({
    example: ['kpd:read', 'kpd:classify'],
    description: 'Dozvole za API ključ',
    required: false,
  })
  @IsOptional()
  @IsArray()
  scopes?: string[];
}

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  /**
   * List all API keys for the user's organization
   */
  @Get()
  @ApiOperation({ summary: 'Dohvati sve API ključeve' })
  @ApiResponse({ status: 200, description: 'Lista API ključeva' })
  async listApiKeys(@CurrentUser() user: JwtPayload) {
    const keys = await this.apiKeysService.listApiKeys(user.sub);
    return {
      success: true,
      data: keys,
    };
  }

  /**
   * Create a new API key
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Kreiraj novi API ključ' })
  @ApiResponse({ status: 201, description: 'API ključ kreiran' })
  @ApiResponse({ status: 403, description: 'Korisnik nije član organizacije' })
  async createApiKey(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateApiKeyDto,
  ) {
    const result = await this.apiKeysService.createApiKey(
      user.sub,
      dto.name,
      dto.scopes,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Delete an API key
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obriši API ključ' })
  @ApiResponse({ status: 200, description: 'API ključ obrisan' })
  @ApiResponse({ status: 404, description: 'API ključ nije pronađen' })
  async deleteApiKey(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.apiKeysService.deleteApiKey(user.sub, id);
  }
}
