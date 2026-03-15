import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto, CreateShipmentDto } from './dto/create-integration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Integrations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private service: IntegrationsService) {}

  @Get() @ApiOperation({ summary: 'List integrations' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @ApiOperation({ summary: 'Create integration (WooCommerce/Shopify)' })
  async create(@TenantId() tid: string, @Body() dto: CreateIntegrationDto) { return this.service.create(tid, dto); }

  @Post(':id/sync') @ApiOperation({ summary: 'Sync products from external store' })
  async sync(@TenantId() tid: string, @Param('id') id: string) { return this.service.syncProducts(tid, id); }

  @Post('orders/:orderId/ship') @ApiOperation({ summary: 'Create shipment (WasslBox/Bosta)' })
  async ship(@TenantId() tid: string, @Param('orderId') oid: string, @Body() dto: CreateShipmentDto) { return this.service.createShipment(tid, oid, dto.provider); }
}
