import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { ConnectWhatsappDto, SendTextMessageDto, SendMediaMessageDto, SendCatalogDto } from './dto/whatsapp.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(private service: WhatsappService) {}

  @Post('connect') @ApiOperation({ summary: 'Create WhatsApp instance and get QR code' })
  async connect(@TenantId() tid: string, @Body() dto: ConnectWhatsappDto) {
    return this.service.createInstance(tid, dto.instanceName || `wasslchat-${tid.slice(0, 8)}`);
  }

  @Get('qrcode') @ApiOperation({ summary: 'Get QR code for scanning' })
  async qrcode(@TenantId() tid: string) { return this.service.getQrCode(tid); }

  @Get('status') @ApiOperation({ summary: 'Get connection status' })
  async status(@TenantId() tid: string) { return this.service.getConnectionStatus(tid); }

  @Delete('disconnect') @ApiOperation({ summary: 'Disconnect WhatsApp' })
  async disconnect(@TenantId() tid: string) { return this.service.disconnectInstance(tid); }

  @Post('send/text') @ApiOperation({ summary: 'Send text message' })
  async sendText(@TenantId() tid: string, @Body() dto: SendTextMessageDto) {
    return this.service.sendText(tid, dto.phone, dto.text);
  }

  @Post('send/media') @ApiOperation({ summary: 'Send media message' })
  async sendMedia(@TenantId() tid: string, @Body() dto: SendMediaMessageDto) {
    return this.service.sendMedia(tid, dto.phone, dto.mediaUrl, dto.mediaType, dto.caption);
  }

  @Post('send/catalog') @ApiOperation({ summary: 'Send product catalog' })
  async sendCatalog(@TenantId() tid: string, @Body() dto: SendCatalogDto) {
    return this.service.sendProductCatalog(tid, dto.phone, dto.productIds);
  }
}
