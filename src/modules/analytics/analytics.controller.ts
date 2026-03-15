import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('dashboard') @ApiOperation({ summary: 'Dashboard overview stats' })
  async dashboard(@TenantId() tid: string, @Query('period') period: string) { return this.service.getDashboard(tid, period); }

  @Get('sales') @ApiOperation({ summary: 'Sales report' })
  async sales(@TenantId() tid: string, @Query('from') from: string, @Query('to') to: string) { return this.service.getSalesReport(tid, from, to); }

  @Get('top-products') @ApiOperation({ summary: 'Top selling products' })
  async topProducts(@TenantId() tid: string, @Query('limit') limit: number) { return this.service.getTopProducts(tid, limit); }

  @Get('customers') @ApiOperation({ summary: 'Customer insights' })
  async customers(@TenantId() tid: string) { return this.service.getCustomerInsights(tid); }

  @Get('conversations') @ApiOperation({ summary: 'Conversation analytics (response time, resolution rate)' })
  async conversations(@TenantId() tid: string, @Query('period') period: string) { return this.service.getConversationAnalytics(tid, period); }
}
